import { cn } from '@/lib/utils'
import type { Media } from '../../shared/types'

/** Renders an answer: optional GIF/sticker/photo with its caption. */
export function AnswerBody({ text, media, big, className }: { text: string; media?: Media; big?: boolean; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {media && (
        <div
          className={cn('overflow-hidden rounded-2xl', media.kind === 'sticker' ? 'bg-transparent' : 'bg-black/30')}
          style={{ aspectRatio: `${media.w} / ${media.h}`, maxHeight: big ? '30vh' : '46vh', width: '100%' }}
        >
          <img src={media.url} alt="" loading="lazy" className="h-full w-full object-contain" draggable={false} />
        </div>
      )}
      {text && <p className={cn('font-semibold leading-snug', big ? 'text-3xl' : 'text-xl')}>{media ? text : `“${text}”`}</p>}
    </div>
  )
}
