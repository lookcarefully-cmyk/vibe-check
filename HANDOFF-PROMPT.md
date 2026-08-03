# Handoff prompt

Copy everything below the line into a new session, after opening the
`~/wavelength` folder (or wherever you've put it).

---

I'm handing you an existing project. Read `AGENTS.md` in the project root before
doing anything else — it's the orientation file and it's kept accurate. Where any
document disagrees with the code, the code wins.

## Quick orientation

**Vibe Check** — a public opinion site. Visitors place an answer on a dial (a
semicircular spectrum, retro poster styling), and after answering they see how
everyone else answered. Next.js 15 App Router, TypeScript, React 19, D3 for the
distribution maths. No CSS framework — plain CSS in `app/globals.css`.

I'm a PsyD student, not a programmer. Explain your reasoning, don't assume I know
the stack, and tell me plainly when something is a trade-off rather than a fact.
If I ask for something that will cause a problem, say so before building it.

**Location:** `~/wavelength` · **Runs on:** http://localhost:3210

## Where things are

| Path | What it is |
| --- | --- |
| `lib/topics.ts` | **every board — almost all content work starts here** |
| `lib/likert.ts` | turns a percentage into words; five wording families |
| `lib/store.ts` | persistence + rate limiting; `STORE_VERSION` lives here |
| `lib/experiment.ts` | a parked A/B/C order experiment; `EXPERIMENT_ENABLED` |
| `lib/run.ts` | progress through the parked experiment |
| `lib/aggregate.ts` | mean / sd / percentiles / histogram |
| `lib/rays.ts`, `lib/geometry.ts` | the dial's maths |
| `lib/session.ts`, `lib/request.ts` | per-browser id; origin check + rate-limit bucket |
| `components/Dial.tsx` | the dial itself (SVG) |
| `components/VibeCheck.tsx` | one board: state, submission, polling |
| `components/BoardIndex.tsx` | the browse page — the site's front door |
| `components/TopicNav.tsx`, `components/MiniBoard.tsx` | the tile grid |
| `components/InfoDialog.tsx` | the "?" panel: how to play + data disclosure |
| `components/RunResults.tsx`, `components/Start.tsx` | parked-experiment screens |
| `components/DevPanel.tsx` | `/dev` test harness |
| `app/[topic]/page.tsx` | a single board |
| `app/boards/page.tsx` | browse |
| `app/api/votes/[topic]/route.ts` | `GET` aggregate, `POST` a vote |
| `app/api/summary/route.ts` | every board's average, for the tiles |
| `app/globals.css` | all styling |
| `scripts/seed.mjs` | synthetic data for testing |
| `.data/` | the local vote store (gitignored) |

**Docs:** `AGENTS.md` (orientation — read first), `QUESTION-DESIGN.md` (research
reasoning, and what was tried and rejected), `DEPLOY-CHECKLIST.md` (what's left
before going live), `README.md` (front door only).

## Current state

- **29 boards across 10 categories.** All at **zero votes**. Nothing is deployed.
- Working tree clean, everything committed.
- The site's front door is the browse page at `/`, which redirects to `/boards`.
- An order experiment exists but is **PARKED** (`EXPERIMENT_ENABLED = false` in
  `lib/experiment.ts`). I'm reworking that questionnaire. Don't delete it, don't
  build on it, don't re-enable it without asking.
- Store is at `v5`.

## Running it

```bash
npm install && npm run dev     # or double-click "Start Vibe Check.command"
```

Two things that will waste your time if you don't know them:

- **Never run `npm run build` while the dev server is running.** They share
  `.next`, and the build pulls files out from under the running server — every
  page then returns 500. Stop the server first.
- `/dev` is a test harness for walking the site as a fresh visitor. Answers given
  there are **real votes** and land in the store. `npm run reset` clears every
  board back to zero.

## Adding a board (the most common task)

One object in `lib/topics.ts`. Required: `id`, `subject`, `axis`, `question`,
`prompt`, `leftLabel`, `rightLabel`, `highMeans`, `category`, `scale`.

- `category` is free text — a new string creates a new browse section.
- `scale` picks the wording family: `addictive`, `bipolar`, `amount`,
  `proximity`, `pace`. See `lib/likert.ts`.
- `highMeans` says in plain English what a high score means. Orientation is
  per-board, not uniform, so this is what stops results being read backwards.
- If a pole label doesn't lower-case cleanly into a sentence, set `leftProse` /
  `rightProse` ("SF-coded" not "sf-coded", "optimistic" not "optimist").

**After adding boards, `scripts/seed.mjs` will refuse to run until you add a
shape for each new id.** That guard is deliberate and has caught four real
desyncs. Don't remove it — add the entry.

## Rules that look like preferences but aren't

`AGENTS.md` has the full list with reasoning. The ones most likely to be
"helpfully" undone:

1. **No number is shown to anyone who hasn't answered that board yet.** No live
   readout while choosing, no averages on tiles for unanswered boards. This is a
   whole-UI constraint against anchoring, and it's easy to break by accident.
2. **Everything drawn on the dial is a position on the spectrum, never a
   percentage of people.** Crowd-proportion figures go in prose below.
3. **The vague boards are vague on purpose.** `social-coffee`
   (cigarettes ↔ coffee) has no explanatory copy. Don't add clarifying text.
4. **Bump `STORE_VERSION` if you swap a board's ends or change the record
   shape.** Votes are bare 0..1 positions with no record of which way the labels
   ran, so flipping a board inverts every vote already collected.
5. **Likert band boundaries are fixed.** Wording can improve; the cut points must
   not move once real data exists.
6. **Don't collapse the five wording families into one.** Each exists because a
   shared template produced nonsense — "moderately coffee-ish", "fully we're
   there", "fully faster".

## What's next

Mostly breadth and launch prep. In `DEPLOY-CHECKLIST.md`, briefly:

- **More boards.** I'll bring the questions; you wire them up.
- **A social link-preview image and favicon.** There's no `public/` folder, so a
  link shared on X currently previews as an empty box. This matters most —
  launch is on X.
- **A styled 404.** Mistyped board URLs get Next's default page.
- **Raw data export** (CSV/JSON) so I can analyse offline.
- **Upstash + Vercel deployment.** Needs my accounts — walk me through it, don't
  try to do it for me. The local file store does not work on serverless hosting.

Long term I want visitors to create their own boards. **Don't build that
speculatively** — it brings auth, moderation and abuse-surface questions that
need discussing first.

Start by reading `AGENTS.md`, then tell me what you'd want to clarify before
touching anything.
