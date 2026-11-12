import { useState } from 'react'
import { motion } from 'motion/react'
import { Bus, Tv } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Chunk, Kicker, Logo, Screen } from '@/components/bits'
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
      <section className="pt-8">
        <motion.div initial={{ rotate: -6, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <Logo size="md" />
        </motion.div>
        <p className="mt-5 text-xl font-semibold leading-snug text-ink/90">
          Your friends' reels are the cards.
          <br />
          <span className="text-muted-foreground">Write the funniest take. The reel's owner judges.</span>
        </p>
      </section>

      <form onSubmit={join} className="sticker space-y-3 p-4">
        <Kicker>Got a code?</Kicker>
        <div className="flex gap-3">
          <Input
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase())}
            placeholder="ABCD"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Room code"
            className="h-16 flex-1 rounded-2xl border-2 bg-night text-center font-display text-3xl font-black tracking-[0.35em] placeholder:text-ink/20"
          />
          <Chunk type="submit" color="acid" className="w-auto px-6" disabled={code.length !== 4}>
            Join
          </Chunk>
        </div>
      </form>

      <section className="space-y-4">
        <Kicker>Start a game</Kicker>
        <Chunk color="pink" onClick={() => create('party')} disabled={!!busy}>
          <Tv className="size-6" /> {busy === 'party' ? 'Creating…' : 'Host on a TV / laptop'}
        </Chunk>
        <Chunk color="volt" onClick={() => create('bus')} disabled={!!busy}>
          <Bus className="size-6" /> {busy === 'bus' ? 'Creating…' : 'Phones only (bus mode)'}
        </Chunk>
        <p className="text-center text-sm text-muted-foreground">3–12 players. Bring headphones for bus mode.</p>
        <button className="mx-auto block text-sm text-muted-foreground underline" onClick={() => navigate('/solo')}>
          Solo test: play every seat yourself
        </button>
      </section>
    </Screen>
  )
}
