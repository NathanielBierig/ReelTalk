# Reel Talk roadmap

Rule: each phase starts only when the one before it is done. Agents run in parallel only on work that doesn't touch the same files (each one in its own git worktree).

## Phase 1: Playtest and fix (you + Claude)
- [ ] Add `GIPHY_API_KEY` secret on the Worker (turns on GIF/sticker answers)
- [ ] Real-phone check: Paste button, iPhone (HEIC) photos, reel playback on the laptop
- [ ] One real game with 4+ friends, write down the top 3 problems
- [ ] Fix those problems

## Phase 2: Harden (3 agents in parallel)
| Agent | Job | Touches |
|---|---|---|
| QA engineer | Unit tests for `game.ts`, Playwright e2e suite in the repo, GitHub Action to run them | `app/tests/`, `.github/` |
| Reviewer | Bug and security review of the Worker and Durable Object; report only, no edits | nothing (read-only) |
| UI polish | How-to-play card, reveal sounds (with mute), accessibility pass, room cleanup alarm | `app/src/` |

## Phase 3: Game modes (Claude first, then 1 agent per mode)
1. **Claude:** refactor game rules into a mode plugin system (`worker/modes/*.ts`). Without this, mode agents collide in the same files.
2. **Then one agent per mode, in parallel:**
   - **Guess Who:** a reel plays, everyone guesses who sent it. Points for guessing right and for fooling people.
   - **Reel Roulette:** like Guess Who, but each player drops 10+ reels and the game picks at random, so you never know which of yours will show up.
   - **Prompt to Reel:** a prompt ("the reel that is your ex") appears, each player picks one of their own submitted reels, the group votes.
   - **Best Reel Wins:** quick finale vote, usable as a closer for any mode.

Note on Reel Roulette: Instagram doesn't let apps read your sent, liked or saved reels, so a real "random from your account" pull isn't possible. Players still choose the pool, and the randomness comes from the game picking from it.

## Phase 4: Growth (entrepreneur agent + 1 builder agent)
- **Entrepreneur agent (research only):** competitors (What Do You Meme, Jackbox, Photo Roulette), how to make money, launch channels, a name and domain check for "Reel Talk".
- **Builder agent:** shareable winner card (image to post to stories), Android "share to Reel Talk" (PWA), iOS Shortcut, TikTok links.

## Phase 5: v2 (decide after Phase 4)
- Instagram DM bot (needs Meta app review, may not return usable reel links)
- Content filtering before any public launch
- Stickers placed on top of the reel
