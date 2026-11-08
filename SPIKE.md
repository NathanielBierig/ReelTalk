# M0 playback spike — results (2026-11-08)

Live page: https://reeltalk-spike.netanelbie.workers.dev

Tested 3 user-provided reels. Tokenless oEmbed (`graph.facebook.com/v25.0/instagram_oembed`) + Playwright Chromium emulating iPhone 13 at 390px.

| Reel | oEmbed | Embed behavior |
|---|---|---|
| Dfd5FIvuyds (original audio) | OK | Real `<video>` inline, plays with sound |
| DfYgNCnxZ68 | Refused (code 24, "Media Not Found") | "Link may be broken" (private or embedding off) |
| De4lNq1N5lu (licensed music) | OK | No video. "Watch on Instagram" opens instagram.com (login wall in browser) |

## Findings
1. **Only 1 of 3 reels plays inline.** Reels using licensed music do not play in embeds.
2. **Playability is detectable server-side** from `/reel/{code}/embed/` HTML: `video_url` present = playable, "Watch on Instagram" = music-locked, "may be broken" = unavailable.
3. Tokenless oEmbed returns only `html` (no thumbnail, no author).
4. Our page cannot start playback inside the cross-origin iframe; users tap play.
5. Shared links carry tracking params (`obrf`, `vrfl`) that likely identify the sharer. Strip them.
6. Headless Chromium is not Safari. Real-iPhone behavior still needs a manual test.

## Deploy note
The cloud session's credential proxy overwrites the Authorization header, which breaks Wrangler's static-asset upload (it uses its own JWT). Workaround: bundle the built frontend into the Worker script, or deploy from GitHub Actions.
