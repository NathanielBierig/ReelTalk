// Solo test mode: one person plays every seat on one laptop.
// Each frame loads the real room with `?seat=...`, so it gets its own player identity.
import { useEffect, useState } from 'react'
import { Bus, ExternalLink, RotateCcw, Tv } from 'lucide-react'
import { toast } from 'sonner'
import { Chunk, Kicker, Logo } from '@/components/bits'
import { clientIdFor } from '@/lib/identity'
import { navigate } from '../App'
import type { Mode } from '../../shared/types'

const TV = { w: 1280, h: 800 }
const PHONE = { w: 390, h: 844 }
const GAP = 12

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight })
  const [v, setV] = useState(read)
  useEffect(() => {
    const on = () => setV(read())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return v
}

function Frame({ src, w, h, scale, label }: { src: string; w: number; h: number; scale: number; label: string }) {
  return (
    <div className="flex w-fit flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
        <span>{label}</span>
        <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
          New tab <ExternalLink className="size-3" />
        </a>
      </div>
      <div className="relative overflow-hidden rounded-xl border-2 border-panel-2" style={{ width: w * scale, height: h * scale }}>
        <iframe
          src={src}
          title={label}
          allow="clipboard-read; clipboard-write; autoplay; fullscreen"
          className="absolute left-0 top-0 origin-top-left border-0 bg-night"
          style={{ width: w, height: h, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  )
}

export default function Solo() {
  const [mode, setMode] = useState<Mode>('party')
  const [players, setPlayers] = useState(4)
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const vp = useViewport()

  const start = async () => {
    setBusy(true)
    try {
      const host = mode === 'party' ? 'tv' : 'p1'
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, clientId: clientIdFor(host) }),
      })
      const body = (await res.json()) as { code?: string; error?: string }
      if (!body.code) throw new Error(body.error ?? 'failed')
      setCode(body.code)
    } catch {
      toast.error("Couldn't create a room. Check your connection.")
    } finally {
      setBusy(false)
    }
  }

  if (!code) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-4 py-8">
        <Logo />
        <div className="sticker space-y-5 p-5">
          <div>
            <Kicker>Solo test</Kicker>
            <p className="mt-2 text-lg font-semibold">You play every seat on this screen: the TV and each phone.</p>
            <p className="mt-1 text-sm text-muted-foreground">Use a laptop. Set "Reels each" to 1 so you only paste {players} reels.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Chunk color={mode === 'party' ? 'pink' : 'volt'} className={mode === 'party' ? '' : 'opacity-50'} onClick={() => setMode('party')}>
              <Tv className="size-5" /> TV + phones
            </Chunk>
            <Chunk color={mode === 'bus' ? 'pink' : 'volt'} className={mode === 'bus' ? '' : 'opacity-50'} onClick={() => setMode('bus')}>
              <Bus className="size-5" /> Phones only
            </Chunk>
          </div>
          <div className="space-y-2">
            <Kicker>Players</Kicker>
            <div className="grid grid-cols-2 gap-3">
              {[3, 4].map(n => (
                <Chunk key={n} color={players === n ? 'acid' : 'volt'} className={players === n ? '' : 'opacity-50'} onClick={() => setPlayers(n)}>
                  {n} players{n === 4 ? ' (crowd vote on)' : ''}
                </Chunk>
              ))}
            </div>
          </div>
          <Chunk color="acid" onClick={start} disabled={busy}>{busy ? 'Creating…' : 'Start solo test'}</Chunk>
        </div>
        <button className="text-sm text-muted-foreground underline" onClick={() => navigate('/')}>Back home</button>
      </main>
    )
  }

  const seats = Array.from({ length: players }, (_, i) => `p${i + 1}`)
  const src = (seat: string) => `/r/${code}?seat=${seat}`
  // Fit everything on one screen with no scrolling: TV takes up to ~45% of the height, phones get the rest.
  const width = vp.w - 32
  const chrome = 64 + 24 // header + frame labels
  const tvScale = mode === 'party' ? Math.min(0.8, width / TV.w, (vp.h * 0.45) / TV.h) : 0
  const phonesH = vp.h - chrome - TV.h * tvScale - (mode === 'party' ? 40 : 0)
  const phoneScale = Math.max(0.35, Math.min(0.8, (width - GAP * (players - 1)) / (players * PHONE.w), phonesH / PHONE.h))

  return (
    <main className="min-h-dvh space-y-3 bg-night p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="rounded-xl bg-panel-2 px-3 py-1.5 font-display text-sm font-extrabold tracking-[0.2em]">{code}</span>
          <span className="text-sm text-muted-foreground">Solo test, {mode === 'party' ? 'TV + phones' : 'phones only'}. {mode === 'bus' ? 'P1 is the host and starts the game.' : 'Start the game from the TV.'}</span>
        </div>
        <button className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-ink" onClick={() => setCode(null)}>
          <RotateCcw className="size-4" /> New solo test
        </button>
      </header>
      {mode === 'party' && <Frame src={src('tv')} w={TV.w} h={TV.h} scale={tvScale} label="TV" />}
      <div className="flex flex-wrap" style={{ gap: GAP }}>
        {seats.map(s => <Frame key={s} src={src(s)} w={PHONE.w} h={PHONE.h} scale={phoneScale} label={s.toUpperCase()} />)}
      </div>
    </main>
  )
}
