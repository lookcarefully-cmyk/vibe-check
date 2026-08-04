# The next version: vibes over time, data worth analysing, boards anyone can make

Design proposal, not built yet. Written against the site as it stands (37 boards,
one permanent vote each, live on Vercel + Upstash).

Three asks, and they interlock: letting people re-vote changes what a "result"
even means, which changes the data model, which the community boards then have to
fit. So the order below matters — part 1 decides things part 2 depends on.

---

## The one conceptual change everything else follows from

Today a board has **a** number: the mean of everyone who ever voted. That works
because a person votes once, ever.

The moment re-voting exists, that number quietly becomes *the average
person-week*, not *what people think*. Someone who answers 30 weeks running
counts 30 times. The all-time mean stops being a fact about people and becomes a
fact about attendance — and nothing on the page says so.

This is the same failure as rule 2 in `AGENTS.md` (a share-of-people number
sitting next to a position-on-the-scale number, reading as comparable). The fix
is the same shape: **never show a number without the window it covers.**

So the core move is: a board stops being *a number* and becomes *a series*.

---

# Part 1 — Cadence: when can someone vote again?

### The recommendation, up front

| Decision | Choice |
| --- | --- |
| Delete old votes? | **Never.** Append-only, forever. |
| Re-vote unlocked | **Weekly**, on a global boundary (Mon 00:00 UTC), per board |
| Guard | Also require **≥3 days** since that person's last vote on that board |
| Headline number | **Trailing 30 days, one vote per person** (their latest), widened if thin |
| Snapshots | **Daily** rollup per board, stored permanently, recomputable |
| Per-board override | `cadence: "week" \| "month" \| "once"` |

### Why not the monthly full reset

You floated resetting each board monthly. I'd push back hard on that one, and
it's the only idea here I think is actively harmful:

- It destroys the exact time series you want to write about. "The AI doom board
  moved 10 points after this news" is only sayable if the before still exists.
- A reset board reads as dead. Visitors land on "be the first" and leave.
- It throws away the panel (below), which is the most valuable thing this site
  has and the hardest thing for anyone else to replicate.

**Reset eligibility, never data.** Everything a reset would have achieved —
freshness, a reason to come back, a number that reflects *now* — is achieved by
the display window instead, with no loss.

### Why weekly

AI vibes move on a news cycle, not a calendar quarter. Monthly is too slow to
catch "the vibe shifted after this launch." Daily is noise: it invites obsessive
re-voting, and most people's actual opinion doesn't move in 24 hours — you'd be
measuring mood, not position.

Weekly also gives clean cohorts: "week of Mar 3" vs "week of Mar 10" is a
sentence anyone understands, and it lines up with how you'd write about it.

**Global boundary, not a rolling 7 days per person.** A rolling window smears
everyone into their own private schedule and makes week-over-week comparison
mush. A fixed Monday boundary means everyone's re-vote unlocks together, so each
week is a real cohort. The cost: someone who votes Sunday can vote again Monday.
The `≥3 days since your last vote` guard closes that without breaking cohorts.

**Per-board cadence** because not every board is volatile. `slime` is a
comprehension check with a right answer — it should stay `once`. The SF/NYC
boards are jokes; monthly is plenty. AI optimism should be weekly.

### The returning-voter flow (this is the retention mechanism)

When someone eligible returns:

> **You said *moderately optimistic* three weeks ago.** Has that changed?
> [ Same as before ] [ Move the dial ]

Two rules this must respect:

1. **Show them their own previous answer.** It's theirs; no anchoring problem,
   and it's the whole point — "has your vibe shifted" is unanswerable if you
   can't remember what you said.
2. **Do NOT show the current crowd average before they re-answer.** They saw the
   crowd *after their last vote*, which is unavoidable and fine. Re-showing
   today's number at the moment of re-voting would actively pull them toward it,
   and the thing being measured is drift. Withhold, then reveal as usual.

"Same as before" recording an explicit unchanged vote is important — otherwise
stability is indistinguishable from absence, and you'd read a quiet week as a
vibe shift when it's just nobody showing up.

### What the dial shows

Adaptive, and always labelled:

- Default window: **trailing 30 days**, deduped to one vote per person (latest).
- If that window has fewer than **30 responses**, widen (90 days → 365 → all
  time) until it does, and say which.
- Always print the window: *"Average 62% · last 30 days · 214 people"*.
- A **sparkline** under the dial showing the trend, and a full history view.
- All-time remains available, explicitly labelled as *person-weeks, not people*.

The 30-response floor is what stops "AI DOOM SURGES 40 POINTS" when three people
voted on a slow Tuesday.

### The panel is the crown jewel

Sessions are already recorded (`s`), which means this site can do something
almost no public poll does: **measure the same people twice.**

A mean shift is ambiguous — it could be genuine change, or just different people
showing up (composition). Within-person change is not ambiguous:

> Of the 1,240 people who answered in both January and March, **38% moved toward
> doom**, 12% moved toward optimism, and 50% didn't move.

That's a much stronger claim than any mean shift, and it's the writing hook.
Nothing needs building for it beyond keeping session IDs and never deleting —
but every other decision here has to avoid breaking it, which is the main reason
"reset monthly" is out.

Caveat to document honestly: clearing browser storage makes a returning person
look new. That inflates apparent churn and undercounts the panel. It doesn't bias
the *direction* of change, but it should be stated in anything published.

---

# Part 2 — Storage, with the analyst in mind

### Keep Redis for writes; add a real analysis path beside it

Upstash is fine as the write path — fast, serverless-safe, already working, and
`RPUSH` is already append-only with no cap. Don't rebuild it. The gap isn't
writes, it's that **a Redis list is not something you can analyse.**

Proposal: a nightly job reads the log and writes flat files.

```
data/
  votes/YYYY-MM.parquet      one row per vote, full history, partitioned by month
  votes/YYYY-MM.csv          same, for eyeballing
  daily/board-daily.csv      one row per board per day (public-safe)
  codebook.md                every column and board, auto-generated
```

**Why flat files over a database:** you are one person analysing this with an
LLM, not a team running queries. DuckDB reads Parquet directly with no server,
no admin, no credentials — `SELECT * FROM 'votes/*.parquet'` just works, and
pandas/R read the same files. A Postgres would be more machinery for less.

**Where they live:** a public GitHub repo of monthly files. That is simultaneously
the backup (E3 on the deploy checklist), the version history, the citable public
dataset, and the thing that makes "utilize its data for any purposes" real. Free.

### The row shape

One row per vote, denormalised so a single file is self-describing. Joins are a
barrier; storage is free.

| Column | Why |
| --- | --- |
| `vote_id` | stable id for dedup on re-export |
| `board_id`, `board_version` | **critical** — see below |
| `board_question`, `left_label`, `right_label`, `high_means`, `scale_family` | as they were **at vote time** |
| `value` | 0..1, the raw position |
| `value_pct`, `band_index`, `band_label` | convenience, derived |
| `ts_utc` | ISO 8601, not unix ms — sorts and reads correctly everywhere |
| `epoch_week`, `epoch_month` | `2026-W31` / `2026-03`, precomputed |
| `session_id` | the panel. **private column** |
| `vote_seq` | 1 = first ever on this board, 2 = second… |
| `is_first_vote` | lets you isolate the uncontaminated cross-section |
| `prev_value`, `delta`, `days_since_prev` | within-person change, materialised |
| `origin` | `curated` \| `community` — keeps community boards out of your analysis |
| `arm`, `arm_position` | existing experiment fields, kept |
| `client` | `mobile` \| `desktop`, from viewport class |

**`board_version` is the one that will hurt if it's skipped.** If a board's poles
are ever reworded or flipped, every old vote silently changes meaning. Capturing
the labels and a version stamp *on the row* means a 2029 analysis of 2026 data is
still correct without archaeology. `STORE_VERSION` handles the catastrophic case
today; this handles the quiet one.

Adding these fields does **not** require a `STORE_VERSION` bump — old records
still parse, and `epoch_week` is derivable from the existing `t`, so history
backfills cleanly.

### Two exports, different audiences

- **`votes.parquet` — raw, has `session_id`. Keep private.** The linkage across
  boards is the point, and it's also the only mildly sensitive thing here: one
  session's answers across porn, politics and drugs is a small profile. Not
  identifying, but not something to publish casually.
- **`board-daily.csv` — public.** Per board per day: `n`, `mean`, `sd`, `p10`,
  `p50`, `p90`, ten band counts, `n_first_time`, `n_returning`. No session IDs.
  This is what other people build on, and what your charts read.

### The codebook is the deliverable, not an afterthought

Auto-generated from `lib/topics.ts` + `lib/likert.ts`, so it can't drift. Every
board's question, orientation, what a high score means, the band boundaries, and
— most importantly — **how to aggregate correctly**:

> To compute "what people think in week W": filter to that week, keep each
> `session_id`'s highest `vote_seq`, then take the mean. Do **not** mean the raw
> rows; frequent re-voters would be counted repeatedly.

That paragraph is what stops a future analysis (yours or an LLM's) being quietly
wrong. It matters more than any schema decision.

### Snapshots and reproducibility

The daily rollup is technically redundant — you can recompute any window from the
log. Keep it anyway, for one reason that isn't performance: **when you publish
"the board sat at 62% on March 3rd", the snapshot is the receipt.** Recomputing
later after a moderation deletion or a bug fix could yield a different number,
and you'd have no way to show what you actually saw.

---

# Part 3 — Boards anyone can make

### The core insight that makes moderation tractable

Most people making a board want to **share it with their group** — a discord, a
lab, a group chat — not to publish to the world. So:

**Community boards are unlisted by default, with a share link. Public listing is
opt-in and reviewed.**

That single default removes most of the abuse incentive (spam wants an audience,
and an unlisted board has none) and most of the moderation queue, while fully
serving the actual use case.

### Namespace: keep the curated set clean

```
/<slug>       curated boards        — the ones you write about
/b/<slug>     community boards      — anyone's
/b/new        the maker
/b/mine       boards you made (local, no account)
```

Separate namespaces because your writing credibility depends on the curated set
not being polluted by a joke board with 4 votes. `origin` in the data enforces
the same split for analysis.

### The maker

A form with a **live dial preview** — you see the thing you're making as you
type. Fields: question, left pole, right pole, category, cadence.

Two touches worth building:

- **Suggest the scale family** from the pole words (`likert.ts` already has five
  families). "never/always" → `permission`; "faster/slower" → `pace`; "are we
  there" → `proximity`. Most makers won't know these exist, and picking the wrong
  one produces the nonsense the families were invented to prevent.
- **Warn on leading questions.** A one-line LLM check: "This question assumes its
  answer — consider rewording." Not a block, just a nudge. Bad questions are the
  main threat to the library being worth anything.

### Moderation

Layered, cheapest first:

1. **Hard blocks, automatic:** slurs, doxxing patterns, URLs in text, HTML.
2. **LLM classifier before publish:** harassment, sexual content involving minors,
   and specifically **boards targeting a private individual** — "Is [real person]
   a creep?" is a defamation and harassment problem, and it's the single most
   likely way this gets someone hurt. Named public figures in their public
   capacity are fine; private people are not.
3. **Unlisted by default** — no audience, no spam payoff.
4. **Promotion to the public library:** needs ≥N votes *and* a review (yours, or
   an LLM pre-screen you approve).
5. **Report button** on every community board.
6. **Rate limit creation** per IP, same salted-hash approach as votes.

### Ownership without accounts

A `creator_token` in `localStorage` lets the maker edit or delete their board,
shown once as a recovery link ("save this if you want to manage it later"). No
email, no password, consistent with the current no-account promise. Losing the
token means losing control of the board — acceptable, and worth saying plainly.

### The one rule community boards must inherit

**Editing a board's poles after votes exist must be blocked**, not versioned. A
maker who flips HARMFUL/BENEFICIAL after 200 votes inverts all of them. Curated
boards handle this with a human bumping `STORE_VERSION`; community boards get no
human, so the safe default is: once it has votes, the wording is frozen. Fix a
typo, yes; change meaning, no.

---

# Part 4 — The indicator layer (what makes it *checkable*)

You want people to check this like an index. That needs three things beyond the
above:

1. **A history page per board** — the sparkline expanded: the series, the band
   composition over time, first-time vs returning. This is also where you'd read
   your own charts before writing.

2. **Event annotations.** A small curated file of `{date, board, note, url}`
   overlaid on the charts:

   > *Mar 14 — GPT-6 launch* ↓ 8 pts toward doom

   This is *exactly* the "just shifted 10 points following this news" sentence
   you described, and it's cheap — a JSON file you append to. Nothing else here
   generates as much writing material per unit of work.

3. **Auto-generated share cards.** The OG image already renders server-side; make
   it per-board and current: the dial, the number, the window, the trend arrow.
   Someone posting a board link to X shows *the current reading*, which is both
   the growth loop and the "indicator" framing made literal.

Plus a **public read API** (`/api/boards`, `/api/boards/<id>/history`) and the
data downloads, so "utilize its data for any purposes" is true rather than
aspirational.

---

## Sequencing

Each phase is useful alone and doesn't block on the next.

| Phase | What | Why this order |
| --- | --- | --- |
| **1 — BUILT, not deployed** | Epochs + re-voting + returning-voter flow + windowed/labelled headline | Nothing else is meaningful until the time axis exists. Every day without it is a day of data you can't use for trend. |
| **2 — BUILT, not enabled** | Daily snapshots + nightly export + codebook + public data repo | Starts accumulating the record. Also delivers the backup that's currently missing. |
| **3** | History page + sparkline + event annotations + per-board share cards | The visible payoff, and what makes it writable and shareable. |
| **4** | Community boards | Largest surface, most moderation risk, and it benefits from the data model being settled first. |

Phase 1 is the time-critical one: **votes collected before epochs exist are still
usable** (timestamps let epochs be backfilled), but people can't re-vote, so
there's no within-person drift to measure yet. The panel starts the day phase 1
ships.

---

## Decisions taken

- **Public aggregates, raw private** (gated later if ever shared).
- **Community boards get a public library**, plus a trending/popular feed —
  but publishing stays optional, so an unlisted share link remains the default
  path for someone making a board for their group.

## What phase 1 actually shipped (local only — nothing deployed)

| File | What |
| --- | --- |
| `lib/epoch.ts` | ISO weeks, month keys, cadence, eligibility, "3 weeks ago" |
| `lib/aggregate.ts` | `dedupeLatestPerPerson`, `aggregateWindow` (adaptive ladder + change vs previous window), `weeklySeries` |
| `lib/mine.ts` | this browser's own answer history, migrating the old single-value key |
| `lib/topics.ts` | `cadence` and `version` per board; SF/NYC set to monthly |
| `lib/store.ts` | records gained `e` (epoch), `n` (nth answer), `bv` (board version) |
| `app/api/votes/[topic]/route.ts` | server-side cadence gate (409), windowed + series response |
| `components/VibeCheck.tsx` | the returning-visitor screen, window/change line, "reopens in N days" |

Verified: 19 epoch tests (incl. ISO boundary cases like 2020-W53), 15 aggregation
tests (incl. "40 answers from one person counts as 1"), the cadence gate refusing
a same-week second answer, and the full returning-visitor flow in the browser
with a seeded 12-week drift.

## What phase 2 shipped (local only)

`npm run export` reads whichever store is configured and writes:

| Path | Contains |
| --- | --- |
| `export/private/votes-YYYY-MM.csv` | one row per answer, **with session ids — never publish** |
| `export/public/board-weekly.csv` | per board per ISO week, deduped to people |
| `export/public/board-daily.csv` | same, by day |
| `export/public/boards.csv` | the board registry incl. `high_means` |
| `export/public/codebook.md` | generated from the real modules, so it can't drift |
| `export/public/README.md` | how to load it, CC BY 4.0 |

**Snapshots need no new storage.** `.github/workflows/publish-data.yml` exports
nightly, copies only `export/public` into `data/`, and commits — so the git
history of `data/` *is* the snapshot archive: permanent, diffable, citable, and
impossible to quietly rewrite after the fact. It also re-greps the actual bytes
for 32-hex ids before pushing, because one leaked session id can't be recalled.

Not enabled yet: it needs the repo on GitHub plus `KV_REST_API_URL` and
`KV_REST_API_TOKEN` as repo secrets. Until then it never runs.

Verified against a seeded 12-week panel: the codebook's own SQL recipe
reproduces the published `mean` and `n_people` exactly; a 30-day window collapsed
177 answers to 133 people; the leak guard blocks a planted id and passes clean
output.

## What I need from you

1. **Weekly the right beat?** I'm fairly confident for AI, less so across the
   board. The alternative is per-board defaults from the start (weekly for AI,
   monthly for culture, once for calibration) — more setup, better fit.
2. **Public raw data, or aggregates only?** I've assumed aggregates public, raw
   private, because cross-board linkage on sensitive topics deserves a deliberate
   decision rather than a default.
3. **Community boards — public library at all?** The unlisted-by-default share
   link serves the stated use case entirely. A public community library is a
   genuinely different product with a genuinely different moderation burden. It
   can be added later; it can't easily be walked back.
4. **How much moderation do you want to personally do?** That's the difference
   between "reviewed queue" and "LLM auto-approve", and it should be your call,
   not my default.
