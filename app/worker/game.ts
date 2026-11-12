// Pure game logic. No I/O, so it is easy to test and reason about.
import {
  LIMITS, PLAYER_COLORS,
  isAllowedMediaUrl,
  type Media, type Mode, type Phase, type ReelStatus, type RoomView, type Settings, type RevealAnswer,
} from '../shared/types'

export interface Player {
  id: string
  name: string
  color: string
  score: number
  joinedAt: number
}

export interface Reel {
  id: string
  ownerId: string
  code: string
  status: ReelStatus
}

export interface Answer {
  id: string
  text: string
  media?: Media
}

export interface Round {
  reelId: string
  judgeId: string
  answers: Record<string, Answer> // playerId -> answer
  order: string[] // shuffled answer ids for display
  pick?: string // answer id
  votes: Record<string, string> // voterId -> answer id
  reveal?: RevealAnswer[]
}

export interface GameState {
  code: string
  mode: Mode
  phase: Phase
  settings: Settings
  hostId: string
  players: Player[]
  reels: Reel[]
  rounds: Round[]
  roundIndex: number
  deadline?: number
  createdAt: number
}

export type Result = { ok: true } | { ok: false; error: string }
const ok: Result = { ok: true }
const fail = (error: string): Result => ({ ok: false, error })

export const DEFAULT_SETTINGS: Settings = { reelsPerPlayer: 3, answerSecs: 60, judgeSecs: 30 }

export function rid(n = 10): string {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  const bytes = crypto.getRandomValues(new Uint8Array(n))
  for (const b of bytes) s += a[b % a.length]
  return s
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createState(code: string, mode: Mode, hostId: string, now: number): GameState {
  return {
    code, mode, phase: 'lobby', settings: { ...DEFAULT_SETTINGS }, hostId,
    players: [], reels: [], rounds: [], roundIndex: 0, createdAt: now,
  }
}

// ---------- lobby ----------

export function join(s: GameState, id: string, rawName: string, now: number): Result {
  const name = rawName.trim().replace(/\s+/g, ' ').slice(0, LIMITS.nameChars)
  if (!name) return fail('Pick a name first')
  const existing = s.players.find(p => p.id === id)
  if (existing) { existing.name = name; return ok }
  if (s.mode === 'party' && id === s.hostId) return fail('The host screen is not a player')
  if (s.phase !== 'lobby' && s.phase !== 'submit') return fail('Game already started. Wait for the next one!')
  if (s.players.length >= LIMITS.maxPlayers) return fail('Room is full')
  if (s.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return fail('Name taken, pick another')
  const used = new Set(s.players.map(p => p.color))
  const color = PLAYER_COLORS.find(c => !used.has(c)) ?? PLAYER_COLORS[s.players.length % PLAYER_COLORS.length]
  s.players.push({ id, name, color, score: 0, joinedAt: now })
  return ok
}

export function kick(s: GameState, by: string, playerId: string): Result {
  if (by !== s.hostId) return fail('Only the host can do that')
  if (playerId === s.hostId) return fail("Can't kick the host")
  s.players = s.players.filter(p => p.id !== playerId)
  s.reels = s.reels.filter(r => r.ownerId !== playerId)
  // Drop future rounds judged by the kicked player.
  if (s.rounds.length) {
    const done = s.rounds.slice(0, s.roundIndex + 1)
    const future = s.rounds.slice(s.roundIndex + 1).filter(r => r.judgeId !== playerId)
    s.rounds = [...done, ...future]
  }
  return ok
}

export function updateSettings(s: GameState, by: string, patch: Partial<Settings>): Result {
  if (by !== s.hostId) return fail('Only the host can change settings')
  if (s.phase !== 'lobby' && s.phase !== 'submit') return fail('Too late to change settings')
  const clamp = (v: unknown, allowed: number[], cur: number) =>
    typeof v === 'number' && allowed.includes(v) ? v : cur
  s.settings = {
    reelsPerPlayer: clamp(patch.reelsPerPlayer, [1, 2, 3, 4, 5], s.settings.reelsPerPlayer),
    answerSecs: clamp(patch.answerSecs, [30, 45, 60, 90], s.settings.answerSecs),
    judgeSecs: clamp(patch.judgeSecs, [20, 30, 45], s.settings.judgeSecs),
  }
  return ok
}

export function openSubmit(s: GameState, by: string): Result {
  if (by !== s.hostId) return fail('Only the host can do that')
  if (s.phase !== 'lobby') return fail('Already collecting reels')
  s.phase = 'submit'
  return ok
}

// ---------- reels ----------

export function addReel(s: GameState, playerId: string, code: string, status: ReelStatus): Result {
  if (s.phase !== 'lobby' && s.phase !== 'submit') return fail('Reels are locked once the game starts')
  if (!s.players.some(p => p.id === playerId)) return fail('Join the room first')
  const mine = s.reels.filter(r => r.ownerId === playerId)
  if (mine.length >= s.settings.reelsPerPlayer) return fail(`Max ${s.settings.reelsPerPlayer} reels each`)
  const dupe = s.reels.find(r => r.code === code)
  if (dupe) return fail(dupe.ownerId === playerId ? 'You already added that one' : 'Someone already added that reel!')
  s.reels.push({ id: rid(8), ownerId: playerId, code, status })
  return ok
}

export function removeReel(s: GameState, playerId: string, reelId: string): Result {
  if (s.phase !== 'lobby' && s.phase !== 'submit') return fail('Reels are locked')
  s.reels = s.reels.filter(r => !(r.id === reelId && r.ownerId === playerId))
  return ok
}

// ---------- game flow ----------

/** Round-robin: everyone's 1st reel, then everyone's 2nd, ... so judging rotates. */
export function buildRounds(s: GameState): Round[] {
  const order = [...s.players].sort((a, b) => a.joinedAt - b.joinedAt)
  const byOwner = new Map(order.map(p => [p.id, s.reels.filter(r => r.ownerId === p.id)]))
  const rounds: Round[] = []
  for (let k = 0; k < s.settings.reelsPerPlayer; k++) {
    for (const p of order) {
      const reel = byOwner.get(p.id)?.[k]
      if (reel) rounds.push({ reelId: reel.id, judgeId: p.id, answers: {}, order: [], votes: {} })
    }
  }
  return rounds
}

export function startGame(s: GameState, by: string, now: number): Result {
  if (by !== s.hostId) return fail('Only the host can start')
  if (s.phase !== 'lobby' && s.phase !== 'submit') return fail('Already started')
  if (s.players.length < LIMITS.minPlayers) return fail(`Need at least ${LIMITS.minPlayers} players`)
  const rounds = buildRounds(s)
  if (rounds.length === 0) return fail('Nobody has added a reel yet')
  s.rounds = rounds
  s.roundIndex = 0
  for (const p of s.players) p.score = 0
  beginAnswer(s, now)
  return ok
}

function beginAnswer(s: GameState, now: number) {
  s.phase = 'answer'
  s.deadline = now + s.settings.answerSecs * 1000
}

export function currentRound(s: GameState): Round | undefined {
  return s.rounds[s.roundIndex]
}

/** Players expected to answer: everyone except the judge. */
export function answerers(s: GameState, r: Round, connected: Set<string>): string[] {
  return s.players.filter(p => p.id !== r.judgeId && connected.has(p.id)).map(p => p.id)
}

/** Players expected to vote: non-judges who have someone else's answer to vote for. */
export function voters(s: GameState, r: Round, connected: Set<string>): string[] {
  const authors = Object.keys(r.answers)
  return s.players
    .filter(p => p.id !== r.judgeId && connected.has(p.id))
    .filter(p => authors.some(a => a !== p.id))
    .map(p => p.id)
}

export function submitAnswer(
  s: GameState, playerId: string, raw: string, now: number, connected: Set<string>, rawMedia?: Media,
): Result {
  const r = currentRound(s)
  if (s.phase !== 'answer' || !r) return fail('Not answering right now')
  if (playerId === r.judgeId) return fail("It's your reel, you're the judge!")
  if (!s.players.some(p => p.id === playerId)) return fail('Not in this game')
  const text = raw.trim().replace(/\s+/g, ' ').slice(0, LIMITS.answerChars)
  let media: Media | undefined
  if (rawMedia) {
    const kind = rawMedia.kind
    if (kind !== 'gif' && kind !== 'sticker' && kind !== 'image') return fail('Unknown media type')
    const m: Media = {
      kind, url: String(rawMedia.url).slice(0, 600),
      w: Math.max(1, Math.min(4000, Math.round(Number(rawMedia.w) || 1))),
      h: Math.max(1, Math.min(4000, Math.round(Number(rawMedia.h) || 1))),
    }
    if (!isAllowedMediaUrl(m, s.code)) return fail("That image can't be used")
    media = m
  }
  if (!text && !media) return fail('Write something first')
  r.answers[playerId] = { id: r.answers[playerId]?.id ?? rid(6), text, media }
  const need = answerers(s, r, connected)
  if (need.length > 0 && need.every(id => r.answers[id])) toJudge(s, now)
  return ok
}

export function toJudge(s: GameState, now: number) {
  const r = currentRound(s)
  if (!r) return
  const ids = Object.values(r.answers).map(a => a.id)
  if (ids.length === 0) { toReveal(s, now); return }
  r.order = shuffle(ids)
  s.phase = 'judge'
  s.deadline = now + s.settings.judgeSecs * 1000
}

function answerOwner(r: Round, answerId: string): string | undefined {
  return Object.entries(r.answers).find(([, a]) => a.id === answerId)?.[0]
}

export function pick(s: GameState, playerId: string, answerId: string, now: number, connected: Set<string>): Result {
  const r = currentRound(s)
  if (s.phase !== 'judge' || !r) return fail('Not judging right now')
  if (playerId !== r.judgeId) return fail('Only the judge picks')
  if (!answerOwner(r, answerId)) return fail('Unknown answer')
  r.pick = answerId
  maybeFinishJudging(s, now, connected)
  return ok
}

export function vote(s: GameState, playerId: string, answerId: string, now: number, connected: Set<string>): Result {
  const r = currentRound(s)
  if (s.phase !== 'judge' || !r) return fail('Not voting right now')
  if (playerId === r.judgeId) return fail('The judge picks, not votes')
  if (!s.players.some(p => p.id === playerId)) return fail('Not in this game')
  const owner = answerOwner(r, answerId)
  if (!owner) return fail('Unknown answer')
  if (owner === playerId) return fail("Can't vote for yourself")
  r.votes[playerId] = answerId
  maybeFinishJudging(s, now, connected)
  return ok
}

function maybeFinishJudging(s: GameState, now: number, connected: Set<string>) {
  const r = currentRound(s)!
  const judgeDone = !!r.pick || !connected.has(r.judgeId)
  const need = voters(s, r, connected)
  const votesDone = need.every(id => r.votes[id])
  if (judgeDone && votesDone) toReveal(s, now)
}

export function audienceBonusOn(s: GameState): boolean {
  return s.players.length >= LIMITS.audienceBonusMinPlayers
}

export function toReveal(s: GameState, now: number) {
  const r = currentRound(s)
  if (!r) return
  const counts = new Map<string, number>()
  for (const a of Object.values(r.votes)) counts.set(a, (counts.get(a) ?? 0) + 1)
  const max = Math.max(0, ...counts.values())
  const bonus = audienceBonusOn(s)
  const reveal: RevealAnswer[] = Object.entries(r.answers).map(([playerId, a]) => {
    const votes = counts.get(a.id) ?? 0
    const judgePick = r.pick === a.id
    const audienceWin = bonus && max > 0 && votes === max
    return { playerId, text: a.text, media: a.media, judgePick, votes, audienceWin, points: (judgePick ? 1 : 0) + (audienceWin ? 1 : 0) }
  })
  for (const ra of reveal) {
    const p = s.players.find(x => x.id === ra.playerId)
    if (p) p.score += ra.points
  }
  reveal.sort((a, b) => b.points - a.points || b.votes - a.votes)
  r.reveal = reveal
  s.phase = 'reveal'
  s.deadline = now + LIMITS.revealSecs * 1000
}

export function next(s: GameState, now: number): Result {
  if (s.phase !== 'reveal') return fail('Nothing to skip')
  s.roundIndex++
  if (s.roundIndex >= s.rounds.length) {
    s.phase = 'final'
    s.deadline = undefined
  } else {
    beginAnswer(s, now)
  }
  return ok
}

/** Called when the phase deadline passes. */
export function onDeadline(s: GameState, now: number) {
  if (!s.deadline || now < s.deadline - 250) return
  if (s.phase === 'answer') toJudge(s, now)
  else if (s.phase === 'judge') toReveal(s, now)
  else if (s.phase === 'reveal') next(s, now)
}

/** Re-check completion when someone disconnects, so the game never waits on a ghost. */
export function recheck(s: GameState, now: number, connected: Set<string>) {
  const r = currentRound(s)
  if (!r) return
  if (s.phase === 'answer') {
    const need = answerers(s, r, connected)
    if (need.length > 0 && need.every(id => r.answers[id])) toJudge(s, now)
  } else if (s.phase === 'judge') {
    maybeFinishJudging(s, now, connected)
  }
}

export function playAgain(s: GameState, by: string): Result {
  if (by !== s.hostId) return fail('Only the host can restart')
  s.phase = 'lobby'
  s.reels = []
  s.rounds = []
  s.roundIndex = 0
  s.deadline = undefined
  for (const p of s.players) p.score = 0
  return ok
}

// ---------- view ----------

export function viewFor(
  s: GameState, viewerId: string, connected: Set<string>, now: number, features = { gifs: false },
): RoomView {
  const r = currentRound(s)
  const isPlayer = s.players.some(p => p.id === viewerId)
  const view: RoomView = {
    code: s.code,
    mode: s.mode,
    phase: s.phase,
    settings: s.settings,
    hostId: s.hostId,
    you: { id: viewerId, isHost: viewerId === s.hostId, isPlayer },
    players: s.players.map(p => ({
      id: p.id, name: p.name, color: p.color, score: p.score,
      connected: connected.has(p.id),
      reelCount: s.reels.filter(x => x.ownerId === p.id).length,
    })),
    songReels: s.reels.filter(x => x.status === 'music').length,
    myReels: s.reels.filter(x => x.ownerId === viewerId).map(x => ({ id: x.id, code: x.code, status: x.status })),
    deadline: s.deadline,
    serverNow: now,
    features,
  }
  if (r && (s.phase === 'answer' || s.phase === 'judge' || s.phase === 'reveal')) {
    const reel = s.reels.find(x => x.id === r.reelId)
    const judge = s.players.find(p => p.id === r.judgeId)
    const myAnswer = r.answers[viewerId]
    view.round = {
      index: s.roundIndex,
      total: s.rounds.length,
      reelCode: reel?.code ?? '',
      reelStatus: reel?.status ?? 'unknown',
      judgeId: r.judgeId,
      judgeName: judge?.name ?? '???',
      answeredCount: Object.keys(r.answers).length,
      answererCount: s.players.filter(p => p.id !== r.judgeId).length,
      votedCount: Object.keys(r.votes).length,
      voterCount: voters(s, r, connected).length,
      judgePicked: !!r.pick,
      myAnswer: myAnswer?.text,
      myAnswerMedia: myAnswer?.media,
      myAnswerId: myAnswer?.id,
      myVote: r.votes[viewerId],
      myPick: viewerId === r.judgeId ? r.pick : undefined,
      audienceBonus: audienceBonusOn(s),
    }
    if (s.phase === 'judge') {
      const byId = new Map(Object.values(r.answers).map(a => [a.id, a]))
      view.round.answers = r.order.map(id => ({ id, text: byId.get(id)!.text, media: byId.get(id)!.media }))
      // Let the client know which one is theirs (so it can be disabled) without revealing others.
      if (myAnswer) view.round.myAnswer = myAnswer.text
    }
    if (s.phase === 'reveal') view.round.reveal = r.reveal
  }
  return view
}

export function myAnswerId(s: GameState, playerId: string): string | undefined {
  return currentRound(s)?.answers[playerId]?.id
}
