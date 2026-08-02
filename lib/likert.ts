/**
 * The dial records a continuous 0..1 position. These bands translate that into
 * words for display and for writing up.
 *
 * Fixed before any data was collected, on purpose. Chosen afterwards, the
 * boundaries can always be nudged so that whatever number came back lands in
 * the more quotable band, and there is no way to prove you didn't. Changing
 * them later is allowed — changing them later *because of what the data said*
 * is not.
 *
 * The scale is continuous, so nothing in the analysis should use these; they
 * exist to make a percentage speakable.
 *
 * The ladder is symmetric about the midpoint — mildly/mildly, clearly/clearly,
 * strongly/strongly — so the two halves are equally weighted in words as well as
 * in numbers. Lopsided wording is its own kind of bias: "very addictive" against
 * "slightly not addictive" makes the addictive half sound louder at equal
 * distances from neutral.
 *
 * Only the wording has changed since these were fixed. The BOUNDARIES are the
 * thing that must not move once data exists, and they haven't.
 */

export interface Band {
  /** Lower bound as a percentage, inclusive. */
  from: number;
  /** Upper bound as a percentage, exclusive (except the last, which includes 100). */
  to: number;
  label: string;
}

/** Applies to boards where a HIGH score means more addictive. */
export const ADDICTIVE_BANDS: Band[] = [
  { from: 0, to: 10, label: "not addictive at all" },
  { from: 10, to: 20, label: "strongly not addictive" },
  { from: 20, to: 30, label: "clearly not addictive" },
  { from: 30, to: 40, label: "mildly not addictive" },
  { from: 40, to: 50, label: "borderline, leaning not addictive" },
  { from: 50, to: 60, label: "borderline, leaning addictive" },
  { from: 60, to: 70, label: "mildly addictive" },
  { from: 70, to: 80, label: "clearly addictive" },
  { from: 80, to: 90, label: "strongly addictive" },
  { from: 90, to: 100, label: "as addictive as it gets" },
];

/** Band label for a 0..1 value, or null if the scale has no bands. */
export function bandFor(value: number, scale?: "addictive"): string | null {
  if (scale !== "addictive") return null;
  const pct = Math.max(0, Math.min(100, value * 100));
  const band = ADDICTIVE_BANDS.find((b) => pct >= b.from && pct < b.to);
  return (band ?? ADDICTIVE_BANDS[ADDICTIVE_BANDS.length - 1]).label;
}
