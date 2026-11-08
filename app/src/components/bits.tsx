import { motion } from 'motion/react'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PublicPlayer } from '../../shared/types'

const FILL = {
  pink: 'bg-pink text-white',
  acid: 'bg-acid text-night',
  volt: 'bg-volt text-white',
  mint: 'bg-mint text-night',
  ink: 'bg-ink text-night',
  ghost: 'bg-panel-2 text-ink',
} as const

/** The big tactile party button (shadcn Button underneath). */
export function Chunk({
  color = 'pink', className, ...props
}: ComponentProps<typeof Button> & { color?: keyof typeof FILL }) {
  return (
    <Button
      {...props}
      className={cn('btn-chunk h-auto w-full text-base hover:brightness-110', FILL[color], className)}
    />
  )
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'xl' }) {
  const s = { sm: 'text-xl', md: 'text-5xl', xl: 'text-8xl' }[size]
  return (
    <div className={cn('display-title select-none', s)} aria-label="Reel Talk">
      <span className="text-pink">Reel</span>
      <span className="inline-block -rotate-3 rounded-xl bg-acid px-[0.18em] text-night ml-[0.12em]">Talk</span>
    </div>
  )
}

export function Avatar({ p, size = 44, ring }: { p: Pick<PublicPlayer, 'name' | 'color'>; size?: number; ring?: boolean }) {
  return (
    <div
      className={cn('grid shrink-0 place-items-center rounded-full font-display font-black text-night', ring && 'ring-4 ring-acid')}
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
      <div className={cn('relative flex-1 overflow-hidden rounded-full bg-panel-2', big ? 'h-5' : 'h-3')}>
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-linear', hot ? 'bg-pink' : 'bg-acid')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('font-display font-black tabular-nums', big ? 'text-5xl' : 'text-2xl', hot && 'text-pink anim-wiggle')}>
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
        <span className="rounded-xl bg-panel-2 px-3 py-1.5 font-display text-sm font-extrabold tracking-[0.2em]">{code}</span>
      </div>
    </header>
  )
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('font-display text-xs font-extrabold uppercase tracking-[0.25em] text-muted-foreground', className)}>{children}</p>
}
