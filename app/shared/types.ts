// Shared between the Worker (server) and the React app (client).

export type Mode = 'party' | 'bus'
export type Phase = 'lobby' | 'submit' | 'answer' | 'judge' | 'reveal' | 'final'
export type ReelStatus = 'playable' | 'music' | 'unknown'

export interface Settings {
  reelsPerPlayer: number // 1-5
  answerSecs: number // 30 | 45 | 60 | 90
  judgeSecs: number // 20 | 30 | 45
}

export interface PublicPlayer {
  id: string
  name: string
  color: string
  score: number
  connected: boolean
  reelCount: number
}

export interface MyReel {
  id: string
  code: string
  status: ReelStatus
}

export type MediaKind = 'gif' | 'sticker' | 'image'

export interface Media {
  kind: MediaKind
  url: string
  w: number
  h: number
}

export interface PublicAnswer {
  id: string // opaque answer id (not the player id) until reveal
  text: string // caption (may be empty when media is present)
  media?: Media
}

export interface RevealAnswer {
  playerId: string
  text: string
  media?: Media
  judgePick: boolean
  votes: number
  audienceWin: boolean
  points: number
}

export interface RoundView {
  index: number
  total: number
  reelCode: string
  reelStatus: ReelStatus
  judgeId: string
  judgeName: string
  answeredCount: number
  answererCount: number
  votedCount: number
  voterCount: number
  judgePicked: boolean
  myAnswer?: string
  myAnswerMedia?: Media
  myAnswerId?: string
  myVote?: string
  myPick?: string
  answers?: PublicAnswer[] // judge phase (shuffled, anonymous)
  reveal?: RevealAnswer[] // reveal phase
  audienceBonus: boolean
}

export interface RoomView {
  code: string
  mode: Mode
  phase: Phase
  settings: Settings
  hostId: string
  you: { id: string; isHost: boolean; isPlayer: boolean }
  players: PublicPlayer[]
  myReels: MyReel[]
  round?: RoundView
  deadline?: number // epoch ms
  serverNow: number
  features: { gifs: boolean }
}

// client -> server
export type ClientMsg =
  | { t: 'join'; name: string }
  | { t: 'settings'; settings: Partial<Settings> }
  | { t: 'openSubmit' }
  | { t: 'addReel'; url: string }
  | { t: 'removeReel'; id: string }
  | { t: 'startGame' }
  | { t: 'answer'; text: string; media?: Media }
  | { t: 'pick'; answerId: string }
  | { t: 'vote'; answerId: string }
  | { t: 'next' }
  | { t: 'kick'; playerId: string }
  | { t: 'playAgain' }
  | { t: 'ping' }

// server -> client
export type ServerMsg =
  | { t: 'state'; state: RoomView }
  | { t: 'error'; message: string }
  | { t: 'toast'; message: string; kind?: 'ok' | 'warn' }
  | { t: 'pong' }

export const LIMITS = {
  answerChars: 80,
  nameChars: 16,
  minPlayers: 3,
  audienceBonusMinPlayers: 4,
  maxPlayers: 12,
  revealSecs: 15,
}

export const PLAYER_COLORS = [
  '#F0648E', '#7C97FF', '#E9B44C', '#3CC59A', '#F08446', '#B38AF2',
  '#56C4E6', '#F26B62', '#D8CF62', '#93D46E', '#EE8AD0', '#62D2C2',
]

/** Extracts an Instagram shortcode from any reel/post URL, or null. Drops tracking params. */
export function parseReelCode(input: string): string | null {
  const m = input.trim().match(/instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,})/i)
  return m ? m[1] : null
}

export interface GifResult {
  id: string
  preview: string // small animated (grid)
  url: string // what gets shown as the answer
  w: number
  h: number
}

/** Media URLs we accept in answers: GIPHY CDN, or images uploaded to this room. */
export function isAllowedMediaUrl(m: Media, roomCode: string): boolean {
  if (m.kind === 'image') return new RegExp(`^/api/rooms/${roomCode}/images/[a-z0-9]{8,16}$`).test(m.url)
  return /^https:\/\/(media\d*|i)\.giphy\.com\/[^\s"'<>]+$/.test(m.url)
}
