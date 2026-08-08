/**
 * The parts of a community board's shape that BOTH the browser and the server
 * need.
 *
 * Split out of lib/boards.ts deliberately: that module imports `node:crypto`
 * for token hashing and slug entropy, and any client component importing from
 * it drags `node:crypto` into the browser bundle, which fails the build outright.
 * Keeping the pure shape helpers here means the maker can preview a board
 * live without the server-only half coming with it.
 */

import type { ScaleFamily } from "./likert";

/**
 * Guess the wording family from the poles.
 *
 * Most people making a board have never heard of these families, and the wrong
 * one produces exactly the nonsense they exist to prevent — "fully we're there",
 * "slightly never". Guessing well matters more than exposing the choice.
 */
export function guessScale(left: string, right: string): ScaleFamily {
  const l = left.toLowerCase();
  const r = right.toLowerCase();
  const pair = `${l} ${r}`;

  if (/\bnever\b/.test(l) && /\balways\b/.test(r)) return "permission";
  if (/\bfaster\b|\bslower\b/.test(pair)) return "pace";
  if (/we'?re there|not even close|already here|nowhere near/.test(pair)) return "proximity";
  if (/\bchance\b|\bcertain\b|\blikely\b|\bunlikely\b/.test(pair)) return "probability";
  if (/\bnone\b/.test(l) && /\ball\b|\bfull\b|\beverything\b/.test(r)) return "amount";
  if (/\baddictive\b/.test(pair)) return "addictive";
  if (/\bmisaligned\b|\baligned\b/.test(pair)) return "alignment";
  return "bipolar";
}

/** Plain-English meaning of a high score, recorded so the data stays readable. */
export function describeHigh(rightLabel: string): string {
  return `closer to ${rightLabel.toLowerCase()}`;
}
