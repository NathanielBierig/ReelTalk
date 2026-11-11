# Reel Talk

A party game where your friends' Instagram reels are the cards. Everyone writes the funniest take on a reel; the person who sent it judges; the crowd votes for a bonus point.

**Live:** https://reeltalk.netanelbie.workers.dev

- **Party mode:** a TV/laptop is the stage (QR join, reel embed, reveals). Phones are controllers.
- **Bus mode:** phones only. Each phone opens the reel in Instagram (headphones), then answers.

See [ROADMAP.md](ROADMAP.md) for what is next, [PLAN.md](PLAN.md) for MVP scope, [SPIKE.md](SPIKE.md) for the playback findings.

## Develop

```bash
cd app && npm install
npm run build          # app + inlined assets + worker typecheck
npm run dev:worker     # http://localhost:8787 (Durable Objects run locally; runs from the repo root)
```

## Test before a playtest

```bash
cd app && npm run e2e  # Playwright: full party + bus games, refresh, leaver, late joiner
```

Screenshots of every phase land in `app/e2e-screens/`. First time on a new machine: `npx playwright install chromium`.
Reels in tests are fake (`E2Etest…` codes, only accepted when the local server runs with `E2E_FAKE_REELS=1`), so real Instagram playback still needs a human check.

## Deploy

```bash
cd app && npm run deploy
```

Needs a Cloudflare API token (Workers edit) and `CLOUDFLARE_ACCOUNT_ID`.

## Layout

- `app/worker/game.ts` pure game rules (phases, scoring, round-robin judging)
- `app/worker/index.ts` Worker routes, reel validation, `Room` Durable Object (WebSockets + alarms)
- `app/shared/types.ts` protocol shared by server and client
- `app/src/screens/` phone screens, `Display.tsx` is the TV screen
