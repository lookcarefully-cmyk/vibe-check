/**
 * Optional DEMO seeding — writes clearly-synthetic votes so the visualisation
 * can be evaluated before real responses exist.
 *
 *   npm run seed -- 200                  # 200 synthetic votes on every board
 *   npm run seed -- 200 social-addictive # just one board
 *   npm run seed -- 0                    # wipe every board
 *
 * This only touches the local .data/votes-<version>-<topic>.json stores. Never
 * run it against a store holding real public responses.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// Must match STORE_VERSION in lib/store.ts.
const STORE_VERSION = "v3";

/**
 * Invented centres, so the four boards look different while developing.
 * THESE ARE NOT FINDINGS.
 *
 * Every board runs negative-on-the-left: 0 = addictive / harmful, 1 = not
 * addictive / healthy. So a board where opinion leans negative has a LOW mean.
 */
const SHAPES = {
  "social-addictive": { mean: 0.22, sd: 0.13 },
  "porn-addictive": { mean: 0.28, sd: 0.17 },
  "social-healthy": { mean: 0.27, sd: 0.15 },
  "porn-healthy": { mean: 0.22, sd: 0.16 },
  "social-cigarettes": { mean: 0.35, sd: 0.2 },
  "social-polarizing": { mean: 0.18, sd: 0.14 },
  "social-society": { mean: 0.3, sd: 0.18 },
  "porn-society": { mean: 0.26, sd: 0.17 },
};

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

const dir = path.join(process.cwd(), ".data");
await fs.mkdir(dir, { recursive: true });

for (const [topic, shape] of Object.entries(SHAPES)) {
  if (only && topic !== only) continue;
  const votes = Array.from({ length: n }, () =>
    Math.round(Math.min(1, Math.max(0, normal(shape.mean, shape.sd))) * 1000) / 1000,
  );
  const file = path.join(dir, `votes-${STORE_VERSION}-${topic}.json`);
  await fs.writeFile(file, JSON.stringify(votes));
  console.log(`${topic}: ${n} synthetic votes`);
}
