import { motion } from 'motion/react'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PublicPlayer } from '../../shared/types'

const FILL = {
  rose: 'bg-rose text-white',
  brass: 'bg-brass text-night',
  grape: 'bg-grape text-white',
  mint: 'bg-mint text-night',
  ink: 'bg-ink text-night',
  ghost: 'bg-panel-2 text-ink',
  dusk: 'bg-dusk text-white',
} as const

/** The big tactile party button (shadcn Button underneath). */
export function Chunk({
  color = 'rose', className, ...props
}: ComponentProps<typeof Button> & { color?: keyof typeof FILL }) {
  return (
    <Button
      {...props}
      className={cn('btn-chunk h-auto w-full text-base hover:brightness-110', FILL[color], className)}
    />
  )
}

/** The mark: a play button that is also a speech bubble (reel + talk). */
export function Mark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id="rt-dusk" gradientUnits="userSpaceOnUse" x1="5" y1="44" x2="41" y2="8">
          <stop offset="0" stopColor="#E9B44C" />
          <stop offset=".3" stopColor="#E8692E" />
          <stop offset=".64" stopColor="#C42A62" />
          <stop offset="1" stopColor="#6E34B0" />
        </linearGradient>
      </defs>
      <path d={MARK_PATH} fill="url(#rt-dusk)" />
    </svg>
  )
}
const MARK_PATH = 'M16 7.6 L39.4 21.2 Q43.4 24 39.4 26.8 L16 40.4 Q13.6 41.8 11.2 42.4 L5.2 44 L8.4 39 Q9.2 37.8 9.2 36 L9.2 12 Q9.2 3.8 16 7.6 Z'

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'xl' }) {
  const s = {
    sm: { mark: 26, text: 'text-[1.35rem]', gap: 'gap-1.5' },
    md: { mark: 56, text: 'text-5xl', gap: 'gap-3' },
    xl: { mark: 104, text: 'text-8xl', gap: 'gap-5' },
  }[size]
  return (
    <div className={cn('flex select-none items-center', s.gap)} role="img" aria-label="Reel Talk">
      <Mark size={s.mark} />
      <span className={cn('display-title lowercase text-ink', s.text)} aria-hidden>reel talk</span>
    </div>
  )
}

export function Avatar({ p, size = 44, ring }: { p: Pick<PublicPlayer, 'name' | 'color'>; size?: number; ring?: boolean }) {
  return (
    <div
      className={cn('grid shrink-0 place-items-center rounded-full font-display font-extrabold text-night', ring && 'ring-4 ring-brass')}
      style={{ width: size, height: size, background: p.color, fontSize: size * 0.42 }}
      aria-hidden
    >
      {p.name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export function PlayerPill({ p, right, dim }: { p: PublicPlayer; right?: ReactNode; dim?: boolean }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: dim ? 0.45 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className="flex items-center gap-3 rounded-2xl bg-panel-2 p-2 pr-4"
    >
      <Avatar p={p} size={40} />
      <span className="min-w-0 flex-1 truncate text-lg font-semibold">{p.name}</span>
      {!p.connected && <span className="text-xs font-semibold text-muted-foreground">away</span>}
      {right}
    </motion.div>
  )
}

/** Countdown shown as a shrinking bar plus big seconds. */
export function Timer({ secs, total, big }: { secs: number | null; total: number; big?: boolean }) {
  if (secs === null) return null
  const pct = Math.max(0, Math.min(100, (secs / total) * 100))
  const hot = secs <= 5
  return (
    <div className="flex items-center gap-3" role="timer" aria-live="off" aria-label={`${secs} seconds left`}>
      <div className={cn('relative flex-1 overflow-hidden rounded-full bg-panel-2', big ? 'h-3' : 'h-2')}>
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-linear', hot ? 'bg-rose' : 'bg-ink/85')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('wide tabular-nums', big ? 'text-5xl' : 'text-2xl', hot && 'text-rose anim-wiggle')}>
        {secs}
      </span>
    </div>
  )
}

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn('mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]', className)}
    >
      {children}
    </motion.main>
  )
}

export function TopBar({ code, label }: { code: string; label?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <Logo size="sm" />
      <div className="flex items-center gap-2">
        {label}
        <span className="wide rounded-[10px] bg-panel-2 px-3 py-1.5 text-sm" aria-label={`Room ${code}`}>{code}</span>
      </div>
    </header>
  )
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm font-medium text-muted-foreground', className)}>{children}</p>
}
