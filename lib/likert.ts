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

export type ScaleFamily = "addictive" | "bipolar" | "amount" | "proximity" | "pace";

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
const PACE_LABELS = [
  "far faster",
  "much faster",
  "moderately faster",
  "slightly faster",
  "about right, leaning faster",
  "about right, leaning slower",
  "slightly slower",
  "moderately slower",
  "much slower",
  "far slower",
];

/** Index of the band a 0..1 value falls in. */
function bandIndex(value: number): number {
  const pct = Math.max(0, Math.min(100, value * 100));
  const i = BOUNDS.findIndex((b) => pct >= b.from && pct < b.to);
  return i === -1 ? BOUNDS.length - 1 : i;
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

  if (!poles) return null;
  return BIPOLAR_TEMPLATES[i]
    .replace("{left}", forProse(poles.left, poles.leftProse))
    .replace("{right}", forProse(poles.right, poles.rightProse));
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
    return BIPOLAR_TEMPLATES[i]
      .replace("{left}", forProse(poles?.left ?? "the first", poles?.leftProse))
      .replace("{right}", forProse(poles?.right ?? "the second", poles?.rightProse));
  });
}
