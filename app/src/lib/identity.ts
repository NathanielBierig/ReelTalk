// A stable per-device id so refreshes and app switches (Instagram -> back to Safari) keep your seat.
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

export function clientId(): string {
  let id = store('rt:cid')
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    store('rt:cid', id)
  }
  return id
}

export function savedName(): string {
  return store('rt:name') ?? ''
}
