/**
 * Turns the vote store into files a researcher can actually work with.
 *
 *   npm run export
 *
 * Reads whichever backend is configured — local .data files by default, Upstash
 * when UPSTASH_REDIS_REST_URL / KV_REST_API_URL are in the environment — and
 * writes:
 *
 *   export/private/votes-YYYY-MM.csv   one row per answer, INCLUDING session ids
 *   export/private/predictions-YYYY-MM.csv one row per prediction, INCLUDING session ids
 *   export/public/board-daily.csv      per board per day, no session ids
 *   export/public/board-weekly.csv     per board per ISO week (the cadence unit)
 *   export/public/boards.csv           the board registry, as it is right now
 *   export/public/codebook.md          what every column means, generated
 *   export/public/README.md            how to load it
 *
 * The private/public split is the whole point of the layout: `session_id` links
 * one person's answers across boards, which is what makes the panel analysis
 * possible AND the one mildly sensitive thing here. Everything under public/ is
 * safe to publish as-is.
 *
 * This imports lib/topics.ts and lib/likert.ts rather than parsing them, so the
 * codebook cannot drift from the code the way a hand-written one would.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  store,
  STORE_VERSION,
  type PredictionRecord,
  type VoteRecord,
} from "../lib/store";
import {
  TOPICS,
  cadenceOf,
  revealTypeOf,
  versionOf,
  type Topic,
} from "../lib/topics";
import { allCommunityBoards, toTopic } from "../lib/boards";
import { BOUNDS, bandFor, bandIndex, labelsFor } from "../lib/likert";
import { DAY_MS, monthKey, weekKey } from "../lib/epoch";
import { aggregate, dedupeLatestPerPerson } from "../lib/aggregate";

const OUT = path.join(process.cwd(), "export");
const PRIVATE = path.join(OUT, "private");
const PUBLIC = path.join(OUT, "public");

/** RFC 4180 quoting. Board questions contain commas; unquoted CSV would shear. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Generic over the row type: interfaces like Row have no index signature, so a
// Record<string, unknown> parameter would reject them.
function csv<T extends object>(rows: T[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) {
    const cells = row as Record<string, unknown>;
    lines.push(columns.map((c) => csvCell(cells[c])).join(","));
  }
  return lines.join("\n") + "\n";
}

const iso = (ms: number) => new Date(ms).toISOString();
const dayKey = (ms: number) => iso(ms).slice(0, 10);
const round = (n: number, dp = 4) => Number(n.toFixed(dp));

/** One fully-described answer, with its within-person history resolved. */
interface Row {
  vote_id: string;
  board_id: string;
  board_version: number;
  origin: string;
  board_question: string;
  left_label: string;
  right_label: string;
  high_means: string;
  scale_family: string;
  category: string;
  collection: string;
  cadence: string;
  is_calibration: number;
  value: number;
  value_pct: number;
  band_index: number;
  band_label: string;
  ts_utc: string;
  date_utc: string;
  epoch_week: string;
  epoch_month: string;
  session_id: string;
  vote_seq: number;
  is_first_vote: number;
  prev_value: number | null;
  delta: number | null;
  days_since_prev: number | null;
  arm: string;
  arm_position: number;
}

interface PredictionRow {
  prediction_id: string;
  board_id: string;
  board_version: number;
  reveal_type: string;
  own_value: number;
  prediction_value: number;
  prediction_minus_own: number;
  vote_ts_utc: string;
  prediction_ts_utc: string;
  epoch_month: string;
  session_id: string;
}

function buildPredictionRows(topic: Topic, records: PredictionRecord[]): PredictionRow[] {
  return records.map((r, i) => ({
    prediction_id: `${topic.id}:${r.t}:${r.s.slice(0, 8)}:${i}`,
    board_id: topic.id,
    board_version: r.bv,
    reveal_type: r.k,
    own_value: round(r.o),
    prediction_value: round(r.v),
    prediction_minus_own: round(r.v - r.o),
    vote_ts_utc: iso(r.vt),
    prediction_ts_utc: iso(r.t),
    epoch_month: monthKey(r.t),
    session_id: r.s,
  }));
}

function buildRows(topic: Topic, records: VoteRecord[], origin: string): Row[] {
  const poles = {
    left: topic.leftLabel,
    right: topic.rightLabel,
    leftProse: topic.leftProse,
    rightProse: topic.rightProse,
  };

  // Within-person ordering is what makes prev_value / delta meaningful, so sort
  // by time first and walk each session's own sequence.
  const sorted = [...records].sort((a, b) => a.t - b.t);
  const seen = new Map<string, VoteRecord>();
  const counts = new Map<string, number>();

  return sorted.map((r, i): Row => {
    // Answers with no session id can't be linked to a person, so each is its
    // own sequence of one rather than being chained to a stranger's history.
    const key = r.s ? `s:${r.s}` : `anon:${i}`;
    const seq = (counts.get(key) ?? 0) + 1;
    counts.set(key, seq);
    const prev = seen.get(key);
    seen.set(key, r);

    return {
      vote_id: `${topic.id}:${r.t}:${(r.s || "anon").slice(0, 8)}:${i}`,
      board_id: topic.id,
      // Older answers that predate per-board version stamps are reported as
      // version 1, which is what those original definitions were.
      board_version: r.bv ?? 1,
      origin,
      board_question: topic.question,
      left_label: topic.leftLabel,
      right_label: topic.rightLabel,
      high_means: topic.highMeans,
      scale_family: topic.scale ?? "",
      category: topic.category,
      collection: origin === "community" ? "community" : (topic.collection ?? "more"),
      cadence: cadenceOf(topic),
      is_calibration: topic.calibration ? 1 : 0,
      value: round(r.v),
      value_pct: Math.round(r.v * 100),
      band_index: bandIndex(r.v),
      band_label: bandFor(r.v, topic.scale, poles) ?? "",
      ts_utc: iso(r.t),
      date_utc: dayKey(r.t),
      // Derived from the timestamp when absent, so answers recorded before
      // epochs existed still slot into the series rather than being dropped.
      epoch_week: r.e && r.e.includes("W") ? r.e : weekKey(r.t),
      epoch_month: monthKey(r.t),
      session_id: r.s,
      vote_seq: r.n ?? seq,
      is_first_vote: (r.n ?? seq) === 1 ? 1 : 0,
      prev_value: prev ? round(prev.v) : null,
      delta: prev ? round(r.v - prev.v) : null,
      days_since_prev: prev ? round((r.t - prev.t) / DAY_MS, 2) : null,
      arm: r.g,
      arm_position: r.p,
    };
  });
}

/** Per-period rollup, deduped to one answer per person within the period. */
function rollup(rows: Row[], periodOf: (r: Row) => string, periodColumn: string) {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const k = `${row.board_id}\0${periodOf(row)}`;
    const g = groups.get(k);
    if (g) g.push(row);
    else groups.set(k, [row]);
  }

  return [...groups.entries()]
    .map(([k, group]) => {
      const [board_id, period] = k.split("\0");
      const people = dedupeLatestPerPerson(
        group.map((r) => ({ v: r.value, t: Date.parse(r.ts_utc), s: r.session_id })),
      );
      const agg = aggregate(people.map((p) => p.v));
      const bands = new Array(BOUNDS.length).fill(0);
      for (const p of people) bands[bandIndex(p.v)] += 1;

      return {
        [periodColumn]: period,
        board_id,
        n_people: agg.count,
        n_answers: group.length,
        n_first_time: group.filter((r) => r.is_first_vote === 1).length,
        n_returning: group.filter((r) => r.is_first_vote === 0).length,
        mean: round(agg.mean),
        sd: round(agg.sd),
        p10: round(agg.p10),
        p90: round(agg.p90),
        ...Object.fromEntries(bands.map((c, i) => [`band_${i}`, c])),
      };
    })
    .sort((a, b) =>
      String(a[periodColumn]).localeCompare(String(b[periodColumn])) ||
      String(a.board_id).localeCompare(String(b.board_id)),
    );
}

function codebook(rowColumns: string[], totals: { boards: number; answers: number }): string {
  const families = [
    "addictive",
    "bipolar",
    "amount",
    "proximity",
    "pace",
    "permission",
    "probability",
  ] as const;

  const describe: Record<string, string> = {
    vote_id: "Stable id for one answer. Safe to deduplicate on across re-exports.",
    board_id: "Board slug. Also the URL: /<board_id>.",
    board_version:
      "The board's wording version when this was answered. If a board is ever reworded in a way that changes meaning, this increments — compare like with like by filtering on it.",
    origin: "`curated` for boards in lib/topics.ts. Community-made boards will carry `community`.",
    board_question: "The question as it was worded when this answer was given.",
    left_label: "The 0 end of the scale.",
    right_label: "The 1 end of the scale.",
    high_means:
      "PLAIN ENGLISH MEANING OF A HIGH SCORE. Read this before interpreting any board — direction is not uniform across boards.",
    scale_family: "Which wording family turns the number into words. See the band tables below.",
    category: "Browse section on the site.",
    collection:
      "Editorial shelf: `main` for the focused launch slate, `more` for other curated boards, or `community` for visitor-made boards.",
    cadence: "How often a person may answer this board again: week, month, or once.",
    is_calibration:
      "1 for comprehension checks with a defensible right answer (currently `slime`). NEVER an opinion measure — exclude from substantive results.",
    value: "The answer itself, 0..1, as a position on the spectrum.",
    value_pct: "`value` as a rounded percentage, for readability only.",
    band_index: "0..9, which of the ten Likert bands `value` falls in.",
    band_label: "The words for that band on this board.",
    ts_utc: "When the answer was given, ISO 8601 UTC.",
    date_utc: "Calendar date of `ts_utc`, UTC.",
    epoch_week: "ISO week the answer belongs to, e.g. 2026-W31. The cadence unit for weekly boards.",
    epoch_month: "Calendar month, e.g. 2026-08.",
    session_id:
      "Random per-browser id. THE PANEL KEY — it links one person's answers across boards and across time. Not derived from anything about the person. PRIVATE: do not publish.",
    vote_seq: "1 for this person's first answer to this board, 2 for their second, and so on.",
    is_first_vote:
      "1 when vote_seq = 1. Filter on this to get the clean cross-section of first-ever answers.",
    prev_value: "This person's previous answer to this board, or empty if none.",
    delta: "`value` minus `prev_value` — within-person change. Empty on a first answer.",
    days_since_prev: "Days since this person's previous answer to this board.",
    arm: "Order-experiment arm (A/B/C), or empty outside the experiment. See AGENTS.md.",
    arm_position: "1-based position within that arm; 0 outside the experiment.",
  };

  const bandTable = (family: (typeof families)[number]) => {
    const labels = labelsFor(family, { left: "LEFT", right: "RIGHT" });
    return [
      `| Band | Range | \`${family}\` |`,
      "| --- | --- | --- |",
      ...labels.map((l, i) => `| ${i} | ${BOUNDS[i].from}–${BOUNDS[i].to}% | ${l} |`),
    ].join("\n");
  };

  return `# Codebook

Generated by \`npm run export\` from the live board definitions — do not edit by
hand. Store version \`${STORE_VERSION}\`. ${totals.boards} boards, ${totals.answers} answers.

## Files

| File | Rows | Contains session ids |
| --- | --- | --- |
| \`private/votes-YYYY-MM.csv\` | one per answer | **yes — keep private** |
| \`private/predictions-YYYY-MM.csv\` | one per prediction | **yes — keep private** |
| \`public/board-daily.csv\` | one per board per day | no |
| \`public/board-weekly.csv\` | one per board per ISO week | no |
| \`public/boards.csv\` | one per board | no |

## How to aggregate correctly

**This is the part that decides whether an analysis is right or wrong.**

People may answer a board again on its board-specific cadence. So the raw rows
are *answers*, not *people*. Taking a plain mean over them
measures the average **person-week**: someone who answers thirty weeks running
counts thirty times, and boards with loyal returning voters get pulled toward
whatever those few think.

To get "what people thought during period P":

\`\`\`sql
-- one row per person: their LAST answer within the period
WITH latest AS (
  SELECT *, ROW_NUMBER() OVER (
           PARTITION BY board_id, session_id ORDER BY ts_utc DESC
         ) AS rn
  FROM votes
  WHERE board_id = 'ai-optimist'
    AND ts_utc >= '2026-07-01' AND ts_utc < '2026-08-01'
)
SELECT COUNT(*) AS people, AVG(value) AS mean
FROM latest WHERE rn = 1;
\`\`\`

The pre-aggregated \`board-daily.csv\` / \`board-weekly.csv\` already do this —
their \`n_people\` is deduped, \`n_answers\` is not.

Other rules worth stating once:

- **Direction is not uniform.** Some boards run harmful→healthy, others
  not-addictive→addictive. Always read \`high_means\` before interpreting a mean.
  Averaging across boards without aligning direction is meaningless.
- **Exclude \`is_calibration = 1\`** from every substantive result.
- **First answers are the clean cross-section.** \`is_first_vote = 1\` gives one
  uncontaminated reading per person, unaffected by anyone's re-answering habits.
- **Within-person change beats mean change.** A shift in the mean can be entirely
  composition — different people showing up. \`delta\` on returning answers
  measures the same people moving, which composition can't explain.
- **Sessions are browsers, not humans.** Clearing site data makes a returning
  person look new. This inflates apparent churn; it does not bias direction.

## Columns — \`votes-YYYY-MM.csv\`

| Column | Meaning |
| --- | --- |
${rowColumns.map((c) => `| \`${c}\` | ${describe[c] ?? ""} |`).join("\n")}

## Columns — \`predictions-YYYY-MM.csv\`

Predictions are private and separate from votes. \`own_value\` is the person&rsquo;s
banked opinion; \`prediction_value\` is their second marker; \`reveal_type\` is
\`other-side\` or \`crowd\`; and \`prediction_minus_own\` is the gap between
those two marks, not accuracy against the comparison group. \`vote_ts_utc\`
ties the prediction to one particular weekly/monthly answer. \`session_id\` is
the same private browser key used by votes.

## Columns — \`board-daily.csv\` / \`board-weekly.csv\`

| Column | Meaning |
| --- | --- |
| \`date_utc\` / \`epoch_week\` | The period. |
| \`board_id\` | Board slug. |
| \`n_people\` | Distinct people who answered in the period (deduped to their last answer). |
| \`n_answers\` | Raw answers in the period, before deduping. |
| \`n_first_time\` | Answers that were that person's first ever on the board. |
| \`n_returning\` | Answers that were a revision. |
| \`mean\`, \`sd\`, \`p10\`, \`p90\` | Computed over the deduped people. |
| \`band_0\` … \`band_9\` | How many people fell in each Likert band. |

## The ten bands

Every family shares the same ten 10-point bands, so a given percentage sits the
same distance from neutral on every board. Only the wording differs. \`bipolar\`
substitutes the board's own pole names; LEFT/RIGHT stand in for them here.

${families.map((f) => `### \`${f}\`\n\n${bandTable(f)}`).join("\n\n")}
`;
}

async function main() {
  await fs.mkdir(PRIVATE, { recursive: true });
  await fs.mkdir(PUBLIC, { recursive: true });

  const allRows: Row[] = [];
  const predictionRows: PredictionRow[] = [];
  for (const topic of TOPICS) {
    const records = await store.all(topic.id);
    if (records.length) allRows.push(...buildRows(topic, records, "curated"));
    const predictions = await store.allPredictions(topic.id);
    if (predictions.length) predictionRows.push(...buildPredictionRows(topic, predictions));
  }

  /*
   * Community boards too. Their answers are as real as any other, and an
   * archive that quietly omitted them would misreport totals while looking
   * complete. `origin` keeps them separable, so an analysis of the curated set
   * is one filter away.
   */
  const community = await allCommunityBoards();
  for (const board of community) {
    const records = await store.all(board.slug);
    if (records.length) allRows.push(...buildRows(toTopic(board), records, "community"));
  }
  allRows.sort((a, b) => a.ts_utc.localeCompare(b.ts_utc));

  const columns = Object.keys(
    allRows[0] ??
      ({
        vote_id: "", board_id: "", board_version: 0, origin: "", board_question: "",
        left_label: "", right_label: "", high_means: "", scale_family: "", category: "",
        collection: "",
        cadence: "", is_calibration: 0, value: 0, value_pct: 0, band_index: 0,
        band_label: "", ts_utc: "", date_utc: "", epoch_week: "", epoch_month: "",
        session_id: "", vote_seq: 0, is_first_vote: 0, prev_value: null, delta: null,
        days_since_prev: null, arm: "", arm_position: 0,
      } satisfies Row),
  );

  // Partitioned by month so the files stay small and a month, once written,
  // never changes again — which is what makes them safe to commit and cite.
  const byMonth = new Map<string, Row[]>();
  for (const row of allRows) {
    const g = byMonth.get(row.epoch_month);
    if (g) g.push(row);
    else byMonth.set(row.epoch_month, [row]);
  }
  for (const [month, rows] of byMonth) {
    await fs.writeFile(path.join(PRIVATE, `votes-${month}.csv`), csv(rows, columns));
  }

  const predictionsByMonth = new Map<string, PredictionRow[]>();
  for (const row of predictionRows) {
    const group = predictionsByMonth.get(row.epoch_month);
    if (group) group.push(row);
    else predictionsByMonth.set(row.epoch_month, [row]);
  }
  const predictionColumns: (keyof PredictionRow)[] = [
    "prediction_id", "board_id", "board_version", "reveal_type", "own_value",
    "prediction_value", "prediction_minus_own", "vote_ts_utc",
    "prediction_ts_utc", "epoch_month", "session_id",
  ];
  for (const [month, rows] of predictionsByMonth) {
    await fs.writeFile(
      path.join(PRIVATE, `predictions-${month}.csv`),
      csv(rows, predictionColumns),
    );
  }

  const daily = rollup(allRows, (r) => r.date_utc, "date_utc");
  const weekly = rollup(allRows, (r) => r.epoch_week, "epoch_week");
  const bandCols = BOUNDS.map((_, i) => `band_${i}`);
  const rollupCols = (period: string) => [
    period, "board_id", "n_people", "n_answers", "n_first_time", "n_returning",
    "mean", "sd", "p10", "p90", ...bandCols,
  ];

  await fs.writeFile(path.join(PUBLIC, "board-daily.csv"), csv(daily, rollupCols("date_utc")));
  await fs.writeFile(path.join(PUBLIC, "board-weekly.csv"), csv(weekly, rollupCols("epoch_week")));

  const boardCols = [
    "board_id", "board_version", "origin", "question", "left_label", "right_label",
    "high_means", "scale_family", "category", "collection", "cadence", "is_calibration", "reveal_type",
    "hidden_from_library", "retired_from_site", "benchmark_value", "benchmark_display", "benchmark_unit",
    "benchmark_source_name", "benchmark_source_url", "benchmark_fielded",
  ];
  const communityRows = community.map((b) => {
    const t = toTopic(b);
    return {
      board_id: t.id,
      board_version: 1,
      origin: "community",
      question: t.question,
      left_label: t.leftLabel,
      right_label: t.rightLabel,
      high_means: t.highMeans,
      scale_family: t.scale ?? "",
      category: t.category,
      collection: "community",
      cadence: cadenceOf(t),
      is_calibration: 0,
      reveal_type: "",
      hidden_from_library: b.listed ? 0 : 1,
      retired_from_site: 0,
      benchmark_value: "",
      benchmark_display: "",
      benchmark_unit: "",
      benchmark_source_name: "",
      benchmark_source_url: "",
      benchmark_fielded: "",
    };
  });

  await fs.writeFile(
    path.join(PUBLIC, "boards.csv"),
    csv(
      [...TOPICS.map((t) => ({
        board_id: t.id,
        board_version: versionOf(t),
        origin: "curated",
        question: t.question,
        left_label: t.leftLabel,
        right_label: t.rightLabel,
        high_means: t.highMeans,
        scale_family: t.scale ?? "",
        category: t.category,
        collection: t.collection ?? "more",
        cadence: cadenceOf(t),
        is_calibration: t.calibration ? 1 : 0,
        reveal_type: revealTypeOf(t) ?? "",
        hidden_from_library: t.hiddenFromLibrary ? 1 : 0,
        retired_from_site: t.retiredFromSite ? 1 : 0,
        benchmark_value: t.benchmark?.value ?? "",
        benchmark_display: t.benchmark?.display ?? "",
        benchmark_unit: t.benchmark?.unit ?? "",
        benchmark_source_name: t.benchmark?.sourceName ?? "",
        benchmark_source_url: t.benchmark?.sourceUrl ?? "",
        benchmark_fielded: t.benchmark?.fielded ?? "",
      })), ...communityRows],
      boardCols,
    ),
  );

  await fs.writeFile(
    path.join(PUBLIC, "codebook.md"),
    codebook(columns, { boards: TOPICS.length, answers: allRows.length }),
  );
  await fs.writeFile(path.join(PUBLIC, "README.md"), publicReadme(allRows.length));

  console.log(`store        : ${store.kind}`);
  console.log(`answers      : ${allRows.length}`);
  console.log(`predictions  : ${predictionRows.length}`);
  console.log(`community    : ${community.length} boards`);
  console.log(`months       : ${[...byMonth.keys()].sort().join(", ") || "none"}`);
  console.log(`daily rows   : ${daily.length}`);
  console.log(`weekly rows  : ${weekly.length}`);
  console.log(`\nprivate/  ${PRIVATE}`);
  console.log(`public/   ${PUBLIC}`);
}

function publicReadme(answers: number): string {
  return `# Vibe Check — open data

Aggregate results from [Vibe Check](https://vibe-check-murex.vercel.app): people
place an opinion on a dial, and these files are what the crowd said, over time.

Regenerated by \`npm run export\`. ${answers} answers behind these aggregates.

## Files

- \`board-weekly.csv\` — one row per board per ISO week. **Start here** — a week
  is the unit people are allowed to change their answer on.
- \`board-daily.csv\` — the same, by day.
- \`boards.csv\` — every board: its question, its poles, and what a high score means.
- \`codebook.md\` — what every column means, and **how to aggregate without
  getting it wrong**. Read the aggregation section before using this.

Raw answer-level data is not published: each answer carries a random id linking
one person's answers together, which is what makes tracking change over time
possible and is also the only sensitive thing in the dataset.

## Loading it

\`\`\`sql
-- DuckDB: no server, reads CSV directly
SELECT * FROM 'board-weekly.csv' WHERE board_id = 'ai-optimist' ORDER BY epoch_week;
\`\`\`

\`\`\`python
import pandas as pd
weekly = pd.read_csv("board-weekly.csv")
\`\`\`

To convert to Parquet: \`COPY (SELECT * FROM 'board-weekly.csv') TO 'weekly.parquet';\`

## One thing to know before quoting a number

Direction is not uniform across boards. Some run harmful→healthy, others
not-addictive→addictive. \`boards.csv\` has a \`high_means\` column saying in
plain English what a high score means on that board. Read it first.

## Licence

CC BY 4.0 — use it for anything, including commercially, with attribution.
`;
}

main().catch((err) => {
  console.error("export failed:", err);
  process.exit(1);
});
