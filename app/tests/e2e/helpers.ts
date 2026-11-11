import { expect, devices, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { RoomView } from '../../shared/types'

export const BASE = 'http://localhost:8787'
export const SHOTS = 'e2e-screens'

/** Everything that went wrong on one page, split into our app vs third parties (Instagram, GIPHY). */
export interface Issues {
  firstParty: string[]
  external: string[]
}

export interface Who {
  name: string
  ctx: BrowserContext
  page: Page
  issues: Issues
}

const isOurs = (url: string) => !url || url.startsWith(BASE) || url.startsWith('ws://localhost:8787')

export async function open(browser: Browser, name: string, kind: 'tv' | 'phone'): Promise<Who> {
  const ctx = await browser.newContext(
    kind === 'tv'
      ? { viewport: { width: 1440, height: 900 }, baseURL: BASE }
      : { ...devices['Pixel 7'], baseURL: BASE },
  )
  const page = await ctx.newPage()
  const issues: Issues = { firstParty: [], external: [] }
  const log = (url: string, msg: string) => (isOurs(url) ? issues.firstParty : issues.external).push(`[${name}] ${msg}`)
  page.on('console', m => {
    if (m.type() !== 'error') return
    log(m.location().url, `console: ${m.text()}`)
  })
  page.on('pageerror', e => issues.firstParty.push(`[${name}] pageerror: ${e.message}`))
  page.on('requestfailed', r => {
    const err = r.failure()?.errorText ?? ''
    if (err.includes('ERR_ABORTED')) return // navigation/teardown cancels, not a bug
    log(r.url(), `requestfailed: ${r.method()} ${r.url()} ${err}`)
  })
  page.on('response', r => {
    if (r.status() >= 400) log(r.url(), `http ${r.status()}: ${r.request().method()} ${r.url()}`)
  })
  return { name, ctx, page, issues }
}

/** A hidden observer socket. Not a player, so it never affects the game; it just reads server state. */
export class Spectator {
  state!: RoomView
  private ws!: WebSocket
  private waiters: (() => void)[] = []

  static async connect(code: string): Promise<Spectator> {
    const s = new Spectator()
    s.ws = new WebSocket(`ws://localhost:8787/api/rooms/${code}/ws?cid=e2e-spectator-${Date.now()}`)
    s.ws.onmessage = ev => {
      const msg = JSON.parse(String(ev.data))
      if (msg.t === 'state') {
        s.state = msg.state
        for (const w of s.waiters.splice(0)) w()
      }
    }
    await s.until(st => !!st, 10_000, 'spectator connected')
    return s
  }

  async until(pred: (s: RoomView) => boolean, timeout = 10_000, what = 'condition'): Promise<RoomView> {
    const end = Date.now() + timeout
    while (!(this.state && pred(this.state))) {
      const left = end - Date.now()
      if (left <= 0) throw new Error(`Timed out waiting for ${what}. phase=${this.state?.phase}`)
      await new Promise<void>(res => {
        const t = setTimeout(res, Math.min(left, 500))
        this.waiters.push(() => { clearTimeout(t); res() })
      })
    }
    return this.state
  }

  idOf(name: string): string {
    const p = this.state.players.find(x => x.name === name)
    if (!p) throw new Error(`no player ${name}`)
    return p.id
  }

  close() { this.ws.close() }
}

let shotN = 0
export async function shot(who: Who, label: string, dir: string) {
  // Let screen transitions finish; the reveal staggers answers in over ~5s on purpose.
  await who.page.waitForTimeout(label.startsWith('reveal') ? 6500 : label.startsWith('final') ? 2500 : 900)
  mkdirSync(`${SHOTS}/${dir}`, { recursive: true })
  const n = String(++shotN).padStart(2, '0')
  await who.page.screenshot({ path: `${SHOTS}/${dir}/${n}-${label}-${who.name}.png` })
}

export async function joinAs(who: Who, code: string, spec: Spectator) {
  const before = spec.state.players.length
  await who.page.goto(`/r/${code}`)
  await who.page.locator('#name').fill(who.name)
  await who.page.getByRole('button', { name: /Join game|Let's go/ }).click()
  await spec.until(s => s.players.length === before + 1, 10_000, `${who.name} joined`)
  await expect(who.page.getByText('Your reels', { exact: true })).toBeVisible()
}

export async function addReel(who: Who, reelCode: string) {
  const page = who.page
  const box = page.getByPlaceholder('instagram.com/reel/…')
  if (!(await box.isVisible())) await page.getByRole('button', { name: 'or type the link' }).click()
  await box.fill(`https://www.instagram.com/reel/${reelCode}/?igsh=e2e`)
  await page.getByRole('button', { name: 'Add reel' }).click()
  await expect(page.getByText('Reel 1', { exact: true })).toBeVisible()
}

/** Writes an answer on a phone. Waits for "Locked in", or for voting if they were the last one in. */
export async function answer(who: Who, text: string) {
  const box = who.page.getByLabel('Your answer')
  await expect(box).toBeVisible()
  await box.fill(text)
  await who.page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(who.page.getByText('Locked in').or(who.page.getByText('Vote your')).first()).toBeVisible()
}

/** Judge picks or crowd votes: taps the first answer card that isn't their own. */
export async function tapFirstAnswer(who: Who) {
  const card = who.page.locator('main ul li button:not([disabled])').first()
  await expect(card).toBeVisible()
  await card.click()
  // Either the tap shows as selected, or it was the last one needed and the reveal took over.
  await expect(who.page.locator('main ul li button[aria-pressed="true"]').or(who.page.getByText('verdict')).first()).toBeVisible()
}

/** Checks the reveal against the scoring rules in the README and the score deltas. */
export function checkScoring(before: Record<string, number>, s: RoomView) {
  const reveal = s.round!.reveal!
  const bonus = s.players.length >= 4
  const max = Math.max(0, ...reveal.map(a => a.votes))
  for (const a of reveal) {
    const crowd = bonus && max > 0 && a.votes === max
    expect(a.audienceWin, `audienceWin for ${a.playerId}`).toBe(crowd)
    expect(a.points, `points for ${a.playerId}`).toBe((a.judgePick ? 1 : 0) + (crowd ? 1 : 0))
  }
  expect(reveal.filter(a => a.judgePick).length).toBeLessThanOrEqual(1)
  for (const p of s.players) {
    const gained = reveal.find(a => a.playerId === p.id)?.points ?? 0
    expect(p.score, `score for ${p.name}`).toBe((before[p.id] ?? 0) + gained)
  }
}

export const scores = (s: RoomView) => Object.fromEntries(s.players.map(p => [p.id, p.score]))
