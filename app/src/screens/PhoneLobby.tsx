import { useEffect, useState } from 'react'
import { QR } from '@/components/QR'
import { reelUrl } from '@/components/ReelCard'
import { AnimatePresence, motion } from 'motion/react'
import { ClipboardPaste, Camera, Music2, Plus, X, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Chunk, Kicker, PlayerPill, Screen, TopBar } from '@/components/bits'
import { cn } from '@/lib/utils'
import { LIMITS, parseReelCode, type ClientMsg, type RoomView, type Settings } from '../../shared/types'

type Send = (m: ClientMsg) => void

export function PhoneLobby({ state, send }: { state: RoomView; send: Send }) {
  const me = state.players.find(p => p.id === state.you.id)!
  const need = state.settings.reelsPerPlayer
  const done = state.myReels.length >= need
  return (
    <Screen>
      <TopBar code={state.code} />
      <section className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full" style={{ background: me.color }} />
        <p className="font-display text-xl font-extrabold">
          {done ? "You're all set," : 'Hey'} <span style={{ color: me.color }}>{me.name}</span>
          {done ? '!' : '. Drop your reels'}
        </p>
      </section>

      <SubmitPanel state={state} send={send} />

      {state.you.isHost && <HostControls state={state} send={send} />}

      <section className="space-y-2">
        <Kicker>{state.players.length} in the room</Kicker>
        <AnimatePresence>
          {state.players.map(p => (
            <PlayerPill
              key={p.id}
              p={p}
              right={
                <span className="flex items-center gap-2">
                  {p.id === state.hostId && <Crown className="size-4 text-acid" aria-label="host" />}
                  <ReelDots have={p.reelCount} need={need} />
                  {state.you.isHost && p.id !== state.you.id && (
                    <button
                      onClick={() => confirm(`Remove ${p.name}?`) && send({ t: 'kick', playerId: p.id })}
                      className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-panel hover:text-ink"
                      aria-label={`Remove ${p.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </span>
              }
            />
          ))}
        </AnimatePresence>
      </section>

      {!state.you.isHost && (
        <p className="mt-auto text-center text-sm text-muted-foreground">
          {state.mode === 'party' ? 'Watch the big screen. The host starts the game.' : 'The host starts the game when everyone is ready.'}
        </p>
      )}
    </Screen>
  )
}

export function ReelDots({ have, need }: { have: number; need: number }) {
  return (
    <span className="flex gap-1" aria-label={`${have} of ${need} reels`}>
      {Array.from({ length: need }, (_, i) => (
        <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i < have ? 'bg-acid' : 'bg-ink/15')} />
      ))}
    </span>
  )
}

function SubmitPanel({ state, send }: { state: RoomView; send: Send }) {
  const [url, setUrl] = useState('')
  const [manual, setManual] = useState(false)
  const [cameBack, setCameBack] = useState(false)
  const need = state.settings.reelsPerPlayer
  const full = state.myReels.length >= need

  // After visiting Instagram, make Paste the obvious next tap.
  useEffect(() => {
    const on = () => { if (document.visibilityState === 'visible') setCameBack(true) }
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  const add = (raw: string) => {
    if (!parseReelCode(raw)) {
      toast.error("That's not an Instagram reel link")
      return
    }
    send({ t: 'addReel', url: raw })
    setUrl('')
    setCameBack(false)
  }

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) { toast.error('Clipboard is empty. Copy a reel link first.'); return }
      add(text)
    } catch {
      setManual(true)
      toast('Paste the link into the box below')
    }
  }

  return (
    <section className="sticker space-y-4 p-4">
      <div className="flex items-baseline justify-between">
        <Kicker>Your reels</Kicker>
        <span className="font-display text-sm font-extrabold">
          <span className={full ? 'text-acid' : ''}>{state.myReels.length}</span>/{need}
        </span>
      </div>

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {state.myReels.map((r, i) => (
            <motion.li
              key={r.id}
              layout
              initial={{ opacity: 0, x: -30, rotate: -4 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              className="flex items-center gap-3 rounded-2xl bg-panel-2 p-3"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acid font-display font-black text-night">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-base font-extrabold">Reel {i + 1}</span>
                  <a href={reelUrl(r.code)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-muted-foreground underline underline-offset-4">
                    Preview
                  </a>
                </span>
                {r.status === 'music' && (
                  <Badge variant="secondary" className="mt-1 gap-1 bg-night text-acid"><Music2 className="size-3" /> Has music: opens in Instagram</Badge>
                )}
              </span>
              <button
                onClick={() => send({ t: 'removeReel', id: r.id })}
                className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-panel hover:text-ink"
                aria-label="Remove reel"
              >
                <X className="size-5" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {!full && (
        <div className="space-y-3">
          <ol className="space-y-1 text-sm text-muted-foreground">
            <li><b className="text-ink">1.</b> Open Instagram, find a reel you'd send a friend</li>
            <li><b className="text-ink">2.</b> Tap <b className="text-ink">Share</b> → <b className="text-ink">Copy link</b></li>
            <li><b className="text-ink">3.</b> Come back (tap <b className="text-ink">◀ Safari</b> top-left) and hit Paste</li>
          </ol>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-chunk fill-glass !px-2 text-base"
            >
              <Camera className="size-5" /> Instagram
            </a>
            <Chunk color="acid" onClick={paste} className={cn('!px-2 text-sm', cameBack && 'anim-pulse-ring')}>
              <ClipboardPaste className="size-5" /> Paste
            </Chunk>
          </div>
          {manual ? (
            <form onSubmit={e => { e.preventDefault(); add(url) }} className="flex gap-2">
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="instagram.com/reel/…"
                inputMode="url"
                autoFocus
                className="h-12 flex-1 rounded-xl border-2 bg-night text-base"
              />
              <button type="submit" className="grid size-12 place-items-center rounded-xl bg-acid text-night" aria-label="Add reel">
                <Plus className="size-6" />
              </button>
            </form>
          ) : (
            <button onClick={() => setManual(true)} className="w-full text-center text-sm font-semibold text-muted-foreground underline underline-offset-4">
              or type the link
            </button>
          )}
        </div>
      )}
    </section>
  )
}

const OPTS: { key: keyof Settings; label: string; values: number[]; fmt: (n: number) => string }[] = [
  { key: 'reelsPerPlayer', label: 'Reels each', values: [1, 2, 3, 4, 5], fmt: n => String(n) },
  { key: 'answerSecs', label: 'Writing', values: [30, 45, 60, 90], fmt: n => `${n}s` },
  { key: 'judgeSecs', label: 'Judging', values: [20, 30, 45], fmt: n => `${n}s` },
]

export function SettingsRows({ state, send, big }: { state: RoomView; send: Send; big?: boolean }) {
  return (
    <div className="space-y-3">
      {OPTS.map(o => (
        <div key={o.key} className="flex items-center justify-between gap-3">
          <span className={cn('font-semibold text-muted-foreground', big && 'text-lg')}>{o.label}</span>
          <div className="flex gap-1 rounded-xl bg-night p-1">
            {o.values.map(v => {
              const on = state.settings[o.key] === v
              return (
                <button
                  key={v}
                  onClick={() => send({ t: 'settings', settings: { [o.key]: v } })}
                  className={cn('min-w-10 rounded-lg px-2.5 py-2 font-display text-sm font-extrabold transition-colors',
                    on ? 'bg-acid text-night' : 'text-ink/60 hover:text-ink')}
                  aria-pressed={on}
                >
                  {o.fmt(v)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function startBlocker(state: RoomView): string | null {
  if (state.players.length < LIMITS.minPlayers) return `Need ${LIMITS.minPlayers - state.players.length} more player${LIMITS.minPlayers - state.players.length > 1 ? 's' : ''}`
  if (!state.players.some(p => p.reelCount > 0)) return 'Waiting for reels'
  return null
}

function HostControls({ state, send }: { state: RoomView; send: Send }) {
  const blocker = startBlocker(state)
  const missing = state.players.filter(p => p.reelCount < state.settings.reelsPerPlayer).length
  return (
    <section className="sticker space-y-4 border-acid/40 p-4">
      <Kicker className="text-acid">You're the host</Kicker>
      <SettingsRows state={state} send={send} />
      <StartButton blocker={blocker} missing={missing} onStart={() => send({ t: 'startGame' })} />
      <ShareRoom code={state.code} />
    </section>
  )
}

function ShareRoom({ code }: { code: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-3 text-center">
      <button onClick={() => setShow(s => !s)} className="text-sm font-semibold text-muted-foreground underline underline-offset-4">
        {show ? 'Hide QR code' : `Show QR so friends can join ${code}`}
      </button>
      {show && <div className="flex justify-center"><QR code={code} size={220} /></div>}
    </div>
  )
}

/** Two-tap start when people are still adding reels (no native popups mid-party). */
export function StartButton({ blocker, missing, onStart, className }: {
  blocker: string | null; missing: number; onStart: () => void; className?: string
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(t)
  }, [armed])
  return (
    <Chunk
      color={armed ? 'acid' : 'pink'}
      disabled={!!blocker}
      className={className}
      onClick={() => {
        if (missing > 0 && !armed) { setArmed(true); return }
        onStart()
      }}
    >
      {blocker ?? (armed ? `${missing} still adding. Tap to start anyway` : 'Start the game')}
    </Chunk>
  )
}
