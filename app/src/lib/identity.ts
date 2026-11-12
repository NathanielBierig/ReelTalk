// A stable per-device id so refreshes and app switches (Instagram -> back to Safari) keep your seat.
// Solo test mode: `?seat=p1` gives a tab or frame its own identity, so one person can be every player.
const mem: Record<string, string> = {}

export function store(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value)
    return localStorage.getItem(key)
  } catch {
    if (value !== undefined) mem[key] = value
    return mem[key] ?? null
  }
}

// Read once at load, so in-app navigation (which drops the query string) keeps the same seat.
const SEAT = (() => {
  try {
    const s = new URLSearchParams(location.search).get('seat') ?? ''
    return /^[a-z0-9]{1,8}$/i.test(s) ? s.toLowerCase() : ''
  } catch {
    return ''
  }
})()

const seatKey = (key: string, seat: string) => (seat ? `${key}:${seat}` : key)

export function clientIdFor(seat: string): string {
  const key = seatKey('rt:cid', seat)
  let id = store(key)
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    store(key, id)
  }
  return id
}

export function clientId(): string {
  return clientIdFor(SEAT)
}

export function savedName(): string {
  return store(seatKey('rt:name', SEAT)) ?? (SEAT && SEAT !== 'tv' ? SEAT.toUpperCase() : '')
}

export function saveName(name: string) {
  store(seatKey('rt:name', SEAT), name)
}
