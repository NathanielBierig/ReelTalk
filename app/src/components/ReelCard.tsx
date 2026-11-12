import { useLayoutEffect, useRef, useState } from 'react'
import { ExternalLink, Maximize2, Minimize2, Music2, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReelStatus } from '../../shared/types'

export const reelUrl = (code: string) => `https://www.instagram.com/reel/${code}/`

/**
 * Phones: one big button that opens the reel in the Instagram app (inline embeds don't play
 * on iPhone; tested). iOS then shows "◀ Safari" to come back.
 */
export function WatchButton({ code, className }: { code: string; className?: string }) {
  return (
    <a
      href={reelUrl(code)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'btn-chunk fill-grad -rotate-1 w-full whitespace-nowrap text-lg',
        className,
      )}
    >
      <Play className="size-6" strokeWidth={2.6} /> Watch the reel
    </a>
  )
}

// Instagram's reel embed layout at 540px wide (measured 2026-11-12): a 54px white header, then the
// media box (4:5 for video, with the 9:16 video pillarboxed inside; ~1.017:1 for the music card),
// then a white footer. We crop to just the video and scale it to the TV's height.
// If Instagram changes that layout, the crop drifts: the "Full post" toggle shows the uncropped embed.
const IG_W = 540
const IG_HEADER = 54

/** TV: the reel as big as the screen allows, cropped to the video, dark frame. */
export function ReelStage({ code, status, align = 'center' }: { code: string; status: ReelStatus; align?: 'center' | 'end' }) {
  const ref = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(0)
  const [full, setFull] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.clientHeight))
    ro.observe(el)
    setH(el.clientHeight)
    return () => ro.disconnect()
  }, [])
  const music = status === 'music'
  const boxH = full ? 1400 : music ? IG_W * 1.017 : IG_W * 1.25
  const visW = full || music ? IG_W : boxH * (9 / 16)
  const top = full ? 0 : IG_HEADER
  const sc = h ? h / boxH : 0

  const openHere = () => window.open(reelUrl(code), 'reeltalk-reel', 'popup,width=460,height=860')

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-3', align === 'end' ? 'items-end' : 'items-center')}>
      <div ref={ref} className={cn('flex min-h-0 w-full flex-1', align === 'end' ? 'justify-end' : 'justify-center')}>
        <div
          className="relative overflow-hidden rounded-3xl border-4 border-ink bg-black shadow-[10px_10px_0_0_var(--pink)]"
          style={{ width: visW * sc, height: h }}
        >
          {sc > 0 && (
            <iframe
              key={code}
              title="Reel"
              src={`https://www.instagram.com/reel/${code}/embed/`}
              scrolling="no"
              className="absolute border-0"
              style={{
                width: IG_W,
                height: top + boxH + 420,
                left: -((IG_W - visW) / 2) * sc,
                top: -top * sc,
                transform: `scale(${sc})`,
                transformOrigin: 'top left',
              }}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {music ? (
          <button onClick={openHere} className="inline-flex items-center gap-2 rounded-full bg-acid px-5 py-2.5 font-display font-extrabold text-night hover:brightness-110">
            <Music2 className="size-5" /> Has a real song: play it on this screen
          </button>
        ) : (
          <a href={reelUrl(code)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-panel-2 px-4 py-2 text-sm font-semibold hover:bg-panel">
            <ExternalLink className="size-4" /> Open on Instagram
          </a>
        )}
        <button onClick={() => setFull(f => !f)} className="inline-flex items-center gap-2 rounded-full bg-panel-2 px-4 py-2 text-sm font-semibold hover:bg-panel">
          {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />} {full ? 'Just the video' : 'Full post'}
        </button>
      </div>
    </div>
  )
}
