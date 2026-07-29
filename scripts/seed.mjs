/**
 * Optional DEMO seeding — writes clearly-synthetic votes so the visualisation
 * can be evaluated before real responses exist.
 *
 *   npm run seed -- 200      # 200 synthetic votes
 *   npm run seed -- 0        # wipe the local store
 *
 * This only touches the local .data/votes.json store. Never run it against a
 * store holding real public responses.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const n = Number(process.argv[2] ?? 200);
const FILE = path.join(process.cwd(), ".data", "votes.json");

if (!Number.isFinite(n) || n < 0) {
  console.error("Usage: npm run seed -- <count>");
  process.exit(1);
}

// Box-Muller, centred at 0.68 with sd 0.14 — a plausible-looking opinion spread.
function normal(mean, sd) {
  const u = Math.random() || 1e-9;
  const v = Math.random() || 1e-9;
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const votes = Array.from({ length: n }, () =>
  Math.round(Math.min(1, Math.max(0, normal(0.68, 0.14))) * 1000) / 1000,
);

await fs.mkdir(path.dirname(FILE), { recursive: true });
await fs.writeFile(FILE, JSON.stringify(votes));
console.log(`Wrote ${n} synthetic votes to ${FILE}`);
