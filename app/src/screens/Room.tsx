import { AnimatePresence } from 'motion/react'
import { Loader2, WifiOff } from 'lucide-react'
import { Chunk, Logo, Screen } from '@/components/bits'
import { useRoom } from '@/lib/room'
import { navigate } from '../App'
import Join from './Join'
import { PhoneLobby } from './PhoneLobby'
import { PhoneAnswer, PhoneJudge } from './PhoneRound'
import { Reveal, Final } from './Results'
import Display from './Display'
import { ChatBar } from '@/components/Chat'

export default function Room({ code }: { code: string }) {
  const { state, conn, send, offset, chats } = useRoom(code)

  if (conn === 'missing') {
    return (
      <Screen className="justify-center text-center">
        <Logo />
        <p className="text-2xl font-semibold">No room called <b className="text-acid">{code}</b>.</p>
        <Chunk color="acid" onClick={() => navigate('/')}>Back home</Chunk>
      </Screen>
    )
  }
  if (conn === 'kicked') {
    return (
      <Screen className="justify-center text-center">
        <p className="text-2xl font-semibold">The host removed you from this room.</p>
        <Chunk color="acid" onClick={() => navigate('/')}>Back home</Chunk>
      </Screen>
    )
  }
  if (!state) {
    return (
      <Screen className="items-center justify-center">
        <Loader2 className="size-10 animate-spin text-acid" />
        <p className="font-display font-bold">Joining {code}…</p>
      </Screen>
    )
  }

  const isDisplay = state.mode === 'party' && state.you.isHost && !state.you.isPlayer
  const offline = conn !== 'open' && (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-pink py-1.5 text-sm font-bold text-white">
      <WifiOff className="size-4" /> Reconnecting…
    </div>
  )

  if (isDisplay) return <>{offline}<Display state={state} send={send} offset={offset} chats={chats} /></>

  const chat = <ChatBar chats={chats} players={state.players} send={send} />
  let screen: React.ReactNode
  if (!state.you.isPlayer) {
    screen = state.phase === 'lobby' || state.phase === 'submit'
      ? <Join key="join" state={state} send={send} />
      : (
        <Screen key="late" className="justify-center text-center">
          <Logo />
          <p className="text-xl font-semibold">This game already started. Hang tight for the next one!</p>
        </Screen>
      )
  } else {
    switch (state.phase) {
      case 'lobby':
      case 'submit': screen = <PhoneLobby key="lobby" state={state} send={send} />; break
      case 'answer': screen = <PhoneAnswer key={`a${state.round?.index}`} state={state} send={send} offset={offset} />; break
      case 'judge': screen = <PhoneJudge key={`j${state.round?.index}`} state={state} send={send} offset={offset} />; break
      case 'reveal': screen = <Reveal key={`r${state.round?.index}`} state={state} send={send} offset={offset} chat={chat} />; break
      case 'final': screen = <Final key="final" state={state} send={send} chat={chat} />; break
    }
  }

  return (
    <>
      {offline}
      <AnimatePresence mode="wait">{screen}</AnimatePresence>
    </>
  )
}
