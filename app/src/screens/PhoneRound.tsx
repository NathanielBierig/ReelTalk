import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Crown, Send as SendIcon } from 'lucide-react'
import { Avatar, Chunk, Kicker, Screen, Timer, TopBar } from '@/components/bits'
import { WatchButton } from '@/components/ReelCard'
import { useCountdown } from '@/lib/room'
import { cn } from '@/lib/utils'
import { LIMITS, type ClientMsg, type RoomView } from '../../shared/types'

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
  const [text, setText] = useState(r.myAnswer ?? '')
  const [editing, setEditing] = useState(!r.myAnswer)
  const locked = !!r.myAnswer && !editing
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
          <p className="font-display text-2xl font-black uppercase">Your reel!</p>
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
              <Check className="mx-auto size-12 text-mint" />
              <p className="font-display text-xl font-black uppercase">Locked in</p>
              <p className="rounded-2xl bg-night p-4 text-xl font-semibold">“{r.myAnswer}”</p>
              <p className="text-sm text-muted-foreground">{r.answeredCount}/{r.answererCount} answered</p>
              <button onClick={() => setEditing(true)} className="text-sm font-semibold underline underline-offset-4">Change it</button>
            </motion.section>
          ) : (
            <form
              className="sticker space-y-3 p-4"
              onSubmit={e => {
                e.preventDefault()
                if (!text.trim()) return
                send({ t: 'answer', text })
                setEditing(false)
              }}
            >
              <Kicker>Describe this reel. Make {r.judgeName} laugh.</Kicker>
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, LIMITS.answerChars))}
                rows={3}
                placeholder="me when the group chat goes quiet…"
                enterKeyHint="send"
                aria-label="Your answer"
                className="w-full resize-none rounded-2xl border-2 border-input bg-night p-4 text-xl font-semibold leading-snug outline-none focus:border-acid"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ;(e.currentTarget.form as HTMLFormElement).requestSubmit()
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <span className={cn('font-display text-sm font-bold tabular-nums', text.length > LIMITS.answerChars - 10 ? 'text-pink' : 'text-muted-foreground')}>
                  {LIMITS.answerChars - text.length}
                </span>
                <Chunk type="submit" color="acid" className="w-auto px-8" disabled={!text.trim()}>
                  <SendIcon className="size-5" /> Send
                </Chunk>
              </div>
            </form>
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
                    'relative w-full rounded-3xl border-[3px] p-5 text-left text-xl font-semibold leading-snug transition-all active:scale-[0.98]',
                    on ? 'border-acid bg-acid text-night shadow-[0_6px_0_0_var(--ink)]' : 'border-ink/15 bg-panel hover:border-ink/40',
                    mine && 'opacity-50',
                  )}
                  aria-pressed={on}
                >
                  “{a.text}”
                  {mine && <span className="mt-2 block font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">yours</span>}
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
