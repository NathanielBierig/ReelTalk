import { useEffect } from 'react'
import { motion } from 'motion/react'
import confetti from 'canvas-confetti'
import { Crown, Flame, Home, RotateCcw, SkipForward } from 'lucide-react'
import { Avatar, Chunk, Kicker, Logo, Screen, Timer, TopBar } from '@/components/bits'
import { AnswerBody } from '@/components/MediaAnswer'
import { useCountdown } from '@/lib/room'
import { cn } from '@/lib/utils'
import { navigate } from '../App'
import type { ClientMsg, PublicPlayer, RoomView } from '../../shared/types'
import { LIMITS } from '../../shared/types'

type Props = { state: RoomView; send: (m: ClientMsg) => void; offset?: number; big?: boolean }

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function burst(colors: string[], power = 1) {
  if (reduced()) return
  confetti({ particleCount: Math.round(140 * power), spread: 90, startVelocity: 45, origin: { y: 0.7 }, colors, disableForReducedMotion: true })
}

export function Reveal({ state, send, offset = 0, big }: Props) {
  const r = state.round!
  const reveal = r.reveal ?? []
  const secs = useCountdown(state.deadline, offset)
  const byId = new Map(state.players.map(p => [p.id, p]))
  const iWon = reveal.find(a => a.playerId === state.you.id && a.points > 0)

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (iWon) burst(['#E9FF3B', '#FF2E88', '#3D6BFF'], 1.2)
      else if (big && reveal.some(a => a.judgePick)) burst(['#E9FF3B', '#FF2E88'], 0.8)
    }, 450 + reveal.length * 120)
    return () => window.clearTimeout(t)
    // Only on mount of this round's reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const standings = [...state.players].sort((a, b) => b.score - a.score)
  const canSkip = state.you.isHost

  return (
    <Screen className={cn(big && 'max-w-6xl')}>
      {!big && <TopBar code={state.code} label={<span className="font-display text-xs font-extrabold text-muted-foreground">R{r.index + 1}/{r.total}</span>} />}
      <header className={cn('flex items-end justify-between gap-4', big && 'pt-6')}>
        <div>
          <Kicker>{r.judgeName}'s reel</Kicker>
          <p className={cn('display-title', big ? 'text-7xl' : 'text-4xl')}>The <span className="text-acid">verdict</span></p>
        </div>
        {iWon && !big && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, -8, 8, 0] }} transition={{ delay: 0.8 }} className="rounded-2xl bg-acid px-3 py-2 font-display text-2xl font-black text-night">
            +{iWon.points}
          </motion.span>
        )}
      </header>

      {reveal.length === 0 && <p className="sticker p-6 text-center text-xl">Nobody answered. Brutal. 💀</p>}

      <div className={cn(big ? 'grid grid-cols-2 items-start gap-5' : 'space-y-3')}>
        {reveal.map((a, i) => {
          const p = byId.get(a.playerId)
          const win = a.judgePick
          return (
            <motion.article
              key={a.playerId}
              initial={{ opacity: 0, scale: 0.7, rotate: i % 2 ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 320, damping: 18 }}
              className={cn(
                'relative rounded-3xl border-[3px] p-5',
                win ? 'border-acid bg-acid text-night shadow-[0_8px_0_0_var(--pink)]' : a.audienceWin ? 'border-pink bg-panel' : 'border-ink/10 bg-panel',
                big && 'p-7',
              )}
            >
              <AnswerBody text={a.text} media={a.media} big={big} />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {p && <Avatar p={p} size={big ? 40 : 30} />}
                <span className={cn('font-display font-extrabold', big ? 'text-xl' : 'text-base')}>{p?.name ?? 'someone'}</span>
                <span className="flex-1" />
                {win && <Tag className="bg-night text-acid"><Crown className="size-4" /> Judge's pick</Tag>}
                {a.audienceWin && <Tag className={win ? 'bg-pink text-white' : 'bg-pink/20 text-pink'}><Flame className="size-4" /> Crowd fave</Tag>}
                {!a.audienceWin && a.votes > 0 && <Tag className={win ? 'bg-night/10' : 'bg-panel-2'}>{a.votes} vote{a.votes > 1 ? 's' : ''}</Tag>}
              </div>
              {a.points > 0 && (
                <motion.span
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 500, damping: 12 }}
                  className="absolute -right-2 -top-3 rounded-xl bg-pink px-2.5 py-1 font-display text-lg font-black text-white shadow-[0_4px_0_0_var(--night)]"
                >
                  +{a.points}
                </motion.span>
              )}
            </motion.article>
          )
        })}
      </div>

      {!r.audienceBonus && state.players.length < LIMITS.audienceBonusMinPlayers && (
        <p className="text-center text-xs text-muted-foreground">Crowd-fave bonus unlocks with {LIMITS.audienceBonusMinPlayers}+ players.</p>
      )}

      <Standings players={standings} big={big} me={state.you.id} />

      <div className="mt-auto space-y-3">
        <Timer secs={secs} total={LIMITS.revealSecs} big={big} />
        {canSkip && (
          <Chunk color="ink" onClick={() => send({ t: 'next' })} className={cn(big && 'max-w-sm self-center')}>
            <SkipForward className="size-5" /> {r.index + 1 >= r.total ? 'Final results' : 'Next reel'}
          </Chunk>
        )}
      </div>
    </Screen>
  )
}

function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-xs font-extrabold uppercase', className)}>{children}</span>
}

function Standings({ players, big, me }: { players: PublicPlayer[]; big?: boolean; me: string }) {
  return (
    <section className="space-y-2">
      <Kicker>Scores</Kicker>
      <motion.ol layout className={cn('flex flex-wrap gap-2', big && 'gap-3')}>
        {players.map((p, i) => (
          <motion.li
            layout
            key={p.id}
            className={cn('flex items-center gap-2 rounded-full bg-panel-2 py-1 pl-1 pr-3', p.id === me && 'ring-2 ring-acid')}
          >
            <Avatar p={p} size={big ? 34 : 26} />
            <span className={cn('font-semibold', big && 'text-lg')}>{i === 0 && p.score > 0 ? '👑 ' : ''}{p.name}</span>
            <span className="font-display font-black tabular-nums">{p.score}</span>
          </motion.li>
        ))}
      </motion.ol>
    </section>
  )
}

export function Final({ state, send, big }: Props) {
  const ranked = [...state.players].sort((a, b) => b.score - a.score)
  const top = ranked[0]
  const winners = ranked.filter(p => p.score === top?.score && p.score > 0)
  const podium = [ranked[1], ranked[0], ranked[2]]
  const heights = big ? ['h-40', 'h-56', 'h-28'] : ['h-24', 'h-32', 'h-16']

  useEffect(() => {
    const colors = winners.map(w => w.color).concat('#E9FF3B')
    burst(colors, 1.5)
    const t = window.setTimeout(() => burst(colors, 1), 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Screen className={cn('items-center text-center', big && 'max-w-5xl justify-center')}>
      <Logo size={big ? 'md' : 'sm'} />
      <Kicker className="pt-4">And the winner is</Kicker>
      <motion.p
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.3 }}
        className={cn('display-title', big ? 'text-8xl' : 'text-5xl')}
        style={{ color: top?.color }}
      >
        {winners.length > 1 ? winners.map(w => w.name).join(' & ') : (top?.name ?? '???')}
      </motion.p>

      <div className="flex w-full items-end justify-center gap-3 pt-6">
        {podium.map((p, i) => p && (
          <motion.div
            key={p.id}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 + [1, 0, 2][i] * 0.2, type: 'spring', stiffness: 200, damping: 16 }}
            className="flex w-28 flex-col items-center gap-2"
          >
            <Avatar p={p} size={big ? 72 : 52} ring={i === 1} />
            <span className="max-w-full truncate font-semibold">{p.name}</span>
            <div className={cn('flex w-full items-start justify-center rounded-t-2xl pt-2 font-display text-3xl font-black text-night', heights[i])} style={{ background: p.color }}>
              {p.score}
            </div>
          </motion.div>
        ))}
      </div>

      {ranked.length > 3 && (
        <ol className="w-full max-w-md space-y-1 text-left">
          {ranked.slice(3).map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl bg-panel px-3 py-2">
              <span className="w-6 font-display font-black text-muted-foreground">{i + 4}</span>
              <Avatar p={p} size={28} />
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-display font-black">{p.score}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-auto w-full max-w-md space-y-3 pt-6">
        {state.you.isHost ? (
          <Chunk color="acid" onClick={() => send({ t: 'playAgain' })}><RotateCcw className="size-5" /> Play again (same crew)</Chunk>
        ) : (
          <p className="text-muted-foreground">The host can start another round.</p>
        )}
        <Chunk color="ghost" onClick={() => navigate('/')}><Home className="size-5" /> Home</Chunk>
      </div>
    </Screen>
  )
}
