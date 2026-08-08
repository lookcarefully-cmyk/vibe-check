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
  | "alignment"
  | "bipolar"
  | "breadth"
  | "comparative"
  | "conviction"
  | "amount"
  | "proximity"
  | "pace"
  | "permission"
  | "probability";

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
 * How aligned something is with human values and interests. Like `addictive`,
 * this is one property varying in degree, so it takes degree words.
 *
 * Its own family rather than a bipolar board, because "aligned" and
 * "misaligned" are not two rival things you can resemble — they are the two
 * directions of a single quantity. Run through the bipolar templates it
 * produced "neutral, leaning not at all aligned" and "mostly not at all
 * aligned", which reads as a poll about a noun called "not at all aligned".
 *
 * The pair is deliberately misaligned↔aligned rather than not-at-all-aligned↔
 * highly-aligned. The old left pole was ambiguous: "not at all aligned" can
 * mean actively working against human interests, or merely indifferent to
 * them, and those are very different claims to put at the end of a scale.
 * "Misaligned" is the term of art and names the first one.
 */
const ALIGNMENT_LABELS = [
  "completely misaligned",
  "strongly misaligned",
  "moderately misaligned",
  "mildly misaligned",
  "borderline, leaning misaligned",
  "borderline, leaning aligned",
  "mildly aligned",
  "moderately aligned",
  "strongly aligned",
  "completely aligned",
];

/**
 * How widely something reaches — a handful of people through to everyone.
 *
 * Looks bipolar because the poles name two populations, but the thing being
 * measured is one quantity: breadth. The bipolar ladder treats the pole as a
 * thing you resemble, which gives "moderately a very small group" and
 * "neutral, leaning humanity broadly" — eight of the ten bands are not English.
 * Here the band simply names the group being reached.
 */
const BREADTH_LABELS = [
  "almost no one",
  "a very small group",
  "a small group",
  "a limited group",
  "borderline, leaning narrow",
  "borderline, leaning broad",
  "a fairly broad group",
  "a large share of people",
  "the great majority",
  "humanity broadly",
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
 * A comparison against a reference point — easier or harder than last year,
 * better or worse off than your parents, smarter or dumber than before. The
 * midpoint means "about the same", not "undecided".
 *
 * Interpolating like bipolar, but with degree adverbs instead of resemblance
 * ones, because the pole is already a comparative. "Mostly much easier" is not
 * English; "moderately easier" is. Boards here want a bare comparative in
 * leftProse/rightProse — "easier", not "much easier" — since the template
 * supplies the intensity.
 */
const COMPARATIVE_TEMPLATES = [
  "far {left}",
  "much {left}",
  "moderately {left}",
  "slightly {left}",
  "about the same, leaning {left}",
  "about the same, leaning {right}",
  "slightly {right}",
  "moderately {right}",
  "much {right}",
  "far {right}",
];

/**
 * A yes-or-no judgement held with more or less confidence — should you go, is
 * it worth it. The band measures how sure someone is, because the thing being
 * asked about doesn't come in degrees: a house is worth it or it isn't.
 *
 * The bipolar ladder assumes it does, and produces "slightly still worth it"
 * and "fully no". The midpoint here is genuine indecision rather than a middling
 * amount of some property.
 */
const CONVICTION_TEMPLATES = [
  "definitely {left}",
  "almost certainly {left}",
  "probably {left}",
  "leaning {left}",
  "undecided, leaning {left}",
  "undecided, leaning {right}",
  "leaning {right}",
  "probably {right}",
  "almost certainly {right}",
  "definitely {right}",
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

/**
 * A subjective chance from impossible to certain. Kept unidirectional so the
 * displayed number remains the probability the respondent gave, rather than a
 * distance from the midpoint as on a two-pole opinion board.
 */
const PROBABILITY_LABELS = [
  "virtually no chance",
  "very unlikely",
  "unlikely",
  "somewhat unlikely",
  "roughly even, leaning unlikely",
  "roughly even, leaning likely",
  "somewhat likely",
  "likely",
  "very likely",
  "virtually certain",
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
 * The families whose wording is built from the board's own pole names. Everyone
 * else has fixed labels; these three need `poles` and return null without it.
 */
const INTERPOLATED: Partial<Record<ScaleFamily, string[]>> = {
  bipolar: BIPOLAR_TEMPLATES,
  comparative: COMPARATIVE_TEMPLATES,
  conviction: CONVICTION_TEMPLATES,
};

const interpolate = (
  templates: string[],
  i: number,
  poles: { left: string; right: string; leftProse?: string; rightProse?: string },
) =>
  templates[i]
    .replace("{left}", forProse(poles.left, poles.leftProse))
    .replace("{right}", forProse(poles.right, poles.rightProse));

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
  if (scale === "alignment") return ALIGNMENT_LABELS[i];
  if (scale === "breadth") return BREADTH_LABELS[i];
  if (scale === "amount") return AMOUNT_LABELS[i];
  if (scale === "proximity") return PROXIMITY_LABELS[i];
  if (scale === "pace") return PACE_LABELS[i];
  if (scale === "permission") return PERMISSION_LABELS[i];
  if (scale === "probability") return PROBABILITY_LABELS[i];

  if (!poles) return null;
  return interpolate(INTERPOLATED[scale] ?? BIPOLAR_TEMPLATES, i, poles);
}

/*
 * ONE NUMBER MEANS ONE THING: a position on the dial, 0 at the left label and
 * 100 at the right. Every figure the site prints — the average, the 10th and
 * 90th percentiles, your own answer, the chip on the dial face — is that same
 * measurement. Do not add a second percentage convention.
 *
 * There used to be one. Bipolar and pace boards reported *distance toward a
 * pole* instead: an average of 0.40 was printed as "20% not at all aligned",
 * because it sits 20 points of the way from centre to the left end. The
 * motivation was fair — on an optimist↔doomer board a bare "13%" reads like
 * "barely anything" when it actually means strongly toward the left pole — but
 * the cure was worse:
 *
 *   - It contradicted the dial. The needle and its chip say 40%; the sentence
 *     underneath said 20%. Two numbers, same quantity.
 *   - It cannot express an interval. "Most land between 38% and 42%" has no
 *     distance-to-pole equivalent, because a range straddling the midpoint runs
 *     *toward both poles at once*. So the spread stayed in raw position while
 *     the mean did not, and the site published sentences whose average fell
 *     outside its own middle 80%.
 *
 * The thing the old convention was reaching for — what the number *means* — is
 * the band label's job, not a second number's. `bandFor` already says "neutral,
 * leaning not at all aligned" next to the figure, which is what people actually
 * wanted to read.
 */

/** Every label for a family, for documentation and for the "?" panel. */
export function labelsFor(
  scale: ScaleFamily,
  poles?: { left: string; right: string; leftProse?: string; rightProse?: string },
): string[] {
  return BOUNDS.map((_, i) => {
    if (scale === "addictive") return ADDICTIVE_LABELS[i];
    if (scale === "alignment") return ALIGNMENT_LABELS[i];
    if (scale === "breadth") return BREADTH_LABELS[i];
    if (scale === "amount") return AMOUNT_LABELS[i];
    if (scale === "proximity") return PROXIMITY_LABELS[i];
    if (scale === "pace") return PACE_LABELS[i];
    if (scale === "permission") return PERMISSION_LABELS[i];
    if (scale === "probability") return PROBABILITY_LABELS[i];
    return interpolate(INTERPOLATED[scale] ?? BIPOLAR_TEMPLATES, i, {
      left: poles?.left ?? "the first",
      right: poles?.right ?? "the second",
      leftProse: poles?.leftProse,
      rightProse: poles?.rightProse,
    });
  });
}
