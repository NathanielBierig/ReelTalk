# Reel Talk — MVP plan

Cards Against Humanity, but the black card is a friend's Instagram reel.

## Core loop
1. **Lobby**: room code + QR. Host is a TV/laptop (party mode) or a player's phone (bus mode).
2. **Submit**: each player adds R reels (host picks 3-5). "Open Instagram" button + one-tap Paste. Each link is checked server-side at submit (playable / music-locked / unavailable). Tracking params (`obrf`, `vrfl`, `igsh`, `utm_*`) are stripped.
3. **Round**: reel plays. Non-judges answer within the timer (host picks 30/45/60s).
4. **Judge + audience**: the reel's submitter judges (rounds go round-robin, so everyone judges in turn). Others vote at the same time. Votes are hidden from the judge.
5. **Reveal**: judge pick +1, audience favorite +1 (ties all get it; audience bonus only with 4+ players).
6. **Final**: winner screen after N x R rounds.

## Modes
- **Party**: host screen plays the reel; phones are controllers.
- **Bus**: no host screen, each phone plays the reel (headphones), "Watched" button before answering.

## Answers
- MVP (M3): text, 80 chars.
- MVP (M4): GIF/sticker search (GIPHY or KLIPY; Tenor API shut down June 30, 2026) or a camera-roll image (compressed on device, stored in the room, deleted after the game). Optional short caption. One answer per player.

## Stack
- Cloudflare Workers + one Durable Object (SQLite) per room, WebSockets with hibernation. Server owns phase, timers, scores.
- Vite + React + Tailwind + shadcn + Framer Motion.
- Tokenless Instagram oEmbed + embed-page check, called from the Worker and cached.

## Data model (per room DO)
- Room: `code, hostId, mode, phase, settings{reelsPerPlayer, answerSecs, judgeSecs}, roundIndex, deadline`
- Player: `id, name, color, score, connected`
- Reel: `id, ownerId, shortcode, playability`
- Round: `reelId, judgeId, answers{playerId -> {text|gifUrl|imageId, caption}}, judgePick, audienceVotes{voterId -> playerId}`

## Milestones
- [x] **M0** Playback spike (see SPIKE.md)
- [ ] **M1** Rooms: create/join by QR, live lobby, deployed
- [ ] **M2** Submission: Open Instagram + Paste, server validation, preview cards
- [ ] **M3** Core loop with text answers, timers, reconnects, real-game test
- [ ] **M4** GIF/sticker search + camera-roll images, audience vote, winner screen, animations
- [ ] **M5** Hardening: kick player, judge-dropout fallback, duplicate reels, real-device pass

## Out of MVP (v2)
Instagram DM bot, share-sheet targets (Android PWA / iOS Shortcut), stickers placed on the reel, TikTok, moderation.

## Edge rules
- Min 3 players; audience bonus needs 4+.
- Judge disconnects: audience favorite wins after timeout.
- Player leaves: their remaining reels are skipped.
- Duplicate reel: rejected at submit.
