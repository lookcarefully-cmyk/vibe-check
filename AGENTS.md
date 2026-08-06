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

## Current focus

The order experiment is **PARKED** — `EXPERIMENT_ENABLED = false` in
`lib/experiment.ts`. Will is reworking the shortform-social-media questionnaire.
Nothing was deleted; flipping the flag brings the whole run back.

Right now the site is a browsable set of research-led dials. Visitors can also
make community boards; those are unlisted by default, moderated through
`/admin`, auto-hidden at four reports, and only reach the home page after owner
approval. Do not bypass those reach gates.

The 30-board research slate now has three reveal instruments. Type 1 boards are
standalone guesses scored against published benchmarks. Type 2/3 boards bank the
visitor's own opinion, then collect a separate prediction of the opposite half
or whole Vibe Check crowd before revealing any result. `revealTypeOf` in
`lib/topics.ts` is the assignment source of truth. Predictions are separate
records under a separate storage namespace; never mix them into vote rows.

Adding a board is one object in `lib/topics.ts`. It needs `category` (free text,
creates a new browse section if unused) and `scale` (which wording family
translates its percentage into words).

## The experiment, while parked

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

   **The one sanctioned exception is "view results without voting"**, and it
   works because the visitor pays for it: choosing it writes
   `revealStorageKey` and closes that board to them permanently. Anchoring is
   only a problem if an anchored answer can still be recorded — here none can.
   The flag is written *before* anything is revealed, so a reload mid-reveal
   can't leave the board open to a now-anchored vote. Never add a path that
   shows results and leaves voting available.

   On Type 2/3 boards, answering is not yet the reveal: the visitor must place
   the second prediction marker first. Do not expose the aggregate between the
   opinion POST and prediction POST. Opposite-side comparisons stay suppressed
   below 10 people; an exact-midpoint opinion has no opposite half and falls
   back, explicitly, to a whole-crowd prediction.

   The choosing dial starts with **no needle or hub anywhere**. The first tap
   places the visitor's teal needle; subsequent taps or a drag adjust it, and a
   separate button commits it. Never pre-place a midpoint needle. The red needle
   belongs to the result phase and represents the crowd, not the visitor.

2. **Everything drawn on the dial is a position on the spectrum, never a
   percentage of people.** An early version put "80%" (share of respondents)
   next to "66%" (position on the scale) and they read as comparable numbers.
   Crowd-proportion figures live in prose below the dial.

3. **The addictive boards are deliberately unanchored.** No reference points on
   the scale. The hypothesis is about the public's *own* concept of addictive;
   printing referents replaces that concept with ours. The comparator is supplied
   as a measured item (coffee), which is also the manipulation.

4. **A deliberately-vague board carries no explanatory copy.** The
   cigarettes ↔ coffee board (`social-coffee`) was one — Will has since removed
   it — but the principle stands if one returns: spelling out what the poles
   stand for tells respondents which answer is "consistent", and anyone who
   spots the tension resolves it. Don't annotate a board whose whole point is
   the ambiguity.

5. **A board is a series, not a number.** People answer again when their vibe
   moves (weekly by default — `cadence` in `lib/topics.ts`, maths in
   `lib/epoch.ts`). That makes the all-time mean the average *person-week*
   rather than the average person: someone answering thirty weeks running counts
   thirty times. So every headline figure is **deduped to one answer per person
   (their latest) and windowed**, and the window is always printed beside it.
   `aggregateWindow` in `lib/aggregate.ts` is the only correct way to get a
   board's number; a bare mean over raw rows is wrong.

   **Never delete votes to "refresh" a board.** Resetting destroys the series
   the whole project exists to show, and with it the panel — the ability to
   measure the *same people* twice, which is the strongest claim available here
   and the hardest for anyone else to reproduce. Reset eligibility, never data.

   **Don't show the crowd's current number to someone about to re-answer.** They
   saw it after their last answer, which is unavoidable; putting today's figure
   in front of them at the moment they revise anchors the exact quantity being
   measured. `asking` in `components/VibeCheck.tsx` is what keeps that screen
   clean.

6. **One answer per board per epoch, enforced on the server.** Once a board is answered
   the saved position in `localStorage` is what makes it show results, forever —
   navigating away and back must never lose it. The "Answer again" button is
   development-only (`NODE_ENV`); it used to ship, and because it cleared the
   saved answer *before* the replacement vote was accepted, anyone who hit the
   rate limiter on the way back lost their result with no way to see the board
   again. Re-answering also inflates one person into several records.

   **The rate limiter is not the cadence rule.** Cadence is enforced in
   `app/api/votes/[topic]/route.ts`, which refuses a second answer in the same
   epoch with a 409. It buckets by hashed IP, so it
   counts *connections*, not people — a household, an office, and especially a
   mobile carrier all share one bucket. Its caps are a flood stop and must stay
   well above what a shared exit IP produces, or ordinary first-time voters get
   rejected with a 429 they can do nothing about.

7. **A result page must never invent numbers.** The empty aggregate has
   `mean: 0.5`, so anything rendered before the first fetch lands, or after one
   fails, would show a 50% "average" and a difference measured against it. Guard
   on `agg.count === 0`, and distinguish "not fetched yet" from "fetched and
   empty" or the failure notice flashes on every load.

8. **Orientation is per-board, not uniform.** Addictive boards run
   NOT ADDICTIVE → ADDICTIVE; harm boards run HARMFUL → HEALTHY. Every `Topic`
   carries `highMeans` saying what a high score means in plain English. Assuming
   a uniform direction is the mistake that silently inverts a result.

9. **`STORE_VERSION` in `lib/store.ts` must be bumped whenever a board's ends
   are swapped or the record shape changes.** Votes are bare 0..1 positions with
   no record of which way the labels ran, so flipping a board turns every
   existing vote into its opposite. Currently `v5`.

10. **Likert band boundaries in `lib/likert.ts` are fixed.** Wording can be
   improved; the cut points must not move once real data exists, because they
   can always be nudged so the number lands in a more quotable band.

11. **Three wording families, one shared geometry.** All use the same ten
   10-point bands, so a percentage sits the same distance from neutral on every
   board and results stay comparable. What differs is grammar, because the
   questions differ in kind:

   | Family | For | Reads like |
   | --- | --- | --- |
   | `addictive` | one property varying in degree | "moderately addictive" |
   | `bipolar` | which of two named poles | "mostly coffee" |
   | `amount` | how much there should be | "a good deal" |
   | `proximity` | how close something is to happening | "a long way off" |
   | `pace` | how much faster or slower | "much slower" |

   Only `bipolar` interpolates the board's pole names. The others have fixed
   wording because their questions aren't about resembling one of two things.

   Don't collapse these into one family. Each exists because the bipolar
   template produced nonsense: "moderately coffee-ish", "fully we're there",
   "fully faster".

   Dial labels are caps and get lower-cased for prose, which mangles proper
   nouns and nouns needing an adjective form. `leftProse` / `rightProse` on a
   board override that — "SF-coded" not "sf-coded", "slightly optimistic" not
   "slightly optimist".

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
| `app/api/predictions/[topic]/route.ts` | stores a distinct prediction and returns its comparison |

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

Predictions are not answers. They use `PredictionRecord` in `lib/store.ts` and a
`predictions:v1` namespace, keyed back to the corresponding vote timestamp.
They are exported only to `export/private/predictions-YYYY-MM.csv`; the random
session id in that file is private for the same reason it is private in votes.

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

Built and deployed on Vercel. A small pre-launch set of real responses exists;
the site has not yet been pushed to a broad audience. Preserve those records and
use a launch-date analysis window rather than deleting them.

Open items are in `DEPLOY-CHECKLIST.md` — briefly: Upstash + Vercel setup (needs
Will's accounts), a social link-preview image, a styled 404, a raw-data export,
and backups.

`QUESTION-DESIGN.md` is the reasoning history: hypotheses considered, things
tried and rejected, and why. Useful for understanding *why* the design is what it
is. Where it disagrees with this file or with the code, the code wins.
