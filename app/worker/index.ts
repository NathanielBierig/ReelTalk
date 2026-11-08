import { DurableObject } from 'cloudflare:workers'
import * as G from './game'
import { parseReelCode, type ClientMsg, type GifResult, type ReelStatus, type ServerMsg, type Mode } from '../shared/types'
import { ASSETS } from './assets.gen'

export interface Env {
  ROOMS: DurableObjectNamespace<Room>
  GIPHY_API_KEY?: string // optional: enables GIF/sticker answers
}

const MAX_IMAGE_BYTES = 300 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/webp', 'image/png'])

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I/O to avoid confusion
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

// ---------- reel validation ----------

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

/** Classifies a reel by reading Instagram's public embed page. 'unavailable' means private/removed. */
export async function checkReel(code: string): Promise<ReelStatus | 'unavailable'> {
  const cache = (caches as unknown as { default: Cache }).default
  const key = new Request(`https://reeltalk.cache/reel/${code}`)
  const hit = await cache.match(key).catch(() => undefined)
  if (hit) return (await hit.text()) as ReelStatus | 'unavailable'
  let status: ReelStatus | 'unavailable' = 'unknown'
  try {
    const res = await fetch(`https://www.instagram.com/reel/${code}/embed/`, {
      headers: { 'user-agent': IPHONE_UA, 'accept-language': 'en-US' },
    })
    if (res.ok) {
      const html = await res.text()
      if (html.includes('video_url')) status = 'playable'
      else if (html.includes('Watch on Instagram')) status = 'music'
      else if (html.includes('may be broken') || html.includes('removed')) status = 'unavailable'
    } else if (res.status === 404) {
      status = 'unavailable'
    }
  } catch {
    status = 'unknown' // network trouble: let it through rather than block the party
  }
  await cache
    .put(key, new Response(status, { headers: { 'cache-control': 'max-age=3600' } }))
    .catch(() => {})
  return status
}

// ---------- Worker entry ----------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (url.pathname === '/api/rooms' && req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as { mode?: Mode; clientId?: string }
      const mode: Mode = body.mode === 'bus' ? 'bus' : 'party'
      const clientId = String(body.clientId ?? '').slice(0, 40)
      if (!clientId) return json({ error: 'missing clientId' }, 400)
      for (let attempt = 0; attempt < 8; attempt++) {
        let code = ''
        const bytes = crypto.getRandomValues(new Uint8Array(4))
        for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length]
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
        const created = await stub.init(code, mode, clientId)
        if (created) return json({ code })
      }
      return json({ error: 'could not allocate a room' }, 503)
    }

    const ws = url.pathname.match(/^\/api\/rooms\/([A-Z]{4})\/ws$/)
    if (ws) {
      if (req.headers.get('upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 })
      const stub = env.ROOMS.get(env.ROOMS.idFromName(ws[1]))
      return stub.fetch(req)
    }

    if (url.pathname === '/api/gifs') return searchGifs(url, env)

    const upload = url.pathname.match(/^\/api\/rooms\/([A-Z]{4})\/images$/)
    if (upload && req.method === 'POST') {
      const cid = (url.searchParams.get('cid') ?? '').slice(0, 40)
      const type = (req.headers.get('content-type') ?? '').split(';')[0]
      if (!IMAGE_TYPES.has(type)) return json({ error: 'JPEG, WebP or PNG only' }, 415)
      const len = Number(req.headers.get('content-length') ?? 0)
      if (len > MAX_IMAGE_BYTES) return json({ error: 'Image too big' }, 413)
      const bytes = await req.arrayBuffer()
      if (bytes.byteLength > MAX_IMAGE_BYTES) return json({ error: 'Image too big' }, 413)
      const stub = env.ROOMS.get(env.ROOMS.idFromName(upload[1]))
      const res = await stub.putImage(cid, bytes, type)
      return 'error' in res ? json(res, 400) : json(res)
    }

    const img = url.pathname.match(/^\/api\/rooms\/([A-Z]{4})\/images\/([a-z0-9]{8,16})$/)
    if (img) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(img[1]))
      const found = await stub.getImage(img[2])
      if (!found) return new Response('not found', { status: 404 })
      return new Response(found.bytes, {
        headers: { 'content-type': found.type, 'cache-control': 'private, max-age=86400, immutable' },
      })
    }

    const exists = url.pathname.match(/^\/api\/rooms\/([A-Z]{4})$/)
    if (exists) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(exists[1]))
      return json({ exists: await stub.exists() })
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404)
    return serveAsset(url.pathname)
  },
} satisfies ExportedHandler<Env>

/** GIPHY search proxy: keeps the key server-side and trims the payload for phones. */
async function searchGifs(url: URL, env: Env): Promise<Response> {
  if (!env.GIPHY_API_KEY) return json({ error: 'GIF search is not set up' }, 501)
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 50)
  const kind = url.searchParams.get('type') === 'stickers' ? 'stickers' : 'gifs'
  const api = new URL(`https://api.giphy.com/v1/${kind}/${q ? 'search' : 'trending'}`)
  api.searchParams.set('api_key', env.GIPHY_API_KEY)
  api.searchParams.set('limit', '24')
  api.searchParams.set('rating', 'r') // friends-only game: owner chose no family filter
  api.searchParams.set('bundle', 'messaging_non_clips')
  if (q) api.searchParams.set('q', q)
  const res = await fetch(api, { cf: { cacheTtl: 600, cacheEverything: true } })
  if (!res.ok) return json({ error: 'GIF search failed' }, 502)
  type Img = { url: string; webp?: string; width: string; height: string }
  const body = (await res.json()) as { data: { id: string; images: Record<string, Img> }[] }
  const results: GifResult[] = body.data.flatMap(g => {
    const small = g.images.fixed_width_small ?? g.images.fixed_width
    const main = g.images.fixed_width ?? g.images.downsized
    if (!small || !main) return []
    return [{ id: g.id, preview: small.webp || small.url, url: main.webp || main.url, w: Number(main.width), h: Number(main.height) }]
  })
  return new Response(JSON.stringify({ results }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' },
  })
}

function serveAsset(pathname: string): Response {
  const asset = ASSETS[pathname] ?? ASSETS['/index.html']
  if (!asset) return new Response('Not built yet. Run npm run build.', { status: 503 })
  const body = asset.b64 ? Uint8Array.from(atob(asset.body), c => c.charCodeAt(0)) : asset.body
  const immutable = pathname.startsWith('/assets/')
  return new Response(body, {
    headers: {
      'content-type': asset.type,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    },
  })
}

// ---------- Room Durable Object ----------

export class Room extends DurableObject<Env> {
  state: G.GameState | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<G.GameState>('state')) ?? null
    })
  }

  async init(code: string, mode: Mode, hostId: string): Promise<boolean> {
    if (this.state) return false
    this.state = G.createState(code, mode, hostId, Date.now())
    await this.save()
    return true
  }

  async exists(): Promise<boolean> {
    return !!this.state
  }

  /** Camera-roll answers. Stored in this room only, wiped on "play again". */
  async putImage(cid: string, bytes: ArrayBuffer, type: string): Promise<{ url: string } | { error: string }> {
    if (!this.state) return { error: 'No such room' }
    if (!this.state.players.some(p => p.id === cid)) return { error: 'Join the room first' }
    const count = ((await this.ctx.storage.get<number>(`imgcount:${cid}`)) ?? 0) + 1
    if (count > 30) return { error: 'Too many uploads' }
    const id = G.rid(12)
    await this.ctx.storage.put({ [`img:${id}`]: { type, bytes }, [`imgcount:${cid}`]: count })
    return { url: `/api/rooms/${this.state.code}/images/${id}` }
  }

  async getImage(id: string): Promise<{ type: string; bytes: ArrayBuffer } | null> {
    return (await this.ctx.storage.get<{ type: string; bytes: ArrayBuffer }>(`img:${id}`)) ?? null
  }

  private async wipeImages() {
    const keys = [...(await this.ctx.storage.list({ prefix: 'img' })).keys()]
    for (let i = 0; i < keys.length; i += 128) await this.ctx.storage.delete(keys.slice(i, i + 128))
  }

  async fetch(req: Request): Promise<Response> {
    if (!this.state) return new Response('no such room', { status: 404 })
    const cid = (new URL(req.url).searchParams.get('cid') ?? '').slice(0, 40)
    if (!cid) return new Response('missing cid', { status: 400 })
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    // Close older sockets of the same client (e.g. a refreshed tab).
    for (const old of this.ctx.getWebSockets(cid)) {
      try { old.close(4000, 'replaced') } catch { /* already closed */ }
    }
    this.ctx.acceptWebSocket(server, [cid])
    // Send state after accept so the new socket is counted as connected.
    queueMicrotask(() => this.broadcast())
    return new Response(null, { status: 101, webSocket: client })
  }

  private connected(): Set<string> {
    const set = new Set<string>()
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState === WebSocket.OPEN) set.add(this.ctx.getTags(ws)[0])
    }
    return set
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    try { ws.send(JSON.stringify(msg)) } catch { /* socket gone */ }
  }

  private broadcast() {
    if (!this.state) return
    const now = Date.now()
    const connected = this.connected()
    for (const ws of this.ctx.getWebSockets()) {
      const cid = this.ctx.getTags(ws)[0]
      this.send(ws, { t: 'state', state: G.viewFor(this.state, cid, connected, now, { gifs: !!this.env.GIPHY_API_KEY }) })
    }
  }

  private async save() {
    if (!this.state) return
    await this.ctx.storage.put('state', this.state)
    if (this.state.deadline) await this.ctx.storage.setAlarm(this.state.deadline)
    else await this.ctx.storage.deleteAlarm()
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const s = this.state
    if (!s || typeof raw !== 'string' || raw.length > 4000) return
    let msg: ClientMsg
    try { msg = JSON.parse(raw) } catch { return }
    const cid = this.ctx.getTags(ws)[0]
    const now = Date.now()
    const connected = this.connected()
    let r: G.Result = { ok: true }

    switch (msg.t) {
      case 'ping': this.send(ws, { t: 'pong' }); return
      case 'join': r = G.join(s, cid, String(msg.name ?? ''), now); break
      case 'settings': r = G.updateSettings(s, cid, msg.settings ?? {}); break
      case 'openSubmit': r = G.openSubmit(s, cid); break
      case 'addReel': {
        const code = parseReelCode(String(msg.url ?? ''))
        if (!code) { r = { ok: false, error: "That's not an Instagram reel link" }; break }
        const status = await checkReel(code)
        if (status === 'unavailable') {
          r = { ok: false, error: "That reel is private or deleted. Can't use it." }
          break
        }
        r = G.addReel(s, cid, code, status)
        if (r.ok) this.send(ws, { t: 'toast', message: 'Reel added!', kind: 'ok' })
        break
      }
      case 'removeReel': r = G.removeReel(s, cid, String(msg.id)); break
      case 'startGame': r = G.startGame(s, cid, now); break
      case 'answer': r = G.submitAnswer(s, cid, String(msg.text ?? ''), now, connected, msg.media); break
      case 'pick': r = G.pick(s, cid, String(msg.answerId), now, connected); break
      case 'vote': r = G.vote(s, cid, String(msg.answerId), now, connected); break
      case 'next':
        r = cid === s.hostId ? G.next(s, now) : { ok: false, error: 'Only the host can skip' }
        break
      case 'kick': {
        r = G.kick(s, cid, String(msg.playerId))
        if (r.ok) {
          for (const k of this.ctx.getWebSockets(String(msg.playerId))) {
            this.send(k, { t: 'error', message: 'You were removed from the room' })
            try { k.close(4001, 'kicked') } catch { /* gone */ }
          }
        }
        break
      }
      case 'playAgain':
        r = G.playAgain(s, cid)
        if (r.ok) await this.wipeImages()
        break
      default: return
    }

    if (!r.ok) { this.send(ws, { t: 'error', message: r.error }); return }
    await this.save()
    this.broadcast()
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try { ws.close(code === 1005 ? 1000 : code, 'bye') } catch { /* already closed */ }
    await this.afterPresenceChange()
  }

  async webSocketError() {
    await this.afterPresenceChange()
  }

  private async afterPresenceChange() {
    if (!this.state) return
    G.recheck(this.state, Date.now(), this.connected())
    await this.save()
    this.broadcast()
  }

  async alarm() {
    if (!this.state) return
    G.onDeadline(this.state, Date.now())
    await this.save()
    this.broadcast()
  }
}
