# How we work on Reel Talk

Three Claude chats plus you. Chats share no memory, so **this folder and GitHub Issues are the only shared brain.** If it isn't written here or in an issue, it didn't happen.

## The team

| Chat | Owns | Never does | Reads | Writes |
|---|---|---|---|---|
| **Lead** (builder + chief of staff) | All code, merges to `main`, deploys, `STATUS.md`, `DECISIONS.md`, triaging issues | Asks you to do work it can do itself | Everything here, all open issues | Code, `team/STATUS.md`, `team/DECISIONS.md`, closes issues |
| **Secretary** | Your to-do list and your decisions | Writes code, edits repo files, plans features | `team/STATUS.md`, `team/DECISIONS.md`, `ROADMAP.md`, issues labeled `you` and `decision` | Issues labeled `you` / `decision` (opens, comments, closes when you say done) |
| **Playtest & Design** | Finding what is broken, confusing or ugly in the live game | Edits code or repo files, fixes bugs | `team/STATUS.md`, `team/test-reels.md`, `PLAN.md`, the live site | Issues labeled `bug` or `ux` |
| **You** | Real phones, real friends, secrets, final calls | Relays messages between chats by hand | Secretary's answer | Answers to `decision` issues, `team/test-reels.md` |

## Handoff rules

1. **Every chat starts by pulling `main`** and reading `team/STATUS.md`. Never trust chat memory over the files.
2. **Only Lead writes to the repo.** Every cloud chat pushes to its own `claude/*` branch, so a file written by another chat is invisible until someone merges it. That is why the other chats write to GitHub Issues instead.
3. **Issues are the inbox.** Labels:
   - `bug`: something broke. Has repro steps.
   - `ux`: it works but is confusing, slow or ugly. Has a concrete fix proposal.
   - `you`: a task only you can do (secrets, real phones, friends).
   - `decision`: Lead needs your call. Has options and a recommendation.
4. **Lead updates `STATUS.md` at the end of every work session**, including the "Your move" list. The Secretary reads it.
5. **Decisions are append-only** in `DECISIONS.md`. Changing one means a new entry that points at the old one.

## Your daily loop

1. **Secretary:** "What's my move?" Do the `you` items, answer the `decision` items.
2. **Lead:** "Go." It triages new issues, builds, merges, deploys, updates STATUS.
3. **Playtest & Design:** "Play the live build." Only after Lead has deployed something new.
4. **Lead:** "Triage." It turns new issues into work or closes them.
5. Done. Skip any step that has nothing new.

## Not separate chats (on purpose)

- **Chief of staff:** merged into Lead. A separate one would just relay messages.
- **QA / reviewer / UI-polish agents in ROADMAP Phase 2:** Lead runs them as subagents in worktrees, not as chats you have to visit.
- **Entrepreneur:** Phase 4. Start that chat then, not now.
