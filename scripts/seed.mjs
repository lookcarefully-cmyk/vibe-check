/**
 * Optional DEMO seeding — writes clearly-synthetic responses so the
 * visualisation and the analysis can be exercised before real answers exist.
 *
 *   npm run seed -- 300        # 300 synthetic respondents
 *   npm run seed -- 0          # wipe every board
 *
 * Respondents are assigned to experiment arms exactly as the site assigns them,
 * and an order effect is deliberately baked in, so a broken analysis shows up as
 * "no effect in data that definitely contains one" rather than passing quietly.
 *
 * This only touches the local .data/votes-<version>-<topic>.json stores. Never
 * run it against a store holding real public responses.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Must match STORE_VERSION in lib/store.ts.
const STORE_VERSION = "v5";

// Must match ARM_ORDER in lib/experiment.ts.
const ARM_ORDER = {
  A: ["coffee-addictive", "social-addictive"],
  B: ["social-addictive", "coffee-addictive"],
  C: ["slime", "social-addictive"],
};

/**
 * Invented centres. THESE ARE NOT FINDINGS.
 *
 * Scale direction differs per board — see `highMeans` in lib/topics.ts. On the
 * addictive boards a HIGH score means MORE addictive.
 */
const BASE = {
  "social-addictive": { mean: 0.74, sd: 0.16 },
  "coffee-addictive": { mean: 0.66, sd: 0.18 },
  slime: { mean: 0.5, sd: 0.14 },
  "perceived-extremism": { mean: 0.52, sd: 0.22 },
  "climate-support-perception": { mean: 0.58, sd: 0.2 },
  "climate-worry-perception": { mean: 0.57, sd: 0.2 },
  "violence-support-perception": { mean: 0.36, sd: 0.22 },
  "violence-support-score-perception": { mean: 0.38, sd: 0.22 },
  "emergency-expense-perception": { mean: 0.48, sd: 0.2 },
  "abortion-legal-perception": { mean: 0.55, sd: 0.22 },
  "loneliness-perception": { mean: 0.34, sd: 0.2 },
  "social-trust-perception": { mean: 0.4, sd: 0.2 },
  "free-expression-perception": { mean: 0.67, sd: 0.2 },
  "disagreement-sources": { mean: 0.58, sd: 0.25 },
  "immigration-status": { mean: 0.58, sd: 0.27 },
  "local-police": { mean: 0.6, sd: 0.25 },
  "gun-laws": { mean: 0.62, sd: 0.27 },
  "prison-purpose": { mean: 0.66, sd: 0.25 },
  "history-classes": { mean: 0.58, sd: 0.25 },
  "climate-income": { mean: 0.31, sd: 0.22 },
  "household-basics": { mean: 0.64, sd: 0.22 },
  "luck-or-effort": { mean: 0.57, sd: 0.24 },
  "home-worth": { mean: 0.55, sd: 0.26 },
  "job-identity": { mean: 0.52, sd: 0.26 },
  "generational-finances": { mean: 0.39, sd: 0.24 },
  burnout: { mean: 0.65, sd: 0.22 },
  "known-by-others": { mean: 0.56, sd: 0.22 },
  "social-life-comparison": { mean: 0.44, sd: 0.23 },
  "medical-bill": { mean: 0.56, sd: 0.27 },
  "relationship-privacy": { mean: 0.56, sd: 0.23 },
  "health-control": { mean: 0.57, sd: 0.22 },
  "wallet-return": { mean: 0.54, sd: 0.24 },
  "beyond-physical": { mean: 0.58, sd: 0.29 },
  "reasons-for-fewer-kids": { mean: 0.49, sd: 0.29 },
  "care-for-parents": { mean: 0.63, sd: 0.23 },
  rootedness: { mean: 0.58, sd: 0.25 },
  "rural-urban": { mean: 0.57, sd: 0.27 },
  "online-self-censorship": { mean: 0.35, sd: 0.22 },
  "division-source": { mean: 0.56, sd: 0.27 },
  "life-without-short-video": { mean: 0.67, sd: 0.23 },
  "official-numbers-trust": { mean: 0.57, sd: 0.28 },
  "person-or-chatbot": { mean: 0.19, sd: 0.2 },
  "ai-lift-or-leave-behind": { mean: 0.52, sd: 0.27 },
  "social-healthy": { mean: 0.3, sd: 0.18 },
  "social-treatment": { mean: 0.55, sd: 0.22 },
  "social-disorder": { mean: 0.6, sd: 0.19 },
  "porn-addictive": { mean: 0.72, sd: 0.17 },
  "porn-healthy": { mean: 0.22, sd: 0.16 },
  "social-polarizing": { mean: 0.18, sd: 0.14 },
  "social-society": { mean: 0.3, sd: 0.18 },
  "porn-society": { mean: 0.26, sd: 0.17 },
  "ai-optimist": { mean: 0.55, sd: 0.24 },
  "agi-here": { mean: 0.6, sd: 0.24 },
  "singularity-here": { mean: 0.75, sd: 0.2 },
  "opensource-gap": { mean: 0.45, sd: 0.22 },
  "anthropic-mandate": { mean: 0.62, sd: 0.22 },
  "openai-mandate": { mean: 0.45, sd: 0.24 },
  "fable-coded": { mean: 0.45, sd: 0.25 },
  "opus-coded": { mean: 0.4, sd: 0.25 },
  "cursor-coded": { mean: 0.25, sd: 0.22 },
  "chatgpt-coded": { mean: 0.35, sd: 0.24 },
  "grok-coded": { mean: 0.3, sd: 0.25 },
  "us-hegemony-end": { mean: 0.55, sd: 0.24 },
  "college-end": { mean: 0.5, sd: 0.24 },
  "kids-social": { mean: 0.15, sd: 0.15 },
  "online-gambling": { mean: 0.4, sd: 0.28 },
  "prediction-markets": { mean: 0.68, sd: 0.24 },
  "llm-smarter": { mean: 0.55, sd: 0.25 },
  "ai-art": { mean: 0.62, sd: 0.26 },
  "ai-jobs": { mean: 0.68, sd: 0.23 },
  "ai-regulation": { mean: 0.5, sd: 0.27 },
  "ai-money": { mean: 0.55, sd: 0.24 },
  "college-worth": { mean: 0.4, sd: 0.25 },
  "opus-chad": { mean: 0.7, sd: 0.2 },
  "fable-chad": { mean: 0.6, sd: 0.22 },
  "chatgpt-chad": { mean: 0.5, sd: 0.24 },
  "gemini-chad": { mean: 0.5, sd: 0.24 },
  "grok-chad": { mean: 0.4, sd: 0.27 },
  "labubu": { mean: 0.3, sd: 0.26 },
  "pitbulls": { mean: 0.45, sd: 0.3 },
  "social-neuro": { mean: 0.45, sd: 0.22 },
  "college-recommend-2026": { mean: 0.5, sd: 0.26 },
  "ai-tempo": { mean: 0.57, sd: 0.26 },
  "mandate-openai-anthropic": { mean: 0.5, sd: 0.26 },
};

/**
 * The order effect, written as data: judging shortform social media AFTER coffee
 * pulls its rating down, because coffee sets a high bar for what "addictive"
 * means. Arm C gets a smaller shift, standing in for a generic
 * being-asked-second effect.
 *
 * If the analysis can't recover these, it's wrong.
 */
const ARM_SHIFT = { A: -0.1, B: 0, C: -0.03 };

const n = Number(process.argv[2] ?? 300);
if (!Number.isFinite(n) || n < 0) {
  console.error("Usage: npm run seed -- <count>");
  process.exit(1);
}

/*
 * Fail loudly when a board exists without a shape. The seeder has silently
 * drifted out of step with lib/topics.ts twice — once writing the wrong store
 * version, once missing new boards — and both times it reported success while
 * producing nothing usable.
 */
const topicsSource = await fs.readFile(path.join(process.cwd(), "lib", "topics.ts"), "utf8");
const declaredIds = [...topicsSource.matchAll(/^\s{4}id: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
if (declaredIds.length === 0) {
  console.error("Could not read any board ids from lib/topics.ts.");
  process.exit(1);
}
const missing = declaredIds.filter((id) => !(id in BASE));
const extra = Object.keys(BASE).filter((id) => !declaredIds.includes(id));
if (missing.length || extra.length) {
  if (missing.length) console.error("Boards with no shape here:", missing.join(", "));
  if (extra.length) console.error("Shapes for boards that no longer exist:", extra.join(", "));
  console.error("Update BASE in scripts/seed.mjs to match lib/topics.ts.");
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

const byTopic = Object.fromEntries(Object.keys(BASE).map((t) => [t, []]));
const arms = Object.keys(ARM_ORDER);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const now = Date.now();

for (let i = 0; i < n; i += 1) {
  const session = randomBytes(16).toString("hex");
  const arm = arms[Math.floor(Math.random() * arms.length)];
  const t = now - Math.floor(Math.random() * WEEK_MS);

  // The experiment itself.
  ARM_ORDER[arm].forEach((topic, index) => {
    const shape = BASE[topic];
    const shift = topic === "social-addictive" ? ARM_SHIFT[arm] : 0;
    byTopic[topic].push({
      v: round3(clamp01(normal(shape.mean + shift, shape.sd))),
      t,
      s: session,
      g: arm,
      p: index + 1,
    });
  });

  // Some people carry on into the browsable extras.
  if (Math.random() < 0.45) {
    for (const topic of Object.keys(BASE)) {
      if (ARM_ORDER[arm].includes(topic)) continue;
      if (Math.random() > 0.6) continue;
      const shape = BASE[topic];
      byTopic[topic].push({
        v: round3(clamp01(normal(shape.mean, shape.sd))),
        t: t + 60_000,
        s: session,
        g: "",
        p: 0,
      });
    }
  }
}

const dir = path.join(process.cwd(), ".data");
await fs.mkdir(dir, { recursive: true });
for (const topic of Object.keys(BASE)) {
  await fs.writeFile(
    path.join(dir, `votes-${STORE_VERSION}-${topic}.json`),
    JSON.stringify(byTopic[topic]),
  );
  console.log(`${topic.padEnd(20)} ${byTopic[topic].length}`);
}

if (n > 0) {
  console.log(`\n${n} synthetic respondents across arms A/B/C.`);
  console.log("An order effect on social-addictive is baked in on purpose:");
  console.log("  arm A (coffee first) shifted -0.10, arm C -0.03, arm B unshifted.");
}
