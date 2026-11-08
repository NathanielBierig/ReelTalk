import { ExternalLink, Music2, Play } from 'lucide-react'
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
        'btn-chunk w-full bg-gradient-to-br from-[#FEDA75] via-[#D62976] to-[#4F5BD5] text-white text-lg',
        className,
      )}
    >
      <Play className="size-6 fill-white" /> Watch on Instagram
    </a>
  )
}

/** Host screen: Instagram's own embed (plays inline on desktop for most non-music reels). */
export function ReelEmbed({ code, status }: { code: string; status: ReelStatus }) {
  return (
    <div className="flex h-full flex-col items-center gap-3">
      <div className="relative aspect-[9/16] h-full max-h-[70vh] overflow-hidden rounded-3xl border-4 border-ink bg-black shadow-[10px_10px_0_0_var(--pink)]">
        <iframe
          key={code}
          title="Reel"
          src={`https://www.instagram.com/reel/${code}/embed/`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
      <a
        href={reelUrl(code)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-panel-2 px-4 py-2 text-sm font-semibold hover:bg-panel"
      >
        {status === 'music' ? <Music2 className="size-4 text-acid" /> : <ExternalLink className="size-4" />}
        {status === 'music' ? 'Has music: open on Instagram to play' : 'Open on Instagram'}
      </a>
    </div>
  )
}
