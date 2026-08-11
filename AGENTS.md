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

## The front door is the perception-gap battery

`/gap` — "How well do you know your country?" — is eight boards
(`collection: "gap"` in `lib/topics.ts`) whose answers come from Pew, the
Federal Reserve, Gallup, Yale and a PNAS paper rather than from the crowd.
Scored client-side in `lib/gap.ts` from this browser's own saved answers.

**It exists because it is the only thing here that works on an empty site.**
Every other board pays off by showing you the crowd, and with the traffic this
project actually has, that crowd is two or three people. The battery pays off
for a single visitor on day one, which is why it leads the home page.

Two rules follow from that, and both are easy to undo by accident:

1. **`main` stays small.** It is six boards. 202 answers spread over 77 boards
   left every board showing a crowd of three and the reveal — the entire reward
   — never fired for anyone. Demote to `more`; don't add to `main`.
2. **A benchmark board hides its crowd until it has one.**
   `MIN_CROWD_FOR_BENCHMARK` (10) in `components/VibeCheck.tsx` gates the rays,
   bands, spread bracket, AVERAGE chip and stats table. Below it the visitor
   sees their guess against the published figure and nothing else. With one
   respondent, "AVERAGE 52%" is their own guess handed back under an
   authoritative label, sitting beside a real national survey.

`/api/gap` publishes the distribution of finished scores for the percentile on
the results page. It joins eight boards on the per-browser session id **on the
server** and returns bare accuracy numbers — no ids, no timestamps, no
per-question values. `s` never leaves the server, here as everywhere. Rankings
are withheld below `MIN_FINISHERS_FOR_PERCENTILE` (10); the page says how many
have finished instead of dressing three people up as a ranking.

`TopicBenchmark.pessimism` marks which direction of error is the bleaker read of
other people. It is deliberately absent on items with no gloomy direction
(abortion legality, climate worry) — putting those on a cynicism axis would
smuggle in a political judgement. They still count toward accuracy.

## Current focus

The order experiment is **PARKED** — `EXPERIMENT_ENABLED = false` in
`lib/experiment.ts`. Will is reworking the shortform-social-media questionnaire.
Nothing was deleted; flipping the flag brings the whole run back.

Right now the site is a browsable set of research-led dials. Visitors can also
make community boards; those are unlisted by default, moderated through
`/admin`, auto-hidden at four reports, and only reach the home page after owner
approval. Do not bypass those reach gates.

Opening a Main or More board starts a session-scoped randomized board stream. The chosen
board stays first, `rural-urban` is next when it is still answerable (unless it
was the chosen board), and the remaining currently-answerable research boards
are shuffled. Boards this browser already answered and cannot answer again yet,
or whose results it forfeited its vote to see, are skipped. Each available board
appears once; the stream ends instead of wrapping. The floating navigator is the
one clear continuation:
tap/click Next, swipe left on the non-interactive page background, or swipe
up/left on the control itself on a phone. An explicit “Exit” beside it returns
to Explore. Do not bring back the four-tile “More questions” shelf; it recreated
the choice overload this stream exists to remove.

The monthly AI poll boards instead stay in their own stable three-item order. The navigator's
Exit returns to `/pulse`, and reaching the last available item ends rather than
spilling into the community stream. The gold “Answer more questions” action at
the end deliberately starts a fresh randomized Main Set; it preserves momentum
while the separate Exit still returns to the poll page.

The front door leads with the **perception-gap quiz** at `/gap` (see above); the
Main Set, `/explore` and Make a board are the quieter secondary row, and the
monthly AI poll keeps its own card lower down. `/explore` is the
junction between the AI poll, research-led Main Set, and Community. Community is
one mixed browse pool: curated extras and public visitor-made boards are
interleaved, and the six-item preview deliberately guarantees early public
visitor boards some visibility. Visitor-made items remain quietly marked and
retain their board-page safety disclosure; do not imply that curated extras were
visitor submissions. Neither kind may silently enter the Main Set.

The Main Set is six boards, and the site has three reveal instruments. Type 1 boards are
standalone guesses scored against published benchmarks. Type 2/3 boards bank the
visitor's own opinion, then collect a separate prediction of the opposite half
or whole Vibe Check crowd before revealing any result. `revealTypeOf` in
`lib/topics.ts` is the assignment source of truth. Predictions are separate
records under a separate storage namespace; never mix them into vote rows.
Real-figure boards use `cadence: "once"`: after the reveal, a later answer would
measure memory for the published number rather than the original perception gap.
That is why `/gap` never offers a retake — it sends a finished visitor to their
score instead.

The monthly AI poll is a separate, ordered three-question collection at
`/pulse`: perceived current alignment, expected breadth of benefit, and preferred
development speed. Its boards use `collection: "pulse"` and `cadence: "month"`;
they do not enter either randomized library stream. Keep their wording stable —
the entire point is to compare the same measures month to month. Poll reminder
signup is a plain handoff to Substack through `/subscribe`; Vibe Check never
receives the email and must never join newsletter identity to the browser id.

Community creators may choose the original immediate crowd reveal, a whole-crowd
prediction, or an opposite-side prediction. The choice is stored as optional
`CommunityBoard.revealType`; absence means the original reveal, preserving old
boards. Community boards can never declare a `real-figure` benchmark—the owner
must verify every external source used by that instrument.

After answering a visitor-made board, someone may privately choose “More like
this” or “Not for me.” Reactions are recommendation signals, not research rows,
public popularity totals, reports, or automatic moderation. The server accepts
one current choice only from a session that actually voted; dislikes modestly
lower global discovery rank and remove that board from that browser's later
community stream. Reports remain the safety mechanism.

Adding a board is one object in `lib/topics.ts`. It needs `category` (free text,
creates a new browse section if unused) and `scale` (which wording family
translates its percentage into words). It enters the secondary shelf by default;
only `collection: "main"` places it in the focused Main Set. The three monthly
AI poll boards are the only items with `collection: "pulse"`. This is deliberate:
a new idea must not silently dilute the launch data collection.

Removing a board from the public site means setting `retiredFromSite: true`,
never deleting its object. Active boards are split into `MAIN_TOPICS` and
`MORE_TOPICS` in `lib/experiment.ts`; `EXTRA_TOPICS` remains the compatibility
name for Main Set consumers. The registry keeps retired and demoted boards'
wording and poles attached to historical votes and research exports.

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

   On Type 2/3 boards, the opinion is banked before the optional second-marker
   prediction. Results may appear only after the prediction POST succeeds or
   the visitor explicitly chooses “Skip this guess — show me the results.” A
   skip writes only a browser receipt tied to that vote timestamp; it must never
   manufacture a prediction row. This is anchoring-safe because the opinion is
   already committed and cannot be changed. Opposite-side comparisons stay
   suppressed below 10 people; an exact-midpoint opinion has no opposite half
   and falls back, explicitly, to a whole-crowd prediction.

   The choosing dial starts with **no needle, no hub, no dot anywhere**. The
   first click or tap places the classic **red** needle (and its hub) at that
   spot; subsequent taps or a drag re-aim it, and a separate button commits it.
   Never pre-place a midpoint needle, a slider handle, or a baseline dot — a
   restored dot in `902dc02` was removed again in `14c32e8` and must stay gone.

   The same red needle is reused in the result phase, where it swings to the
   crowd mean: one needle, two meanings — your answer becomes the crowd's. Teal
   is still "you", but only in the reveal, where it marks your own answer among
   the crowd (the faint aim line and the outline on your band). It is not the
   colour of the choosing needle.

   **Sharing is a blind invitation.** `SharePrompt` and the Open Graph card send
   only the question, its poles and the canonical board link. Never include the
   visitor's answer, the crowd result, or even the participation count in share
   text or artwork. A recipient must arrive at the same uncontaminated blank dial
   as someone who found the board directly.

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

11. **Several wording families, one shared geometry.** All use the same ten
   10-point bands, so a percentage sits the same distance from neutral on every
   board and results stay comparable. What differs is grammar, because the
   questions differ in kind:

   | Family | For | Reads like |
   | --- | --- | --- |
   | `addictive` | one property varying in degree | "moderately addictive" |
   | `alignment` | how aligned with human values | "borderline, leaning misaligned" |
   | `breadth` | how widely something reaches | "a large share of people" |
   | `bipolar` | which of two named poles | "mostly coffee" |
   | `comparative` | more or less than a reference point | "much harder" |
   | `conviction` | a yes/no held with more or less confidence | "probably yes" |
   | `amount` | how much there should be | "a good deal" |
   | `proximity` | how close something is to happening | "a long way off" |
   | `pace` | how much faster or slower | "much slower" |
   | `permission` | whether something should be allowed, and how widely | "in a narrow set of cases" |
   | `probability` | how likely something is | "somewhat likely" |

   `bipolar`, `comparative` and `conviction` interpolate the board's pole names;
   the rest have fixed wording because their questions aren't about one of two
   named things. A `comparative` board wants a BARE comparative in
   `leftProse`/`rightProse` — "easier", not "much easier" — because the template
   supplies the intensity.
   That also means `leftProse`/`rightProse` do nothing on a non-bipolar board —
   don't add them there expecting an effect.

   **Poles that name two things do not make a board bipolar.** The test is what
   the dial measures. "A VERY SMALL GROUP ↔ HUMANITY BROADLY" names two
   populations but measures one quantity — breadth — so it takes `breadth`;
   through the bipolar ladder it produced "moderately a very small group".
   Likewise MISALIGNED ↔ ALIGNED is one quantity with two directions, not two
   rival nouns. Ask "is the answer *how much of X*, or *which of A and B*?"

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
{ "v": 0.74, "t": 1785620561526, "s": "<random 32-hex>", "g": "A", "p": 2, "e": "2026-W31", "n": 1, "bv": 1 }
```

`v` position 0..1 · `t` unix ms · `s` per-browser random id · `g` arm · `p`
position within the arm (0 outside the experiment) · `e` cadence epoch · `n`
this browser's answer number on this board · `bv` board wording version.

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

**The append-only lists are the source of truth.** `latest-votes:*` and
`latest-predictions:*` hashes are derived request indexes; `live-results:*` is a
short-lived materialisation of the exact `aggregateWindow` result. They exist so
a 20,000-person board does not reread its whole history for every POST. They may
be rebuilt from the raw lists and must never be exported as if they were new
research rows. A busy result may trail writes by up to two minutes; no raw vote
is delayed or dropped.

`lib/live-results.ts` is the only request-time cache for board numbers. It still
calls `aggregateWindow`; do not replace it with increment-only averages, which
cannot correctly handle re-votes, rolling windows or opposite-side partitions.

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

`DEPLOY-CHECKLIST.md` predates the current build. Current capacity and data
readiness are tracked in `LAUNCH-READINESS.md`; the remaining owner decisions
are the Upstash billing tier/budget and a second private copy of the raw export.

`QUESTION-DESIGN.md` is the reasoning history: hypotheses considered, things
tried and rejected, and why. Useful for understanding *why* the design is what it
is. Where it disagrees with this file or with the code, the code wins.
