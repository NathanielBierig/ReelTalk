import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Search, Send as SendIcon, Smile, Type, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Chunk, Kicker } from '@/components/bits'
import { compressImage } from '@/lib/image'
import { clientId } from '@/lib/identity'
import { cn } from '@/lib/utils'
import { LIMITS, type ClientMsg, type GifResult, type Media, type RoomView } from '../../shared/types'

type Tab = 'text' | 'gif' | 'photo'

const GIF_CACHE = new Map<string, GifResult[]>()

/** Answer composer: write it, GIF it, or drop a reaction pic from your camera roll. */
export function Composer({ state, send, onSent, initialText = '', initialMedia }: {
  state: RoomView
  send: (m: ClientMsg) => void
  onSent: () => void
  initialText?: string
  initialMedia?: Media
}) {
  const r = state.round!
  const [tab, setTab] = useState<Tab>(initialMedia ? (initialMedia.kind === 'image' ? 'photo' : 'gif') : 'text')
  const [text, setText] = useState(initialText)
  const [media, setMedia] = useState<Media | undefined>(initialMedia)
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'text', label: 'Write', icon: <Type className="size-4" /> },
    ...(state.features.gifs ? [{ id: 'gif' as Tab, label: 'GIF', icon: <Smile className="size-4" /> }] : []),
    { id: 'photo', label: 'Photo', icon: <ImagePlus className="size-4" /> },
  ]
  const usingMedia = tab !== 'text' && media
  const canSend = usingMedia ? true : !!text.trim()

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!canSend) return
    send({ t: 'answer', text, media: usingMedia ? media : undefined })
    onSent()
  }

  return (
    <form className="sticker space-y-3 p-3" onSubmit={submit}>
      <div className="grid gap-1 rounded-2xl bg-night p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }} role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn('flex items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[0.95rem] font-semibold transition-colors',
              tab === t.id ? 'bg-brass text-night' : 'text-ink/60')}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'text' && (
        <>
          <Kicker className="px-1">Describe this reel. Make {r.judgeName} laugh.</Kicker>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, LIMITS.answerChars))}
            rows={3}
            placeholder="me when the group chat goes quiet…"
            enterKeyHint="send"
            aria-label="Your answer"
            className="w-full resize-none rounded-2xl border-2 border-input bg-night p-4 text-xl font-semibold leading-snug outline-none focus:border-brass"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
            }}
          />
        </>
      )}

      {tab === 'gif' && <GifPicker selected={media?.kind !== 'image' ? media : undefined} onPick={setMedia} />}
      {tab === 'photo' && <PhotoPicker code={state.code} selected={media?.kind === 'image' ? media : undefined} onPick={setMedia} />}

      {tab !== 'text' && (
        <Input
          value={text}
          onChange={e => setText(e.target.value.slice(0, LIMITS.answerChars))}
          placeholder="Add a caption (optional)"
          aria-label="Caption"
          enterKeyHint="send"
          className="h-12 rounded-xl border-2 bg-night text-base font-semibold"
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <span className={cn('px-1 font-display text-sm font-bold tabular-nums', text.length > LIMITS.answerChars - 10 ? 'text-rose' : 'text-muted-foreground')}>
          {LIMITS.answerChars - text.length}
        </span>
        <Chunk type="submit" color="brass" className="w-auto px-8" disabled={!canSend}>
          <SendIcon className="size-5" /> Send
        </Chunk>
      </div>
    </form>
  )
}

function GifPicker({ selected, onPick }: { selected?: Media; onPick: (m?: Media) => void }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'gifs' | 'stickers'>('gifs')
  const [results, setResults] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(false)
  const reqId = useRef(0)

  useEffect(() => {
    // GIPHY's free key allows ~100 searches/hour for the whole app: search only after a pause,
    // only for 2+ letters, and reuse anything already fetched this session.
    const term = q.trim().toLowerCase()
    if (term.length === 1) return
    const key = `${kind}:${term}`
    const cached = GIF_CACHE.get(key)
    if (cached) { setResults(cached); setLoading(false); return }
    const id = ++reqId.current
    setLoading(true)
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/gifs?type=${kind}&q=${encodeURIComponent(term)}`)
        const body = (await res.json()) as { results?: GifResult[] }
        if (body.results) GIF_CACHE.set(key, body.results)
        if (id === reqId.current) setResults(body.results ?? [])
      } catch {
        if (id === reqId.current) setResults([])
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    }, term ? 700 : 0)
    return () => window.clearTimeout(t)
  }, [q, kind])

  if (selected) {
    return (
      <div className="relative">
        <img src={selected.url} alt="Selected" className="mx-auto max-h-64 rounded-2xl" />
        <button type="button" onClick={() => onPick(undefined)} className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-night/80" aria-label="Pick a different one">
          <X className="size-5" />
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={kind === 'gifs' ? 'Search GIFs' : 'Search stickers'}
            aria-label="Search GIFs"
            enterKeyHint="search"
            className="h-11 rounded-xl border-2 bg-night pl-9 text-base"
          />
        </div>
        <button
          type="button"
          onClick={() => setKind(k => (k === 'gifs' ? 'stickers' : 'gifs'))}
          className="rounded-[10px] bg-panel-2 px-3 text-sm font-semibold"
        >
          {kind === 'gifs' ? 'Stickers' : 'GIFs'}
        </button>
      </div>
      <div className="h-72 overflow-y-auto overscroll-contain rounded-xl">
        {loading && results.length === 0 && <div className="grid h-full place-items-center"><Loader2 className="size-8 animate-spin text-brass" /></div>}
        {!loading && results.length === 0 && <p className="p-6 text-center text-muted-foreground">Nothing found. Try another word.</p>}
        <div className="columns-2 gap-2">
          {results.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => onPick({ kind: kind === 'gifs' ? 'gif' : 'sticker', url: g.url, w: g.w, h: g.h })}
              className="mb-2 block w-full overflow-hidden rounded-lg bg-panel-2"
              style={{ aspectRatio: `${g.w} / ${g.h}` }}
            >
              <img src={g.preview} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <p className="text-right text-xs text-muted-foreground">Powered by GIPHY</p>
    </div>
  )
}

function PhotoPicker({ code, selected, onPick }: { code: string; selected?: Media; onPick: (m?: Media) => void }) {
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const choose = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const { blob, w, h } = await compressImage(file)
      const res = await fetch(`/api/rooms/${code}/images?cid=${clientId()}`, {
        method: 'POST', headers: { 'content-type': blob.type }, body: blob,
      })
      const body = (await res.json()) as { url?: string; error?: string }
      if (!body.url) throw new Error(body.error ?? 'Upload failed')
      onPick({ kind: 'image', url: body.url, w, h })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => choose(e.target.files?.[0])} aria-label="Choose a photo" />
      {selected ? (
        <div className="relative">
          <img src={selected.url} alt="Your reaction" className="mx-auto max-h-72 rounded-2xl" />
          <button type="button" onClick={() => onPick(undefined)} className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-night/80" aria-label="Remove photo">
            <X className="size-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/25 bg-night text-lg font-semibold"
        >
          {busy ? <Loader2 className="size-10 animate-spin text-brass" /> : <ImagePlus className="size-10 text-brass" />}
          {busy ? 'Uploading…' : 'Pick a reaction pic'}
          <span className="text-sm font-normal text-muted-foreground">From your camera roll</span>
        </button>
      )}
    </div>
  )
}
