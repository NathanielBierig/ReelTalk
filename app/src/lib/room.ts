import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ChatMsg, ClientMsg, RoomView, ServerMsg } from '../../shared/types'
import { clientId } from './identity'

export type ConnState = 'connecting' | 'open' | 'closed' | 'missing' | 'kicked'

/** Live room connection: auto-reconnects (bus tunnels, app switches), tracks server clock offset. */
export function useRoom(code: string) {
  const [state, setState] = useState<RoomView | null>(null)
  const [conn, setConn] = useState<ConnState>('connecting')
  const [offset, setOffset] = useState(0)
  const [chats, setChats] = useState<ChatMsg[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const retry = useRef(0)
  const stopped = useRef(false)

  useEffect(() => {
    stopped.current = false
    let timer: number | undefined
    let ping: number | undefined

    const connect = async () => {
      if (stopped.current) return
      setConn('connecting')
      // Check the room exists before opening a socket (gives a clean "no such room" screen).
      try {
        const res = await fetch(`/api/rooms/${code}`)
        const body = (await res.json()) as { exists: boolean }
        if (!body.exists) { setConn('missing'); return }
      } catch { /* offline: fall through and let the socket retry */ }
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${location.host}/api/rooms/${code}/ws?cid=${clientId()}`)
      wsRef.current = ws
      ws.onopen = () => {
        retry.current = 0
        setConn('open')
        ping = window.setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'ping' })), 25000)
      }
      ws.onmessage = ev => {
        const msg = JSON.parse(ev.data) as ServerMsg
        if (msg.t === 'state') {
          setOffset(msg.state.serverNow - Date.now())
          setState(prev => {
            // New phase = new screen: clear stale toasts so they don't cover it.
            if (prev && prev.phase !== msg.state.phase) toast.dismiss()
            return msg.state
          })
        } else if (msg.t === 'chat') {
          setChats(prev => [...prev.slice(-29), msg.chat])
        } else if (msg.t === 'error') {
          toast.error(msg.message)
        } else if (msg.t === 'toast') {
          if (msg.kind === 'warn') toast.warning(msg.message)
          else toast.success(msg.message)
        }
      }
      ws.onclose = ev => {
        window.clearInterval(ping)
        if (wsRef.current !== ws) return
        if (ev.code === 4001) { setConn('kicked'); return }
        if (ev.code === 4000) return // replaced by a newer tab
        setConn('closed')
        if (stopped.current) return
        const delay = Math.min(8000, 400 * 2 ** retry.current++)
        timer = window.setTimeout(connect, delay)
      }
    }

    connect()
    // Coming back from Instagram: reconnect immediately instead of waiting for backoff.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState !== WebSocket.OPEN) {
        window.clearTimeout(timer)
        retry.current = 0
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped.current = true
      window.clearTimeout(timer)
      window.clearInterval(ping)
      document.removeEventListener('visibilitychange', onVisible)
      wsRef.current?.close()
    }
  }, [code])

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    else toast.error('Reconnecting… try again in a sec')
  }, [])

  return { state, conn, send, offset, chats }
}

/** Seconds left until a server deadline, ticking. */
export function useCountdown(deadline: number | undefined, offset: number) {
  const [now, setNow] = useState(() => Date.now() + offset)
  useEffect(() => {
    if (!deadline) return
    const id = window.setInterval(() => setNow(Date.now() + offset), 250)
    return () => window.clearInterval(id)
  }, [deadline, offset])
  if (!deadline) return null
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}
