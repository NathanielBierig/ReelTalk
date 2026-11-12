import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Crown, Play } from 'lucide-react'
import { Avatar, Kicker, Screen, Timer, TopBar } from '@/components/bits'
import { Composer } from '@/components/Composer'
import { AnswerBody } from '@/components/MediaAnswer'
import { WatchButton, reelUrl } from '@/components/ReelCard'
import { useCountdown } from '@/lib/room'
import { cn } from '@/lib/utils'
import type { ClientMsg, RoomView } from '../../shared/types'

type Props = { state: RoomView; send: (m: ClientMsg) => void; offset: number }

function RoundLabel({ state }: { state: RoomView }) {
  const r = state.round!
  return <span className="font-display text-xs font-extrabold text-muted-foreground">R{r.index + 1}/{r.total}</span>
}

export function PhoneAnswer({ state, send, offset }: Props) {
  const r = state.round!
  const secs = useCountdown(state.deadline, offset)
  const judge = state.players.find(p => p.id === r.judgeId)
  const amJudge = r.judgeId === state.you.id
  const [editing, setEditing] = useState(!r.myAnswerId)
  const locked = !!r.myAnswerId && !editing
  const showReelOnPhone = state.mode === 'bus' || amJudge

  return (
    <Screen>
      <TopBar code={state.code} label={<RoundLabel state={state} />} />
      <Timer secs={secs} total={state.settings.answerSecs} />

      {amJudge ? (
        <section className="sticker flex flex-col items-center gap-4 p-6 text-center">
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>
            <Crown className="size-16 text-acid" />
          </motion.div>
          <p className="font-display text-2xl">Your reel!</p>
          <p className="text-lg text-muted-foreground">You're the judge this round. Sit back while they write.</p>
          <p className="font-display text-4xl font-black">
            {r.answeredCount}<span className="text-muted-foreground">/{r.answererCount}</span>
          </p>
          <Kicker>answers in</Kicker>
          {showReelOnPhone && <WatchButton code={r.reelCode} />}
        </section>
      ) : (
        <>
          <section className="flex items-center gap-3">
            {judge && <Avatar p={judge} size={36} />}
            <p className="text-lg"><b style={{ color: judge?.color }}>{r.judgeName}</b> sent this reel and is judging.</p>
          </section>

          {state.mode === 'bus'
            ? <WatchButton code={r.reelCode} />
            : <p className="sticker p-4 text-center text-lg font-semibold">👀 Watch the big screen</p>}

          {locked ? (
            <motion.section
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="sticker space-y-3 border-mint/50 p-5 text-center"
            >
              <Check className="mx-auto size-12 text-acid" />
              <p className="font-display text-xl">Locked in</p>
              <AnswerBody text={r.myAnswer ?? ''} media={r.myAnswerMedia} className="rounded-2xl bg-night p-4" />
              <p className="text-sm text-muted-foreground">{r.answeredCount}/{r.answererCount} answered</p>
              <button onClick={() => setEditing(true)} className="text-sm font-semibold underline underline-offset-4">Change it</button>
            </motion.section>
          ) : (
            <Composer
              state={state}
              send={send}
              onSent={() => setEditing(false)}
              initialText={r.myAnswer ?? ''}
              initialMedia={r.myAnswerMedia}
            />
          )}
        </>
      )}
    </Screen>
  )
}

export function PhoneJudge({ state, send, offset }: Props) {
  const r = state.round!
  const secs = useCountdown(state.deadline, offset)
  const amJudge = r.judgeId === state.you.id
  const chosen = amJudge ? r.myPick : r.myVote
  const answers = r.answers ?? []
  const spectator = !amJudge && !r.myAnswerId && answers.length === 0

  return (
    <Screen>
      <TopBar code={state.code} label={<RoundLabel state={state} />} />
      <Timer secs={secs} total={state.settings.judgeSecs} />
      <header className="space-y-1">
        <p className="display-title text-3xl">
          {amJudge ? <>Pick the <span className="text-acid">winner</span></> : <>Vote your <span className="text-pink">fave</span></>}
        </p>
        <p className="text-muted-foreground">
          {amJudge
            ? 'Tap the one that made you laugh. Worth 1 point.'
            : r.audienceBonus
              ? `${r.judgeName} is picking. The crowd favorite also gets +1.`
              : `${r.judgeName} is picking. Your vote is just for bragging rights.`}
        </p>
      </header>

      <a
        href={reelUrl(r.reelCode)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 self-start rounded-full bg-panel-2 px-4 py-2 text-sm font-semibold"
      >
        <Play className="size-4 fill-ink" /> Rewatch {r.judgeName}'s reel
      </a>

      {!spectator && (
        <ul className="space-y-3">
          {answers.map((a, i) => {
            const mine = a.id === r.myAnswerId
            const on = chosen === a.id
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, y: 24, rotate: i % 2 ? 1.5 : -1.5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 380, damping: 24 }}
              >
                <button
                  disabled={mine}
                  onClick={() => send(amJudge ? { t: 'pick', answerId: a.id } : { t: 'vote', answerId: a.id })}
                  className={cn(
                    'relative w-full rounded-[22px] border-[1.5px] p-5 text-left text-xl font-semibold leading-snug transition-all active:scale-[0.98]',
                    on ? 'border-acid bg-acid text-night font-bold shadow-[0_0_0_5px_rgb(254_218_117/0.15),0_0_30px_rgb(254_218_117/0.3)]' : 'border-white/16 bg-panel hover:border-white/40',
                    mine && 'opacity-50',
                  )}
                  aria-pressed={on}
                >
                  <AnswerBody text={a.text} media={a.media} />
                  {mine && <span className="mt-2 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">yours</span>}
                  {on && <Check className="absolute right-4 top-4 size-6" />}
                </button>
              </motion.li>
            )
          })}
        </ul>
      )}

      <p className="mt-auto text-center text-sm text-muted-foreground">
        {r.judgePicked ? `${r.judgeName} has picked. ` : `Waiting on ${r.judgeName}. `}
        {r.votedCount}/{r.voterCount} votes in
      </p>
    </Screen>
  )
}
