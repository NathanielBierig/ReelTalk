# Status

_Owner: Lead. Updated at the end of every Lead session. Last updated: 2026-11-12 (team setup)._

## Phase
Phase 1 (Playtest and fix). See `ROADMAP.md`.

## Live
- Shipped 2026-11-12 (after playtest 1): full-height cropped reel on the TV, live chat between rounds and on the podium, music-reel handling (decisions 5 to 7).
- Shipped 2026-11-12: `team/` workflow, solo test mode (`/solo`), Playwright smoke suite (`cd app && npm run e2e`, 4 tests).
- https://reeltalk.netanelbie.workers.dev deploys automatically from `main` (Cloudflare GitHub auto-build).

## Lead: next up
1. After playtest 2: check how music reels felt (phones vs "play it on this screen") and decide whether to keep both.
2. Known UI bug: at 900px laptop height the final screen's Home button is below the fold.
3. Fix whatever playtest 2 turns up.

## Your move
- [x] **Decide the look:** done 2026-11-12, see DECISIONS #4. Live on the site.
- [ ] Add the `GIPHY_API_KEY` secret on the Worker (turns on GIF/sticker answers).
- [ ] Fill in `team/test-reels.md` with public reels so the Playtest chat can play the live game.
- [ ] Solo test on your laptop: open `/solo`, pick 4 players, set "Reels each" to 1, paste 4 real reels, play a full game. Note what breaks.
- [ ] Real-phone check: Paste button, iPhone (HEIC) photos, reel playback on the laptop.
- [x] First playtest (went well; feedback shipped).
- [ ] Playtest 2 with real-song reels. Before it: log into Instagram on the TV laptop so "play it on this screen" works. Note what breaks.

## Blocked
- GIF answers can't be tested until the GIPHY key is set.
