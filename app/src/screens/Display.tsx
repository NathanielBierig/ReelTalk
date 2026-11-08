import { AnimatePresence, motion } from 'motion/react'
import { Crown, Users } from 'lucide-react'
import { Avatar, Chunk, Kicker, Logo, Timer } from '@/components/bits'
import { QR, joinUrl } from '@/components/QR'
import { ReelEmbed } from '@/components/ReelCard'
import { useCountdown } from '@/lib/room'
import { cn } from '@/lib/utils'
import { ReelDots, SettingsRows, startBlocker } from './PhoneLobby'
import { Final, Reveal } from './Results'
import type { ClientMsg, RoomView } from '../../shared/types'

type Props = { state: RoomView; send: (m: ClientMsg) => void; offset: number }

/** The big shared screen (TV / laptop) in party mode. Not a player, just the stage. */
export default function Display(props: Props) {
  const { state } = props
  return (
    <AnimatePresence mode="wait">
      {state.phase === 'lobby' || state.phase === 'submit' ? <Lobby key="lobby" {...props} />
        : state.phase === 'answer' ? <Answer key={`a${state.round?.index}`} {...props} />
        : state.phase === 'judge' ? <Judging key={`j${state.round?.index}`} {...props} />
        : state.phase === 'reveal' ? <Reveal key={`r${state.round?.index}`} {...props} big />
        : <Final key="final" {...props} big />}
    </AnimatePresence>
  )
}

function Stage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.25 }}
      className={cn('mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-8 p-6 lg:p-10', className)}
    >
      {children}
    </motion.main>
  )
}

function Lobby({ state, send }: Props) {
  const blocker = startBlocker(state)
  const url = joinUrl(state.code).replace(/^https?:\/\//, '')
  return (
    <Stage>
      <header className="flex items-center justify-between">
        <Logo size="md" />
        <span className="flex items-center gap-2 text-xl font-semibold text-muted-foreground"><Users className="size-6" /> {state.players.length} / 12</span>
      </header>
      <div className="grid flex-1 gap-10 lg:grid-cols-[auto_1fr]">
        <section className="flex flex-col items-center gap-5">
          <QR code={state.code} size={300} />
          <div className="text-center">
            <Kicker>Scan to join, or go to</Kicker>
            <p className="mt-1 text-lg font-semibold">{url}</p>
            <p className="display-title mt-3 text-8xl tracking-[0.12em] text-acid">{state.code}</p>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="sticker flex-1 p-6">
            <Kicker>Who's in</Kicker>
            {state.players.length === 0 && <p className="mt-6 text-3xl font-semibold text-muted-foreground">Waiting for the first brave soul…</p>}
            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
              <AnimatePresence>
                {state.players.map(p => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0, opacity: p.connected ? 1 : 0.4 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                    className="flex items-center gap-3 rounded-2xl bg-panel-2 p-3"
                  >
                    <Avatar p={p} size={52} />
                    <div className="min-w-0">
                      <p className="truncate text-xl font-bold">{p.name}</p>
                      <ReelDots have={p.reelCount} need={state.settings.reelsPerPlayer} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
            <div className="sticker p-5"><SettingsRows state={state} send={send} big /></div>
            <div className="flex flex-col justify-end gap-2">
              <Chunk color="pink" className="min-h-20 px-10 text-xl" disabled={!!blocker} onClick={() => send({ t: 'startGame' })}>
                {blocker ?? 'Start the game'}
              </Chunk>
              <p className="text-center text-sm text-muted-foreground">Players add reels from their phones</p>
            </div>
          </div>
        </section>
      </div>
    </Stage>
  )
}

function RoundHead({ state }: { state: RoomView }) {
  const r = state.round!
  const judge = state.players.find(p => p.id === r.judgeId)
  return (
    <div className="flex items-center gap-4">
      {judge && <Avatar p={judge} size={64} ring />}
      <div>
        <Kicker>Reel {r.index + 1} of {r.total}</Kicker>
        <p className="font-display text-3xl font-black"><span style={{ color: judge?.color }}>{r.judgeName}</span> sent this</p>
      </div>
    </div>
  )
}

function Answer({ state, offset }: Props) {
  const r = state.round!
  const secs = useCountdown(state.deadline, offset)
  return (
    <Stage className="lg:flex-row lg:items-stretch">
      <section className="flex justify-center lg:w-[42%]">
        <ReelEmbed code={r.reelCode} status={r.reelStatus} />
      </section>
      <section className="flex flex-1 flex-col justify-center gap-8">
        <RoundHead state={state} />
        <p className="display-title text-6xl xl:text-7xl">
          Describe <span className="text-pink">this</span>.<br />Make <span className="text-acid">{r.judgeName}</span> laugh.
        </p>
        <Timer secs={secs} total={state.settings.answerSecs} big />
        <div className="flex items-center gap-4">
          <p className="font-display text-6xl font-black tabular-nums">{r.answeredCount}<span className="text-muted-foreground">/{r.answererCount}</span></p>
          <p className="text-2xl font-semibold text-muted-foreground">answers in</p>
        </div>
      </section>
    </Stage>
  )
}

function Judging({ state, offset }: Props) {
  const r = state.round!
  const secs = useCountdown(state.deadline, offset)
  const answers = r.answers ?? []
  return (
    <Stage>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <RoundHead state={state} />
        <div className="text-right">
          <p className="flex items-center justify-end gap-2 font-display text-2xl font-black">
            <Crown className="size-7 text-acid" /> {r.judgePicked ? `${r.judgeName} picked!` : `${r.judgeName} is choosing…`}
          </p>
          <p className="text-lg text-muted-foreground">{r.votedCount}/{r.voterCount} crowd votes</p>
        </div>
      </header>
      <Timer secs={secs} total={state.settings.judgeSecs} big />
      <div className="grid flex-1 content-start gap-5 md:grid-cols-2">
        {answers.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 40, rotate: i % 2 ? 3 : -3 }}
            animate={{ opacity: 1, y: 0, rotate: i % 2 ? 0.6 : -0.6 }}
            transition={{ delay: i * 0.12, type: 'spring', stiffness: 260, damping: 20 }}
            className="rounded-3xl border-[3px] border-ink/15 bg-panel p-7 text-3xl font-semibold leading-snug"
          >
            “{a.text}”
          </motion.div>
        ))}
      </div>
    </Stage>
  )
}
