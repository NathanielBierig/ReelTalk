import { useState } from 'react'
import { motion } from 'motion/react'
import { Bus, Tv } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Chunk, Logo, Screen } from '@/components/bits'
import { clientId } from '@/lib/identity'
import { navigate } from '../App'
import type { Mode } from '../../shared/types'

export default function Home() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<Mode | null>(null)

  const create = async (mode: Mode) => {
    setBusy(mode)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, clientId: clientId() }),
      })
      const body = (await res.json()) as { code?: string; error?: string }
      if (!body.code) throw new Error(body.error ?? 'failed')
      navigate(`/r/${body.code}`)
    } catch {
      toast.error("Couldn't create a room. Check your connection.")
    } finally {
      setBusy(null)
    }
  }

  const join = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length === 4) navigate(`/r/${code.toUpperCase()}`)
  }

  return (
    <Screen className="justify-between">
      <section className="flex flex-col items-center gap-6 pt-10 text-center">
        <motion.div initial={{ rotate: -6, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <Logo size="hero" />
        </motion.div>
        <p className="max-w-[18rem] text-lg font-semibold leading-snug text-[#E6DAEE]">
          Your friends' reels are the cards. Write the funniest take. The reel's owner judges.
        </p>
      </section>

      <form onSubmit={join} className="card-gold -rotate-2 space-y-2 p-3.5">
        <label htmlFor="room-code" className="flex items-center gap-2 pl-1 text-[0.95rem] font-extrabold text-acid">
          <Sparkle /> Got a room code?
        </label>
        <div className="flex gap-2">
          <Input
            id="room-code"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase())}
            placeholder="ABCD"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Room code"
            className="h-14 flex-1 rounded-[14px] border-[1.5px] border-acid/45 bg-[#1C0F24] px-4 font-display text-2xl tracking-[0.3em] placeholder:text-[#9C88AB]"
          />
          <Chunk type="submit" color="acid" className="min-h-14 w-auto rounded-[14px] px-6 font-sans text-[1.05rem] font-extrabold shadow-none" disabled={code.length !== 4}>
            Join
          </Chunk>
        </div>
      </form>

      <section className="space-y-4">
        <Chunk color="pink" className="rotate-[1.5deg]" onClick={() => create('party')} disabled={!!busy}>
          <Tv className="size-6" /> {busy === 'party' ? 'Creating…' : 'Host on a TV / laptop'}
        </Chunk>
        <Chunk color="volt" onClick={() => create('bus')} disabled={!!busy}>
          <Bus className="size-6" /> {busy === 'bus' ? 'Creating…' : 'Phones only (bus mode)'}
        </Chunk>
        <p className="text-center text-[0.95rem] text-muted-foreground">3 to 12 players. Bring headphones for bus mode.</p>
        <button className="mx-auto block min-h-11 text-sm text-muted-foreground underline" onClick={() => navigate('/solo')}>
          Solo test: play every seat yourself
        </button>
      </section>
    </Screen>
  )
}

function Sparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" fill="currentColor" />
    </svg>
  )
}
