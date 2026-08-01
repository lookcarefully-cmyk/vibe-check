/**
 * Optional DEMO seeding — writes clearly-synthetic responses so the
 * visualisation and the analysis can be exercised before real answers exist.
 *
 *   npm run seed -- 200                  # 200 synthetic respondents
 *   npm run seed -- 200 social-addictive # only that board
 *   npm run seed -- 0                    # wipe every board
 *
 * Each synthetic respondent gets one session id and answers every board, so the
 * cross-board correlation this project exists to measure is actually present in
 * the demo data. The H1 pattern is deliberately baked in — see below.
 *
 * This only touches the local .data/votes-<version>-<topic>.json stores. Never
 * run it against a store holding real public responses.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Must match STORE_VERSION in lib/store.ts.
const STORE_VERSION = "v4";

/**
 * Invented centres so the boards look different while developing.
 * THESE ARE NOT FINDINGS.
 *
 * Every board runs negative-on-the-left: 0 = addictive / harmful / cigarettes,
 * 1 = not addictive / healthy / coffee. So a board where opinion leans negative
 * has a LOW mean.
 */
const SHAPES = {
  "social-addictive": { mean: 0.22, sd: 0.13 },
  "social-healthy": { mean: 0.45, sd: 0.18 },
  "social-coffee": { mean: 0.62, sd: 0.2 },
  "social-treatment": { mean: 0.55, sd: 0.22 },
  // Calibration: clustered mid-scale, with a few people not engaging at all.
  "social-slime": { mean: 0.5, sd: 0.14 },
  "social-cigarettes": { mean: 0.55, sd: 0.2 },
  "social-disorder": { mean: 0.6, sd: 0.19 },
  "porn-addictive": { mean: 0.28, sd: 0.17 },
  "porn-healthy": { mean: 0.22, sd: 0.16 },
  "porn-cigarettes": { mean: 0.45, sd: 0.2 },
  "social-polarizing": { mean: 0.18, sd: 0.14 },
  "social-society": { mean: 0.3, sd: 0.18 },
  "porn-society": { mean: 0.26, sd: 0.17 },
};

/*
 * Fail loudly when a board exists without a shape. The seeder has silently
 * drifted out of step with lib/topics.ts before — it kept writing v3 files of
 * bare numbers after the record format changed, and produced nothing at all
 * while reporting success. Reading the ids straight from the source means a new
 * board breaks this immediately rather than being quietly skipped.
 */
const topicsSource = await fs.readFile(
  path.join(process.cwd(), "lib", "topics.ts"),
  "utf8",
);
const declaredIds = [...topicsSource.matchAll(/^\s{4}id: "([a-z-]+)",$/gm)].map((m) => m[1]);
if (declaredIds.length === 0) {
  console.error("Could not read any board ids from lib/topics.ts.");
  process.exit(1);
}
const missing = declaredIds.filter((id) => !(id in SHAPES));
const extra = Object.keys(SHAPES).filter((id) => !declaredIds.includes(id));
if (missing.length || extra.length) {
  if (missing.length) console.error("Boards with no shape in this script:", missing.join(", "));
  if (extra.length) console.error("Shapes for boards that no longer exist:", extra.join(", "));
  console.error("Update SHAPES in scripts/seed.mjs to match lib/topics.ts.");
  process.exit(1);
}

/**
 * The hypothesis, written as data: someone who calls shortform social media
 * highly addictive (a LOW score) also leans toward the harmless pole (a HIGH
 * score). That's a negative within-person relationship, and it's the thing the
 * real analysis has to be able to detect.
 *
 * Seeding it means a wrong analysis shows up as "no effect in data that
 * definitely contains one" rather than passing quietly.
 */
const TRAP_PAIRS = [
  ["social-addictive", "social-coffee"],
  ["social-addictive", "social-cigarettes"],
  ["porn-addictive", "porn-cigarettes"],
];
const TRAP_STRENGTH = 0.45;

const n = Number(process.argv[2] ?? 200);
const only = process.argv[3];

if (!Number.isFinite(n) || n < 0) {
  console.error("Usage: npm run seed -- <count> [topic-id]");
  process.exit(1);
}
if (only && !(only in SHAPES)) {
  console.error(`Unknown topic "${only}". Known: ${Object.keys(SHAPES).join(", ")}`);
  process.exit(1);
}

// Box-Muller.
function normal(mean, sd) {
  const u = Math.random() || 1e-9;
  const v = Math.random() || 1e-9;
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const round3 = (x) => Math.round(x * 1000) / 1000;

const byTopic = Object.fromEntries(Object.keys(SHAPES).map((t) => [t, []]));

// Spread timestamps over the last week so time-based analysis has something to
// chew on.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const now = Date.now();

for (let i = 0; i < n; i += 1) {
  const session = randomBytes(16).toString("hex");
  const t = now - Math.floor(Math.random() * WEEK_MS);

  const answers = {};
  for (const [topic, shape] of Object.entries(SHAPES)) {
    answers[topic] = clamp01(normal(shape.mean, shape.sd));
  }

  // Bend each trap board toward the mirror of its paired addictive answer.
  for (const [addictiveBoard, trapBoard] of TRAP_PAIRS) {
    const mirrored = 1 - answers[addictiveBoard];
    answers[trapBoard] = clamp01(
      answers[trapBoard] * (1 - TRAP_STRENGTH) + mirrored * TRAP_STRENGTH,
    );
  }

  for (const [topic, value] of Object.entries(answers)) {
    byTopic[topic].push({ v: round3(value), t, s: session });
  }
}

const dir = path.join(process.cwd(), ".data");
await fs.mkdir(dir, { recursive: true });

for (const topic of Object.keys(SHAPES)) {
  if (only && topic !== only) continue;
  const records = byTopic[topic];
  await fs.writeFile(
    path.join(dir, `votes-${STORE_VERSION}-${topic}.json`),
    JSON.stringify(records),
  );
  console.log(`${topic}: ${records.length} synthetic responses`);
}

if (n > 0 && !only) {
  console.log(`\n${n} synthetic respondents, each answering every board.`);
  console.log("A negative addictive<->cigarettes relationship is baked in on purpose.");
}
