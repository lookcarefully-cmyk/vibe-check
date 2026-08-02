# Orientation for whoever picks this up next

Read this first. It is the only file guaranteed to describe the project as it
actually is right now. Everything else may lag.

## What this is

**Vibe Check** — a public opinion instrument dressed as a game. Visitors place
an answer on a dial (a semicircular spectrum), and once they finish they see how
the crowd answered.

It exists to run **one experiment** and to trail a piece of writing on X and
Substack. It is not a general-purpose polling app, and features that would make
it one are usually wrong for it.

Owner: Will Keller, PsyD student. Non-programmer. Explain reasoning, don't
assume familiarity with the stack, and say plainly when something is a trade-off
rather than a fact.

## The experiment (this is the point of the whole codebase)

Everyone rates how addictive shortform social media is. What's randomised is
**what they answered immediately before**:

| Arm | Order |
| --- | --- |
| A | coffee → shortform social media |
| B | shortform social media → coffee |
| C | slime → shortform social media |

The hypothesis is that judging shortform video *after* coffee — a socially
acceptable, chemically real, near-universal dependence — changes how addictive
people say it is. That speaks to whether the public's "addictive" carries the
clinical meaning (which requires impairment) or is just an intensifier meaning
"hard to stop".

**Arm C is not optional.** Without it, "answered second" and "answered after
coffee" are perfectly confounded, and any A-vs-B difference could be a plain
position effect. A-vs-C is what isolates the comparator. Anyone proposing to
drop arm C to shorten the run has misunderstood the design.

Defined in `lib/experiment.ts`. Arm is assigned at random per browser, stored in
`localStorage`, and **recorded on every vote**.

## Rules that look like preferences but aren't

Each of these was arrived at by making the opposite mistake first.

1. **No number is shown to anyone who hasn't answered yet.** No live readout on
   the dial, no averages on nav tiles for unanswered boards, no results until the
   run is complete. Seeing the crowd's answer before giving your own is
   anchoring, and it contaminates exactly the comparison being measured. This is
   a constraint on the whole UI, and it's easy to break by accident.

2. **Everything drawn on the dial is a position on the spectrum, never a
   percentage of people.** An early version put "80%" (share of respondents)
   next to "66%" (position on the scale) and they read as comparable numbers.
   Crowd-proportion figures live in prose below the dial.

3. **The addictive boards are deliberately unanchored.** No reference points on
   the scale. The hypothesis is about the public's *own* concept of addictive;
   printing referents replaces that concept with ours. The comparator is supplied
   as a measured item (coffee), which is also the manipulation.

4. **The vague boards are vague on purpose.** `social-coffee`
   (cigarettes ↔ coffee) has no explanatory copy. Spelling out what the poles
   stand for tells respondents which answer is "consistent", and anyone who spots
   the tension resolves it. Do not add clarifying text.

5. **Orientation is per-board, not uniform.** Addictive boards run
   NOT ADDICTIVE → ADDICTIVE; harm boards run HARMFUL → HEALTHY. Every `Topic`
   carries `highMeans` saying what a high score means in plain English. Assuming
   a uniform direction is the mistake that silently inverts a result.

6. **`STORE_VERSION` in `lib/store.ts` must be bumped whenever a board's ends
   are swapped or the record shape changes.** Votes are bare 0..1 positions with
   no record of which way the labels ran, so flipping a board turns every
   existing vote into its opposite. Currently `v5`.

7. **Likert band boundaries in `lib/likert.ts` are fixed.** Wording can be
   improved; the cut points must not move once real data exists, because they
   can always be nudged so the number lands in a more quotable band.

## Layout

| Path | What it is |
| --- | --- |
| `lib/topics.ts` | **every board — start here** |
| `lib/experiment.ts` | arms, assignment, order |
| `lib/likert.ts` | percentage → words |
| `lib/store.ts` | persistence + rate limiting; two backends |
| `lib/run.ts` | progress through an arm |
| `lib/aggregate.ts` | mean / sd / percentiles / histogram |
| `lib/rays.ts`, `lib/geometry.ts` | the dial's maths |
| `components/Dial.tsx` | the dial itself (SVG) |
| `components/VibeCheck.tsx` | one board: state, submission, polling |
| `components/RunResults.tsx` | the end-of-run reveal |
| `app/api/votes/[topic]/route.ts` | `GET` aggregate, `POST` a vote |

## Data

One record per answer:

```json
{ "v": 0.74, "t": 1785620561526, "s": "<random 32-hex>", "g": "A", "p": 2 }
```

`v` position 0..1 · `t` unix ms · `s` per-browser random id · `g` arm · `p`
position within the arm (0 outside the experiment).

`s` groups one person's answers together. It is not derived from anything about
them and is never returned by a public endpoint. `g` and `p` are written at vote
time rather than reconstructed later, because reconstruction needs both answers
present and would discard everyone who answered only the first item — and the
first item is the uncontaminated measure.

**Storage backends.** Local JSON files under `.data/` by default. Set
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` and it switches to Redis
automatically. The file backend does not work on serverless hosting, and its
rate limiter is per-process, so it's effectively absent in production.

## Running it

Double-click `Start Vibe Check.command`, or:

```bash
npm install && npm run dev
```

Port 3210. **Don't run `npm run build` while the dev server is running** — they
share `.next` and the build pulls files out from under the running server, which
makes every page 500. Stop it first.

**Trying the run yourself:** `/dev` is a test harness — pick an arm and it
starts a fresh run in your browser. It only touches your own `localStorage`.
Answers given there are **real votes and do land in the store**, so clear them
with `npm run reset` before launch.

`npm run seed -- 300` writes synthetic respondents with a deliberate order effect
baked in, so a broken analysis fails loudly instead of quietly reporting "no
effect". It refuses to run if a board has no shape defined. **Never run it
against real responses.** `npm run seed -- 0` wipes.

## State

Built and working locally. **Not deployed.** Zero real responses collected.

Open items are in `DEPLOY-CHECKLIST.md` — briefly: Upstash + Vercel setup (needs
Will's accounts), a social link-preview image, a styled 404, a raw-data export,
and backups.

`QUESTION-DESIGN.md` is the reasoning history: hypotheses considered, things
tried and rejected, and why. Useful for understanding *why* the design is what it
is. Where it disagrees with this file or with the code, the code wins.
