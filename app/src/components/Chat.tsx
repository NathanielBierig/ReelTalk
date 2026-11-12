// Live chat: phones type between rounds and on the podium; the TV floats it over the stage.
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Send } from 'lucide-react'
import { Avatar } from '@/components/bits'
import { cn } from '@/lib/utils'
import { LIMITS, QUICK_REACTS, type ChatMsg, type ClientMsg, type PublicPlayer } from '../../shared/types'

const TV_SECS = 9

/** Re-renders every second so old lines fade out on their own. */
function useNow(offset: number) {
  const [now, setNow] = useState(() => Date.now() + offset)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000)
    return () => window.clearInterval(id)
  }, [offset])
  return now
}

function Line({ c, players, big }: { c: ChatMsg; players: PublicPlayer[]; big?: boolean }) {
  const p = players.find(x => x.id === c.playerId)
  const emojiOnly = /^\p{Extended_Pictographic}+$/u.test(c.text.replace(/\s/g, ''))
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: big ? 60 : 0, y: big ? 0 : 12, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={cn('flex items-center gap-2 rounded-2xl bg-panel/95 shadow-lg backdrop-blur', big ? 'gap-3 px-4 py-3' : 'px-3 py-2')}
    >
      {p && <Avatar p={p} size={big ? 40 : 24} />}
      <span className={cn('font-display font-extrabold', big ? 'text-xl' : 'text-sm')} style={{ color: p?.color }}>{p?.name ?? '?'}</span>
      <span className={cn('min-w-0 break-words font-semibold', big ? (emojiOnly ? 'text-4xl' : 'text-2xl') : (emojiOnly ? 'text-2xl' : 'text-base'))}>{c.text}</span>
    </motion.li>
  )
}

/** TV: the last few lines float bottom-right and fade after a few seconds. */
export function ChatOverlay({ chats, players, offset }: { chats: ChatMsg[]; players: PublicPlayer[]; offset: number }) {
  const now = useNow(offset)
  const live = chats.filter(c => now - c.at < TV_SECS * 1000).slice(-6)
  return (
    <ul aria-live="polite" className="pointer-events-none fixed bottom-6 right-6 z-40 flex w-[min(34rem,40vw)] flex-col items-end gap-2">
      <AnimatePresence initial={false}>
        {live.map(c => <Line key={c.id} c={c} players={players} big />)}
      </AnimatePresence>
    </ul>
  )
}

/** Phone: recent lines, one-tap reactions and a short text box. */
export function ChatBar({ chats, players, send }: { chats: ChatMsg[]; players: PublicPlayer[]; send: (m: ClientMsg) => void }) {
  const [text, setText] = useState('')
  const say = (t: string) => {
    const v = t.trim()
    if (!v) return
    send({ t: 'chat', text: v })
    setText('')
  }
  return (
    <section className="sticker space-y-2 p-3" aria-label="Chat">
      <ul className="flex max-h-40 flex-col justify-end gap-1.5 overflow-hidden">
        <AnimatePresence initial={false}>
          {chats.slice(-3).map(c => <Line key={c.id} c={c} players={players} />)}
        </AnimatePresence>
      </ul>
      <div className="flex gap-1.5">
        {QUICK_REACTS.map(e => (
          <button key={e} type="button" onClick={() => say(e)} className="h-11 flex-1 rounded-xl bg-panel-2 text-2xl active:scale-90" aria-label={`Send ${e}`}>{e}</button>
        ))}
      </div>
      <form onSubmit={ev => { ev.preventDefault(); say(text) }} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={LIMITS.chatChars}
          placeholder="Talk your trash…"
          aria-label="Chat message"
          enterKeyHint="send"
          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-panel-2 bg-night px-3 text-base font-semibold outline-none focus:border-acid"
        />
        <button type="submit" disabled={!text.trim()} className="grid size-11 place-items-center rounded-xl bg-acid text-night disabled:opacity-40" aria-label="Send chat">
          <Send className="size-5" />
        </button>
      </form>
    </section>
  )
}
