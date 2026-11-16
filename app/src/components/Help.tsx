import { Dialog } from '@base-ui/react/dialog'
import { Bookmark, Clapperboard, Crown, MessageCircle, Smartphone, Trophy, Tv, X, Headphones } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LIMITS } from '../../shared/types'

/** Round "?" button that opens the how-to-play sheet. Works anywhere, including the TV screen. */
export function HelpButton({ className, big }: { className?: string; big?: boolean }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="How to play"
        className={cn(
          'grid shrink-0 place-items-center rounded-full border-[1.5px] border-acid/60 bg-panel font-display text-acid transition hover:bg-acid hover:text-night focus-visible:outline-2 focus-visible:outline-acid active:scale-95',
          big ? 'size-14 text-3xl' : 'size-11 text-xl',
          className,
        )}
      >
        ?
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-[61] grid place-items-end overflow-y-auto sm:place-items-center">
          <Dialog.Popup
            className={cn(
              'relative flex max-h-[92dvh] w-full max-w-lg flex-col lg:max-w-2xl rounded-t-[28px] border-[1.5px] border-white/14 bg-panel text-ink shadow-2xl outline-none transition duration-200 sm:rounded-[28px]',
              'data-[ending-style]:translate-y-6 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-6 data-[starting-style]:opacity-0',
            )}
          >
            <header className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
              <div>
                <Dialog.Title className="font-display text-3xl leading-none lg:text-4xl">How to play</Dialog.Title>
                <Dialog.Description className="mt-2 text-[0.95rem] text-muted-foreground">
                  Your friends' reels are the cards. {LIMITS.minPlayers} to {LIMITS.maxPlayers} players.
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close" className="grid size-11 shrink-0 place-items-center rounded-full bg-panel-2 text-ink hover:bg-white/15">
                <X className="size-5" />
              </Dialog.Close>
            </header>

            <div className="space-y-6 overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
              <Section icon={<Clapperboard className="size-5" />} title="The game">
                <ol className="space-y-2">
                  <Step n={1}>Everyone drops in a few reels that make them laugh.</Step>
                  <Step n={2}>A reel plays. Everyone except its sender writes the funniest take on it (type it, or add a photo).</Step>
                  <Step n={3}><b className="text-ink">The reel's sender is the judge</b> and picks their favorite take. Everyone else votes at the same time. The judge can't see the votes.</Step>
                  <Step n={4}>Reveal! Next reel, next judge. Most points after the last reel wins.</Step>
                </ol>
              </Section>

              <Section icon={<Bookmark className="size-5" />} title="Prep your reels first">
                <ul className="space-y-2">
                  <Bullet><b className="text-ink">Saved:</b> in the days before, bookmark reels you love in Instagram. When it's time, open your Saved tab and pick from there.</Bullet>
                  <Bullet><b className="text-ink">DMs:</b> scroll your group chats for the reels your friends sent you. Those are usually the best ones.</Bullet>
                  <Bullet><b className="text-ink">Copy the link:</b> tap <b className="text-ink">Share</b>, then <b className="text-ink">Copy link</b>, come back here, and hit <b className="text-acid">Paste</b>.</Bullet>
                  <Bullet>Pick reels from <b className="text-ink">public accounts</b>. Private reels can't be opened by the others.</Bullet>
                  <Bullet>Pick <b className="text-ink">different</b> reels from your friends. Duplicates are rejected.</Bullet>
                  <Bullet><b className="text-ink">Original audio plays best.</b> A reel with a licensed song may not play on the TV, but everyone can still tap <b className="text-ink">Watch the reel</b> to open it in Instagram.</Bullet>
                </ul>
              </Section>

              <Section icon={<Trophy className="size-5" />} title="Points">
                <ul className="space-y-2">
                  <Bullet><Crown className="mr-1 inline size-4 text-acid" /> <b className="text-ink">Judge's pick: +1</b></Bullet>
                  <Bullet><b className="text-ink">Crowd favorite: +1</b> (the take with the most votes, when {LIMITS.audienceBonusMinPlayers} or more are playing). Ties share the point.</Bullet>
                  <Bullet>A take can win both for +2.</Bullet>
                </ul>
              </Section>

              <Section icon={<Tv className="size-5" />} title="Two ways to play">
                <ul className="space-y-2">
                  <Bullet><Tv className="mr-1 inline size-4 text-acid" /> <b className="text-ink">TV or laptop:</b> open the site on the big screen, tap <b className="text-ink">Host</b>, everyone scans the QR code. The reel plays on the screen.</Bullet>
                  <Bullet><Smartphone className="mr-1 inline size-4 text-acid" /> <b className="text-ink">Phones only (bus mode):</b> no screen needed. Each phone opens the reel in Instagram. <Headphones className="mr-0.5 inline size-4 text-acid" /> Bring headphones.</Bullet>
                </ul>
              </Section>

              <Section icon={<MessageCircle className="size-5" />} title="Good to know">
                <ul className="space-y-2">
                  <Bullet>Keep your phone awake and this page open. If it reloads, open the link again and you're back in.</Bullet>
                  <Bullet>Not sure about a reel? Swap it out before the host starts. After that, the reels are locked.</Bullet>
                </ul>
              </Section>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 font-display text-lg text-acid lg:text-xl">{icon}{title}</h3>
      <div className="text-[0.97rem] leading-snug text-muted-foreground lg:text-[1.15rem]">{children}</div>
    </section>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-acid font-display text-sm text-night">{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return <li className="flex gap-2.5"><span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-acid" aria-hidden /><span>{children}</span></li>
}
