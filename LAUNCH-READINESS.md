# Launch readiness — data and traffic

Current as of 2026-08-06. `AGENTS.md` remains the authority for research and
interaction rules; this file records the operational launch audit.

## Plain-language verdict

The response rows already preserve the hard-to-add-later facts needed for useful
analysis: answer, time, anonymous browser, repeat number, cadence epoch, board
wording version, and experiment order. Predictions are separate rows tied to the
exact opinion vote that prompted them. This supports:

- sentiment by day, week, month or event window;
- first-time cross-sections versus returning respondents;
- within-browser change on the same board;
- relationships between answers on different boards;
- prediction error, including opposite-side versus whole-crowd designs;
- coarse rural-to-urban comparisons without collecting precise location.

The live write path remains append-only. Derived hashes make per-browser checks
fast, and a bounded cache materialises the exact windowed/deduped result. Those
derived keys can be rebuilt; they are not research data.

## What 20,000 visitors means here

The board pages and artwork are mostly static and served by Vercel's network.
The database cost comes from API actions: loading a result, voting, predicting,
and browsing community rankings.

After the August hardening:

- a vote does not reread the board's full history to check cadence;
- a prediction does not reread all votes and all earlier predictions;
- a first-time Browse visitor requests no hidden tile averages;
- result GETs and public board lists are edge cached;
- exact result snapshots rebuild every 15–120 seconds depending on board size;
- reaction totals use Redis cardinality rather than downloading member sets.

Synthetic measurements on this codebase:

| Responses on one board | Raw JSON size | Exact crowd + both-side rebuild |
| ---: | ---: | ---: |
| 20,000 | ~1.6 MB | ~40 ms CPU |
| 100,000 | ~7.8 MB | ~160 ms CPU |

A local burst of 500 aggregate requests at concurrency 50 completed with 500
successes. That is a code-path check, not a promise about vendor availability.

## Platform decisions before the public link

### Immediate blocker: repair the public archive credential

The scheduled GitHub export on 2026-08-06 failed because Upstash rejected its
read-only credential (`401 WRONGPASS`). This did not remove or damage live
votes, but it means the public daily archive is not currently advancing.

Before launch, copy a fresh **read-only** token from the same Upstash database
into the GitHub Actions secret `KV_REST_API_READ_ONLY_TOKEN`, confirm
`KV_REST_API_URL` belongs to that database, rerun **Publish data**, and verify it
succeeds. Never paste the token into chat, a commit, or a public issue.

### 1. Upstash: turn on pay-as-you-go and set a budget

The current free allowance is 500,000 commands/month and 10 GB bandwidth. It is
enough for a 20,000-person one-board spike, but not a safe promise if the feed
works and those people answer several boards. Pay-as-you-go is currently $0.20
per 100,000 commands; the first launch is more likely to cost dollars than tens
of dollars. Set a budget alert/cap in the Upstash console rather than accepting
the free tier's hard stop.

Official pricing: <https://upstash.com/pricing/redis>

### 2. Vercel: verify the team plan and usage alerts

Twenty thousand visitors is well below the published one-million monthly
function/edge-request allowances on Hobby, assuming ordinary multi-board use.
Hobby can pause after included usage is exhausted; Pro permits on-demand usage
and longer runtime logs. This project is a non-commercial research project, so
Hobby is eligible, but Pro is the lower-anxiety choice if uninterrupted launch
availability matters more than the monthly fee.

Official plan details: <https://vercel.com/docs/plans/hobby>

### 3. Keep a second private copy of raw data

Upstash persists writes to disk, and paid databases add replication. The GitHub
workflow permanently archives only public aggregates; it deliberately discards
the private CSVs containing anonymous session IDs. Therefore Upstash is still
the only standing copy of the panel data.

Before launch, choose a private backup destination and copy
`export/private/` there on a schedule. Do **not** commit it to this public repo.
An encrypted private cloud folder or encrypted local archive is sufficient at
this scale. Test restoring one copy before treating it as a backup.

Official durability details: <https://upstash.com/docs/redis/features/durability>

## Research caveats that remain true

- A session is a browser, not a verified person. Clearing browser storage makes
  someone new again.
- Cross-board relationships describe self-selected Vibe Check respondents, not
  the national population.
- External benchmark boards can score an individual's guess against a credible
  representative figure; the Vibe Check crowd average remains self-selected.
- The raw private export is pseudonymous but still sensitive because one key can
  link a person's answers across politics, health and relationships.

## Launch-day watch list

1. Refresh the GitHub read-only Upstash secret and verify **Publish data** passes.
2. Confirm the Upstash plan, budget and alert email.
3. Confirm Vercel Usage is visible and notifications reach the owner.
4. Run `npm run export`; store `export/private/` somewhere private and verify the
   public files contain no 32-character session IDs.
5. Open one unanswered Main board, record one real answer, complete or skip its
   prediction, and confirm Next/Exit.
6. Watch error rates, function throttles, Upstash command count and bandwidth
   during the first hour. Do not delete votes if anything looks wrong.
