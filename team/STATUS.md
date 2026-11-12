# Status

_Owner: Lead. Updated at the end of every Lead session. Last updated: 2026-11-12 (team setup)._

## Phase
Phase 1 (Playtest and fix). See `ROADMAP.md`.

## Live
- Shipped 2026-11-12: `team/` workflow, solo test mode (`/solo`), Playwright smoke suite (`cd app && npm run e2e`, 4 tests).
- https://reeltalk.netanelbie.workers.dev deploys automatically from `main` (Cloudflare GitHub auto-build).

## Lead: next up
1. Known UI bug: at 900px laptop height the final screen's Home button is below the fold.
2. Fix the top 3 problems from your first real game once you report them.

## Your move
- [x] **Decide the look:** done 2026-11-12, see DECISIONS #4. Live on the site.
- [ ] Add the `GIPHY_API_KEY` secret on the Worker (turns on GIF/sticker answers).
- [ ] Fill in `team/test-reels.md` with public reels so the Playtest chat can play the live game.
- [ ] Solo test on your laptop: open `/solo`, pick 4 players, set "Reels each" to 1, paste 4 real reels, play a full game. Note what breaks.
- [ ] Real-phone check: Paste button, iPhone (HEIC) photos, reel playback on the laptop.
- [ ] One real game with 4+ friends. Write down the top 3 problems.

## Blocked
- GIF answers can't be tested until the GIPHY key is set.
