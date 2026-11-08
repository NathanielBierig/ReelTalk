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

export interface PublicAnswer {
  id: string // opaque answer id (not the player id) until reveal
  text: string
}

export interface RevealAnswer {
  playerId: string
  text: string
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
}

// client -> server
export type ClientMsg =
  | { t: 'join'; name: string }
  | { t: 'settings'; settings: Partial<Settings> }
  | { t: 'openSubmit' }
  | { t: 'addReel'; url: string }
  | { t: 'removeReel'; id: string }
  | { t: 'startGame' }
  | { t: 'answer'; text: string }
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
  revealSecs: 12,
}

export const PLAYER_COLORS = [
  '#FF2E88', '#2E6BFF', '#E9FF3B', '#00D68F', '#FF7A1A', '#A855F7',
  '#00C2FF', '#FF4D4D', '#FFC400', '#7CFF4D', '#FF66D4', '#5EEAD4',
]

/** Extracts an Instagram shortcode from any reel/post URL, or null. Drops tracking params. */
export function parseReelCode(input: string): string | null {
  const m = input.trim().match(/instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,})/i)
  return m ? m[1] : null
}
