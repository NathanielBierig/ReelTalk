import { DurableObject } from 'cloudflare:workers'
import * as G from './game'
import { parseReelCode, type ClientMsg, type ReelStatus, type ServerMsg, type Mode } from '../shared/types'
import { ASSETS } from './assets.gen'

export interface Env {
  ROOMS: DurableObjectNamespace<Room>
}

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

    const exists = url.pathname.match(/^\/api\/rooms\/([A-Z]{4})$/)
    if (exists) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(exists[1]))
      return json({ exists: await stub.exists() })
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404)
    return serveAsset(url.pathname)
  },
} satisfies ExportedHandler<Env>

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
      this.send(ws, { t: 'state', state: G.viewFor(this.state, cid, connected, now) })
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
      case 'answer': r = G.submitAnswer(s, cid, String(msg.text ?? ''), now, connected); break
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
      case 'playAgain': r = G.playAgain(s, cid); break
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
