import { motion } from 'motion/react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PublicPlayer } from '../../shared/types'

const FILL = {
  pink: 'fill-grad bg-transparent',
  acid: 'fill-gold bg-acid',
  volt: 'fill-glass border-2 border-white/85 bg-white/5',
  mint: 'fill-gold bg-acid',
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
      className={cn('btn-chunk h-auto w-full text-lg hover:brightness-110', FILL[color], className)}
    />
  )
}

/** The mark: a hollow gradient reel (play + speech tail) behind a gold "typing" bubble, in a tilted tile. */
export function LogoMark({ size = 40, animate }: { size?: number; animate?: boolean }) {
  const id = useId().replace(/:/g, '')
  const pad = Math.max(2, Math.round(size * 0.03))
  return (
    <span
      className="tile-ig inline-block shrink-0 -rotate-[7deg]"
      style={{ width: size, height: size, padding: pad, borderRadius: size * 0.27, boxShadow: size > 60 ? '0 16px 40px rgb(150 47 191 / 0.45)' : undefined }}
      aria-hidden
    >
      <span className="grid size-full place-items-center bg-[#160A1C]" style={{ borderRadius: size * 0.27 - pad }}>
        <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 24 24">
          <defs>
            <linearGradient id={id} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4F5BD5" /><stop offset="0.35" stopColor="#962FBF" /><stop offset="0.7" stopColor="#D62976" /><stop offset="1" stopColor="#FA7E1E" />
            </linearGradient>
          </defs>
          <path d="M11 1.5h8.5a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3h-.8v3.2L15.2 14H11a3 3 0 0 1-3-3V4.5a3 3 0 0 1 3-3z" fill="none" stroke={`url(#${id})`} strokeWidth={size > 60 ? 1.6 : 1.9} strokeLinejoin="round" />
          <path d="M14.6 4.2v4.6l3.9-2.3z" fill="none" stroke={`url(#${id})`} strokeWidth={size > 60 ? 1.4 : 1.7} strokeLinejoin="round" />
          <path d="M4 9h8.5a3 3 0 0 1 3 3v4.5a3 3 0 0 1-3 3H9L5 22.5v-3H4a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z" fill="#FEDA75" stroke="#160A1C" strokeWidth="1.4" strokeLinejoin="round" />
          {[5, 8.25, 11.5].map((cx, i) => (
            <circle
              key={cx} cx={cx} cy="14.25" r="1.3" fill="#fff" opacity={1 - i * 0.3}
              className={animate ? 'rt-dot' : undefined} style={animate ? { animationDelay: `${i * 0.2}s` } : undefined}
            />
          ))}
        </svg>
      </span>
    </span>
  )
}

function Talk({ className }: { className?: string }) {
  return <span className={cn('inline-block rotate-2 rounded-[0.22em] bg-acid px-[0.28em] pb-[0.12em] text-night', className)}>Talk</span>
}

/** sm: top-bar lockup. md: big lockup for TV headers. hero: stacked, for the Home screen. */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'xl' | 'hero' }) {
  if (size === 'hero') {
    return (
      <div className="flex select-none flex-col items-center gap-6 text-center" aria-label="Reel Talk">
        <LogoMark size={140} animate />
        <div className="display-title flex flex-col items-center gap-1 text-[3.4rem]">
          <span>Reel</span>
          <Talk />
        </div>
      </div>
    )
  }
  const t = { sm: 'text-xl', md: 'text-5xl', xl: 'text-8xl' }[size]
  const m = { sm: 36, md: 72, xl: 128 }[size]
  return (
    <div className={cn('display-title flex select-none items-center gap-[0.4em]', t)} aria-label="Reel Talk">
      <LogoMark size={m} animate={size !== 'sm'} />
      <span>Reel <Talk /></span>
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
      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-panel/85 p-2 pr-4"
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
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-linear', hot ? 'bg-pink' : 'bg-acid shadow-[0_0_12px_rgb(254_218_117/0.6)]')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('font-display tabular-nums text-acid', big ? 'text-5xl' : 'text-2xl', hot && 'text-pink anim-wiggle')}>
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
        <span className="rounded-xl border-[1.5px] border-acid/45 bg-panel px-3 py-1.5 font-display text-sm tracking-[0.2em] text-acid">{code}</span>
      </div>
    </header>
  )
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[0.8rem] font-extrabold uppercase tracking-[0.18em] text-muted-foreground', className)}>{children}</p>
}
