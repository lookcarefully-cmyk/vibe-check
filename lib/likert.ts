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
 * EVERY family uses the same ten 10-point bands, symmetric about the midpoint.
 * That's deliberate: 74% sits the same distance from neutral on every board, so
 * results stay comparable across questions even though the words differ.
 */

export type ScaleFamily =
  | "addictive"
  | "bipolar"
  | "amount"
  | "proximity"
  | "pace"
  | "permission";

export interface Band {
  /** Lower bound as a percentage, inclusive. */
  from: number;
  /** Upper bound as a percentage, exclusive (except the last, which includes 100). */
  to: number;
}

/** The shared geometry. Only the wording changes between families. */
export const BOUNDS: Band[] = [
  { from: 0, to: 10 },
  { from: 10, to: 20 },
  { from: 20, to: 30 },
  { from: 30, to: 40 },
  { from: 40, to: 50 },
  { from: 50, to: 60 },
  { from: 60, to: 70 },
  { from: 70, to: 80 },
  { from: 80, to: 90 },
  { from: 90, to: 100 },
];

/**
 * How addictive something is. One property varying in degree, so the words are
 * degree words: mildly / moderately / strongly.
 */
const ADDICTIVE_LABELS = [
  "not addictive at all",
  "strongly not addictive",
  "moderately not addictive",
  "mildly not addictive",
  "borderline, leaning not addictive",
  "borderline, leaning addictive",
  "mildly addictive",
  "moderately addictive",
  "strongly addictive",
  "as addictive as it gets",
];

/**
 * Which of two named things it resembles — cigarettes or coffee, polarizing or
 * unifying, harmful or healthy.
 *
 * Different grammar from the addictive family, deliberately. With two named
 * poles you say how close you are to one of them ("mostly coffee"), not how much
 * of a property you have ("moderately coffee-ish"). The pole names are
 * substituted in so the label reads as a sentence about the actual question.
 */
const BIPOLAR_TEMPLATES = [
  "fully {left}",
  "mostly {left}",
  "moderately {left}",
  "slightly {left}",
  "neutral, leaning {left}",
  "neutral, leaning {right}",
  "slightly {right}",
  "moderately {right}",
  "mostly {right}",
  "fully {right}",
];

/**
 * How much of something there should be — none through to all of it. A
 * magnitude, so quantity words rather than degree or proximity words.
 */
const AMOUNT_LABELS = [
  "none at all",
  "barely any",
  "a little",
  "some",
  "a moderate amount, on the low side",
  "a moderate amount, on the high side",
  "a good deal",
  "a lot",
  "almost all of it",
  "everything available",
];

/**
 * How close something is to having happened. 0 = already here, 1 = nowhere near.
 *
 * Its own family because the bipolar templates fall apart here: "fully we're
 * there" isn't English. This is a distance, not a resemblance to one of two
 * named poles.
 */
const PROXIMITY_LABELS = [
  "already here",
  "essentially here",
  "very close",
  "fairly close",
  "borderline, leaning close",
  "borderline, leaning far off",
  "a fair way off",
  "a long way off",
  "very far off",
  "nowhere near",
];

/**
 * How much something should speed up or slow down. 0 = far faster, 1 = far
 * slower, with the midpoint meaning roughly the current rate.
 *
 * Also its own family: the bipolar ladder would produce "fully faster", and the
 * neutral band here means "about the current pace" rather than "undecided".
 */
// 0 = full left (slow down), 1 = full right (speed up), so the dial's low end
// reads as slowing and the high end as accelerating. See the ai-tempo board.
const PACE_LABELS = [
  "slam on the brakes",
  "much slower",
  "moderately slower",
  "slightly slower",
  "about right, leaning slower",
  "about right, leaning faster",
  "slightly faster",
  "moderately faster",
  "much faster",
  "full speed ahead",
];

/**
 * How permissible something should be. 0 = never allowed, 1 = always allowed.
 *
 * Its own family because a never/always axis is about the breadth of cases an
 * allowance covers, not resemblance to one of two poles — the bipolar ladder
 * would produce "slightly never".
 */
const PERMISSION_LABELS = [
  "never, under any circumstances",
  "only in the most extreme cases",
  "rarely, and tightly restricted",
  "in a narrow set of cases",
  "leaning against, case by case",
  "leaning in favour, case by case",
  "in most cases, with some limits",
  "yes, barring a few exceptions",
  "almost always, few restrictions",
  "always, without restriction",
];

/** How many bands every family shares. */
export const BAND_COUNT = BOUNDS.length;

/** Index of the band a 0..1 value falls in. */
export function bandIndex(value: number): number {
  const pct = Math.max(0, Math.min(100, value * 100));
  const i = BOUNDS.findIndex((b) => pct >= b.from && pct < b.to);
  return i === -1 ? BOUNDS.length - 1 : i;
}

/**
 * Roll the aggregate's fine-grained histogram up into the ten Likert bands.
 *
 * Takes raw bucket counts (any bucket count; each bucket is assigned by its
 * centre) and returns one count per band. This is what makes the dial readable
 * as a histogram over the same words the result is quoted in — the bands drawn
 * on the face are the bands the sentence below it uses.
 */
export function bandCounts(counts: number[]): number[] {
  const out = new Array(BAND_COUNT).fill(0);
  const bins = counts.length;
  if (!bins) return out;
  for (let i = 0; i < bins; i += 1) {
    const c = counts[i];
    if (!c) continue;
    out[bandIndex((i + 0.5) / bins)] += c;
  }
  return out;
}

/**
 * Pole labels are stored in caps for the dial. Lower-casing is the right default
 * for ordinary words but wrong for proper nouns, so a board can supply its own
 * prose form instead — see leftProse/rightProse in lib/topics.ts.
 */
const forProse = (label: string, override?: string) => override ?? label.toLowerCase();

/**
 * Band label for a 0..1 value.
 *
 * `poles` is required by the bipolar family and ignored by the others. Returns
 * null when the board has no scale family, so callers can omit the label rather
 * than print something meaningless.
 */
export function bandFor(
  value: number,
  scale: ScaleFamily | undefined,
  poles?: { left: string; right: string; leftProse?: string; rightProse?: string },
): string | null {
  if (!scale) return null;
  const i = bandIndex(value);

  if (scale === "addictive") return ADDICTIVE_LABELS[i];
  if (scale === "amount") return AMOUNT_LABELS[i];
  if (scale === "proximity") return PROXIMITY_LABELS[i];
  if (scale === "pace") return PACE_LABELS[i];
  if (scale === "permission") return PERMISSION_LABELS[i];

  if (!poles) return null;
  return BIPOLAR_TEMPLATES[i]
    .replace("{left}", forProse(poles.left, poles.leftProse))
    .replace("{right}", forProse(poles.right, poles.rightProse));
}

/**
 * Families whose midpoint is a real neutral, so the meaningful number is how far
 * you've leaned toward a pole — not the raw 0..1 position.
 *
 * On a bipolar board, "13%" is baffling: it's strongly toward the LEFT pole, but
 * the number reads like "barely anything". What people mean is "strongly
 * optimistic" — 74% of the way to the optimist end. The other families (a
 * quantity from none to all, a distance, a degree of addictiveness) genuinely
 * run 0→100 and are left as they are.
 */
export function isBidirectional(scale: ScaleFamily | undefined): boolean {
  return scale === "bipolar" || scale === "pace";
}

export interface Reading {
  /**
   * The number to show. For bidirectional boards this is the distance toward a
   * pole (0 at dead centre, 100 at an extreme); for the rest it's the raw
   * position.
   */
  pct: number;
  /** The pole being leaned toward, in prose, or null at exact neutral. */
  toward: string | null;
  /** True only at the exact midpoint of a bidirectional board. */
  neutral: boolean;
}

/**
 * Turn a raw 0..1 position into the number a person should actually see.
 *
 * Bidirectional boards report "62% doomer"; everything else reports its raw
 * percentage. Callers format it — typically `${pct}% ${toward}`, or the word
 * "neutral" when `neutral` is set.
 */
export function reading(
  value: number,
  scale: ScaleFamily | undefined,
  poles?: { left: string; right: string; leftProse?: string; rightProse?: string },
): Reading {
  if (isBidirectional(scale) && poles) {
    const pct = Math.round((Math.abs(value - 0.5) / 0.5) * 100);
    if (pct === 0) return { pct: 0, toward: null, neutral: true };
    const toward =
      value < 0.5
        ? forProse(poles.left, poles.leftProse)
        : forProse(poles.right, poles.rightProse);
    return { pct, toward, neutral: false };
  }
  return { pct: Math.round(value * 100), toward: null, neutral: false };
}

/** Every label for a family, for documentation and for the "?" panel. */
export function labelsFor(
  scale: ScaleFamily,
  poles?: { left: string; right: string; leftProse?: string; rightProse?: string },
): string[] {
  return BOUNDS.map((_, i) => {
    if (scale === "addictive") return ADDICTIVE_LABELS[i];
    if (scale === "amount") return AMOUNT_LABELS[i];
    if (scale === "proximity") return PROXIMITY_LABELS[i];
    if (scale === "pace") return PACE_LABELS[i];
    if (scale === "permission") return PERMISSION_LABELS[i];
    return BIPOLAR_TEMPLATES[i]
      .replace("{left}", forProse(poles?.left ?? "the first", poles?.leftProse))
      .replace("{right}", forProse(poles?.right ?? "the second", poles?.rightProse));
  });
}
