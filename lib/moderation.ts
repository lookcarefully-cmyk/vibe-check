/**
 * What a community board is allowed to say.
 *
 * Layered cheapest-first: structural checks, then pattern checks, then (later)
 * a model. Everything here is deterministic and runs server-side in a couple of
 * milliseconds, so it costs nothing to run on every submission.
 *
 * This is NOT a complete moderation system and shouldn't be mistaken for one.
 * It is the floor: it stops the obvious, and it is backed up by the fact that
 * community boards are unlisted until someone deliberately publishes them, and
 * reviewed before they reach the public library. Defence in depth, because a
 * word list alone has never held.
 *
 * `LLM_HOOK` below marks where a model check slots in when there's an API key
 * to run it with.
 */

export interface ModerationVerdict {
  ok: boolean;
  /** Shown to the person who wrote it. Plain, not accusatory. */
  message?: string;
  /** Set when the board should exist but never reach the public library. */
  reviewOnly?: boolean;
}

const OK: ModerationVerdict = { ok: true };

/**
 * Slurs and harassment terms. Deliberately not exhaustive and deliberately not
 * printed in full here — this is a floor, not a filter anyone should trust as
 * complete. Matching is on word boundaries to avoid the Scunthorpe problem,
 * where a substring match blocks innocent words containing a bad one.
 */
const BLOCKED_TERMS = [
  "\\bn[i1]gg(er|a)\\b",
  "\\bf[a4]gg?[o0]t\\b",
  "\\bk[i1]ke\\b",
  "\\btr[a4]nny\\b",
  "\\bret[a4]rd(ed)?\\b",
  "\\bch[i1]nk\\b",
  "\\bsp[i1]c\\b",
  "\\bw[e3]tback\\b",
  "\\bcoon\\b",
];

/** Contact details and identifiers — a board is never the place for these. */
const DOX_PATTERNS: [RegExp, string][] = [
  [/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, "what looks like a social security number"],
  [/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/, "an email address"],
  [/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/, "a phone number"],
  [/\b\d+\s+[A-Z][a-z]+\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr)\b/i, "a street address"],
];

/**
 * "Is <Name> a creep?" — a board aimed at one nameable person.
 *
 * This is the single most likely way this feature hurts somebody, and the
 * hardest to catch with patterns, so it flags for review rather than blocking:
 * false positives here are boards about public figures in their public
 * capacity, which are legitimate and shouldn't be silently refused.
 */
// The verb is matched in either case (a question usually starts with it, so it
// is usually capitalised) while the NAME stays deliberately case-sensitive —
// requiring Two Capitalised Words is the whole signal. An /i flag would destroy
// that and match every ordinary sentence.
const PERSON_TARGET =
  /\b(?:[Ii]s|[Ww]as|[Dd]oes|[Dd]id|[Ss]hould|[Hh]as)\s+[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/;

const MAX = { question: 140, label: 28, category: 40 };
const MIN = { question: 10, label: 1 };

export interface BoardDraft {
  question: string;
  leftLabel: string;
  rightLabel: string;
  category: string;
}

/** Structural validity — length, presence, and no markup. */
function checkShape(draft: BoardDraft): ModerationVerdict {
  const q = draft.question.trim();
  if (q.length < MIN.question) return { ok: false, message: "The question is too short." };
  if (q.length > MAX.question)
    return { ok: false, message: `Keep the question under ${MAX.question} characters.` };
  if (!q.includes(" ")) return { ok: false, message: "That doesn't look like a question." };

  for (const [name, value] of [
    ["left label", draft.leftLabel],
    ["right label", draft.rightLabel],
  ] as const) {
    const v = value.trim();
    if (v.length < MIN.label) return { ok: false, message: `Give the ${name} a name.` };
    if (v.length > MAX.label)
      return { ok: false, message: `Keep the ${name} under ${MAX.label} characters.` };
  }

  if (draft.leftLabel.trim().toLowerCase() === draft.rightLabel.trim().toLowerCase())
    return { ok: false, message: "The two ends need to be different." };

  if (draft.category.trim().length > MAX.category)
    return { ok: false, message: `Keep the category under ${MAX.category} characters.` };

  const all = `${draft.question} ${draft.leftLabel} ${draft.rightLabel} ${draft.category}`;
  if (/<[^>]+>/.test(all)) return { ok: false, message: "Markup isn't allowed in a board." };
  // Links can't be rendered anywhere, so a URL is only ever spam bait.
  if (/https?:\/\/|www\./i.test(all))
    return { ok: false, message: "Links aren't allowed in a board." };

  return OK;
}

/** Slurs, doxxing, and boards aimed at a named individual. */
function checkContent(draft: BoardDraft): ModerationVerdict {
  const all = `${draft.question} ${draft.leftLabel} ${draft.rightLabel} ${draft.category}`;
  const lower = all.toLowerCase();

  for (const pattern of BLOCKED_TERMS) {
    if (new RegExp(pattern, "i").test(lower)) {
      return {
        ok: false,
        message: "That wording isn't allowed. Try asking the question without it.",
      };
    }
  }

  for (const [pattern, what] of DOX_PATTERNS) {
    if (pattern.test(all)) {
      return { ok: false, message: `That looks like it contains ${what}. Leave it out.` };
    }
  }

  if (PERSON_TARGET.test(draft.question)) {
    return {
      ok: true,
      reviewOnly: true,
      message:
        "This looks like it's about a specific person, so it won't appear in the public library — but your share link works.",
    };
  }

  return OK;
}

/**
 * Run every check. Async because LLM_HOOK will need it, and changing the
 * signature later would touch every caller.
 */
export async function moderateBoard(draft: BoardDraft): Promise<ModerationVerdict> {
  const shape = checkShape(draft);
  if (!shape.ok) return shape;

  const content = checkContent(draft);
  if (!content.ok) return content;

  // LLM_HOOK — with an API key available, add a model pass here for harassment,
  // sexual content involving minors, and targeting of private individuals. It
  // should be able to downgrade to reviewOnly as well as block outright, and it
  // must fail OPEN to reviewOnly rather than closed: an outage should not become
  // a silent refusal to accept anyone's board.

  return content.reviewOnly ? content : OK;
}

/**
 * A leading question assumes its own answer. Not blocked — plenty of real
 * questions are pointed — but worth saying, because bad questions are the main
 * thing that would make the community library not worth reading.
 */
export function leadingQuestionHint(question: string): string | null {
  const q = question.trim().toLowerCase();
  if (/\b(obviously|clearly|surely|isn't it true|don't you think|admit)\b/.test(q))
    return "This reads as leading — it hints at the answer you expect.";
  if (/\b(stupid|idiotic|insane|evil|disgusting)\b/.test(q))
    return "Strong wording in the question tends to produce the answer it implies.";
  return null;
}
