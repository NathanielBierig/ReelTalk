import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Avatar, Chunk, Kicker, Logo, Screen } from '@/components/bits'
import { saveName, savedName } from '@/lib/identity'
import { LIMITS, type ClientMsg, type RoomView } from '../../shared/types'

export default function Join({ state, send }: { state: RoomView; send: (m: ClientMsg) => void }) {
  const [name, setName] = useState(savedName())
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    saveName(n)
    send({ t: 'join', name: n })
  }
  const others = state.players.slice(0, 8)
  return (
    <Screen className="justify-center">
      <Logo />
      <form onSubmit={submit} className="sticker space-y-4 p-5">
        <Kicker>Joining room <span className="text-acid">{state.code}</span></Kicker>
        <label htmlFor="name" className="block font-display text-2xl font-extrabold">What do we call you?</label>
        <Input
          id="name"
          value={name}
          maxLength={LIMITS.nameChars}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="nickname"
          enterKeyHint="go"
          className="h-16 rounded-2xl border-2 bg-night px-4 text-2xl font-semibold"
        />
        <Chunk type="submit" color="acid" disabled={!name.trim()}>
          {state.you.isHost ? "Let's go" : 'Join game'}
        </Chunk>
      </form>
      {others.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-3">{others.map(p => <Avatar key={p.id} p={p} size={36} />)}</div>
          <span className="text-sm text-muted-foreground">{state.players.length} already in</span>
        </div>
      )}
    </Screen>
  )
}
