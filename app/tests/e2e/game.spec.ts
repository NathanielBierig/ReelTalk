import { test, expect, type Browser } from '@playwright/test'
import {
  Spectator, open, shot, joinAs, addReel, answer, tapFirstAnswer, checkScoring, scores,
  type Who,
} from './helpers'

// Pre-playtest smoke suite: full games in both modes plus the ugly real-life cases
// (refresh, someone leaving, a late joiner). Runs against the real Worker + Durable Object.

function reportIssues(people: Who[]) {
  const first = people.flatMap(p => p.issues.firstParty)
  const ext = people.flatMap(p => p.issues.external)
  if (ext.length) console.log(`  external (Instagram/GIPHY) noise, not failing:\n    ${[...new Set(ext)].slice(0, 10).join('\n    ')}`)
  expect(first, 'console errors / failed requests from our app').toEqual([])
}

async function playRound(opts: {
  spec: Spectator
  players: Who[]
  skipper: Who // who taps "Next reel" (TV in party mode, host phone in bus mode)
  tv?: Who
  dir: string
  round: number
  absent?: Set<string>
}) {
  const { spec, players, skipper, tv, dir, round, absent = new Set() } = opts
  const s = await spec.until(st => st.phase === 'answer' && st.round?.index === round, 15_000, `round ${round + 1} answer phase`)
  const judgeId = s.round!.judgeId
  const here = players.filter(p => !absent.has(p.name))
  const judge = here.find(p => spec.idOf(p.name) === judgeId)
  const writers = here.filter(p => p !== judge)

  if (judge) await expect(judge.page.getByText('Your reel!')).toBeVisible()
  if (s.mode === 'bus') {
    for (const w of writers) await expect(w.page.getByRole('link', { name: 'Watch the reel' })).toHaveAttribute('href', /instagram\.com\/reel\//)
  } else {
    for (const w of writers) await expect(w.page.getByText('Watch the big screen')).toBeVisible()
  }
  if (round === 0) {
    if (tv) await shot(tv, 'answer', dir)
    await shot(writers[0], 'answer', dir)
    if (judge) await shot(judge, 'answer-judge', dir)
  }

  for (const w of writers) await answer(w, `${w.name}'s take on reel ${round + 1}`)
  await spec.until(st => st.phase === 'judge', 8_000, 'judge phase (should start as soon as everyone answered)')

  if (round === 0) {
    if (tv) await shot(tv, 'judging', dir)
    if (judge) await shot(judge, 'judge-pick', dir)
    await shot(writers[0], 'vote', dir)
  }
  const before = scores(spec.state)
  for (const w of writers) await tapFirstAnswer(w)
  if (judge) await tapFirstAnswer(judge)

  const r = await spec.until(st => st.phase === 'reveal', 8_000, 'reveal phase')
  checkScoring(before, r)
  await expect(skipper.page.getByText('verdict')).toBeVisible()
  if (round === 0) {
    if (tv) await shot(tv, 'reveal', dir)
    await shot(writers[0], 'reveal', dir)
  }
  await skipper.page.getByRole('button', { name: /Next reel|Final results/ }).click()
  return judgeId
}

async function setup(browser: Browser, mode: 'party' | 'bus', names: string[], dir: string) {
  const people: Who[] = []
  let tv: Who | undefined
  let creator: Who
  if (mode === 'party') {
    tv = await open(browser, 'TV', 'tv')
    creator = tv
  } else {
    creator = await open(browser, names[0], 'phone')
  }
  await creator.page.goto('/')
  await shot(creator, 'home', dir)
  await creator.page.getByRole('button', { name: mode === 'party' ? /Host on a TV/ : /Phones only/ }).click()
  await creator.page.waitForURL(/\/r\/[A-Z]{4}$/)
  const code = creator.page.url().split('/r/')[1]
  const spec = await Spectator.connect(code)
  expect(spec.state.mode).toBe(mode)

  const players: Who[] = []
  for (const name of names) {
    const p = mode === 'bus' && name === names[0] ? creator : await open(browser, name, 'phone')
    await joinAs(p, code, spec)
    players.push(p)
  }
  people.push(...(tv ? [tv] : []), ...players)

  // Host sets 1 reel each so a full game is one round per player.
  const hostPage = tv ?? players[0]
  await hostPage.page.getByRole('button', { name: '1', exact: true }).click()
  await spec.until(s => s.settings.reelsPerPlayer === 1, 5_000, 'settings change')

  for (const [i, p] of players.entries()) await addReel(p, `E2Etest${mode}${i}x`)
  await spec.until(s => s.players.every(p => p.reelCount === 1), 5_000, 'all reels in')
  await shot(hostPage, 'lobby-ready', dir)
  if (tv) await shot(players[1], 'lobby', dir)

  await hostPage.page.getByRole('button', { name: 'Start the game' }).click()
  await spec.until(s => s.phase === 'answer', 5_000, 'game start')
  return { code, spec, tv, players, people }
}

async function finish(spec: Spectator, players: Who[], dir: string, tv?: Who) {
  const s = await spec.until(st => st.phase === 'final', 8_000, 'final results')
  const top = [...s.players].sort((a, b) => b.score - a.score)[0]
  const screens = tv ? [tv, ...players] : players
  for (const p of screens) {
    await expect(p.page.getByText('And the winner is')).toBeVisible()
    await expect(p.page.getByText(top.name, { exact: true }).first()).toBeVisible()
  }
  if (tv) await shot(tv, 'final', dir)
  await shot(players[0], 'final', dir)
  return s
}

test('party mode: TV + 4 phones play a full game', async ({ browser }) => {
  const dir = 'party'
  const { spec, tv, players, people } = await setup(browser, 'party', ['Ava', 'Ben', 'Cat', 'Dan'], dir)
  const judges: string[] = []
  for (let i = 0; i < players.length; i++) judges.push(await playRound({ spec, players, skipper: tv!, tv, dir, round: i }))
  const final = await finish(spec, players, dir, tv)
  // Every player judged exactly their own reel once.
  expect(new Set(judges).size).toBe(players.length)
  expect(final.players.reduce((n, p) => n + p.score, 0)).toBeGreaterThan(0)
  reportIssues(people)
  spec.close()
})

test('bus mode: 3 phones, no TV, play a full game', async ({ browser }) => {
  const dir = 'bus'
  const { spec, players, people } = await setup(browser, 'bus', ['Eli', 'Fay', 'Gus'], dir)
  const judges: string[] = []
  for (let i = 0; i < players.length; i++) judges.push(await playRound({ spec, players, skipper: players[0], dir, round: i }))
  await finish(spec, players, dir)
  expect(new Set(judges).size).toBe(players.length)
  // 3 players: crowd bonus is off, so only judge picks score.
  expect(spec.state.players.reduce((n, p) => n + p.score, 0)).toBe(players.length)
  reportIssues(people)
  spec.close()
})

test('party mode: refresh mid-round, a player leaves, a late joiner', async ({ browser }) => {
  const dir = 'edge'
  const { code, spec, tv, players, people } = await setup(browser, 'party', ['Hal', 'Ivy', 'Jo', 'Kai'], dir)
  const s = await spec.until(st => st.phase === 'answer', 5_000, 'answer phase')
  const judgeId = s.round!.judgeId
  const writers = players.filter(p => spec.idOf(p.name) !== judgeId)
  const [refresher, leaver, steady] = writers

  // 1. Refresh before answering: same seat, composer is back.
  await refresher.page.reload()
  await expect(refresher.page.getByLabel('Your answer')).toBeVisible()
  await spec.until(st => st.players.find(p => p.name === refresher.name)!.connected, 5_000, 'refresher reconnected')
  await answer(refresher, 'answered after a refresh')
  // Refresh after answering: still locked in with the same text.
  await refresher.page.reload()
  await expect(refresher.page.getByText('Locked in')).toBeVisible()
  await expect(refresher.page.getByText('answered after a refresh')).toBeVisible()

  // 2. TV refresh keeps the stage (not a join form).
  await tv!.page.reload()
  await expect(tv!.page.getByText('answers in')).toBeVisible()

  // 3. A player leaves without answering: game must not wait for them.
  await leaver.ctx.close()
  await spec.until(st => !st.players.find(p => p.name === leaver.name)!.connected, 10_000, 'leaver marked away')
  await answer(steady, 'steady answer')
  const t0 = Date.now()
  await spec.until(st => st.phase === 'judge', 5_000, 'judge phase without the leaver')
  console.log(`  judge phase started ${Date.now() - t0}ms after last answer (leaver ignored)`)

  // 4. Late joiner sees a friendly message and doesn't become a player.
  const late = await open(browser, 'Late', 'phone')
  people.push(late)
  await late.page.goto(`/r/${code}`)
  await expect(late.page.getByText('This game already started')).toBeVisible()
  await shot(late, 'late-joiner', dir)
  expect(spec.state.players.length).toBe(4)

  // Finish round 1, then the rest of the game without the leaver (including the round they judge).
  const before = scores(spec.state)
  for (const w of [refresher, steady]) await tapFirstAnswer(w)
  const judge = players.find(p => spec.idOf(p.name) === judgeId)!
  await tapFirstAnswer(judge)
  checkScoring(before, await spec.until(st => st.phase === 'reveal', 8_000, 'reveal'))
  await tv!.page.getByRole('button', { name: /Next reel|Final results/ }).click()

  const absent = new Set([leaver.name])
  for (let i = 1; i < spec.state.round!.total; i++) {
    await playRound({ spec, players, skipper: tv!, tv, dir, round: i, absent })
  }
  await finish(spec, players.filter(p => p !== leaver), dir, tv)
  reportIssues(people.filter(p => p !== leaver))
  spec.close()
})
