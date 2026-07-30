# What are we actually trying to find out?

Working notes, not settled. The point of writing it down is that the board set
and the *flow between boards* are both determined by the hypothesis, and both
are much cheaper to change now than after real answers exist.

---

## The hypothesis on the table

**H1.** The public's "addictive" is a colloquial intensifier, not the clinical
construct. People will rate shortform social media as highly addictive *and*
place it nearer comic books — the moral panic that amounted to nothing — than
cigarettes. Holding both positions at once is the evidence.

The cigarettes/comic-books board is the trap. Its vagueness is load-bearing:
explain what the two poles stand for and you tell the respondent which answer is
consistent, and anyone who notices the tension will resolve it. That's why the
prompt is now the same generic one as every other board.

---

## Three problems with the current set

These aren't polish. Each one can invalidate H1 specifically.

### 1. "78% addictive" doesn't mean anything on its own

The dial gives a number with no external referent. If shortform social media
comes out at 78% toward addictive, that is not yet a finding — 78% of a scale
whose endpoints respondents defined for themselves. A sceptical reader asks
"compared to what?" and there's no answer.

**DECIDED: label the ends of the dial instead of adding anchor boards.**

We already know roughly where things sit, so the anchors don't need measuring —
they need *showing*. Printing a reference at each end of the addictive scale
fixes the "compared to what?" problem without spending any of the attention
budget on extra questions, which is what makes this the better call.

The trade: fixed anchors *define* the construct for the respondent rather than
letting them define it. That's the intent here, so it's a feature. It does mean
we can't discover where the public independently places gambling or crosswords —
that would need real boards, and it isn't worth the completion cost now.

**One constraint that is easy to get wrong: don't use cigarettes or opioids as
the high anchor.** The trap board's left pole is CIGARETTES. Labelling the
addictive scale's far end "cigarettes" a screen earlier tells the respondent that
cigarettes = maximally addictive, and visually welds the two scales together.
Anyone who rated social media as highly addictive is then likelier to answer
"cigarettes" on the trap — which suppresses the dissociation and makes a null
result uninterpretable. You could no longer tell "no dissociation" from "we
primed it away."

Proposed labels for the addictive boards:

| End | Label | Why |
| --- | --- | --- |
| ADDICTIVE (0) | **gambling** | The one behavioural addiction in the DSM. Sets the bar at real, clinically recognised addiction without naming a substance. |
| NOT ADDICTIVE (1) | **watching paint dry** | Unambiguously nothing. |

Two anchors, not three. A mid-scale label ("crossword puzzles") would also fix
the midpoint and squeeze the variance we're trying to observe.

Anchors are per-board and optional. The addictive boards get them. **The
cigarettes/comic-books boards get none** — vagueness is the whole mechanism
there. The harmful/healthy and society boards would need their own referents, or
none at all.

### 2. Showing results between boards contaminates the trap

Right now: answer a board → see its average → move to the next board. So by the
time someone reaches the cigarettes/comics item they may have already seen what
the crowd said about addictiveness.

For H1 the two answers must be **independent**. A person who has just seen "the
crowd says 78% addictive" is answering the trap in a different state of mind
from someone who hasn't. That's not measurement noise, it's a directional
confound, and it hits the exact comparison the hypothesis rests on.

The per-board anchoring gate that's already built doesn't cover this — it stops
you seeing a board's average before answering *that* board. It doesn't stop
board 1's average influencing board 4's answer.

**Fix: hold every reveal until the core set is finished.** Answer all core
boards in order, then all results appear at once. This also makes the payoff
better — seeing your five answers against five distributions in one go is a
more interesting moment than five separate ones.

### 3. Nothing makes anyone answer more than one board

Cross-board correlation is the entire reason the session ID went in. But the
nav invites people to pick one board and leave. If most visitors answer one and
go, the result is eight separate marginal distributions and **zero usable
correlations** — the session ID would be dead weight and H1 would be untestable,
because H1 is a *within-person* claim.

Worth being blunt: H1 cannot be tested with separate averages. "Average
addictiveness is 78%" and "average cigarettes/comics is 65%" is not evidence
that *the same people* hold both views. Only paired answers show that.

**DECIDED: build a guided run.** After answering, go straight to the next core
board rather than back to the grid. The eight-tile grid stays for browsing, but
the default path is a sequence.

A side benefit: a sequence also stops people seeing "Addictive?" and
"Cigarettes or comics?" side by side in the nav and noticing the tension before
they've answered either.

### The real tension: attention versus evidence

Fair concern — a forced sequence spends attention that pick-and-choose didn't,
and this exists to start conversations and trail a follow-up article. More
participation may genuinely be worth less data quality.

The way to resolve it: **cut length, protect pairing.**

Length is the safe thing to trade. Every item past the first few costs
completions, and shorter is better for reach.

Pairing is not. H1 is a *within-person* claim. "Average addictiveness is 78%"
and "average cigarettes/comics is 65%" is not evidence that the same people hold
both views — only paired answers show that. Let people answer the trap without
the addictive item and the numbers get bigger while the argument disappears.
That's the one trade that loses the thing the project is for.

So: keep the sequence, make it short.

**Strictly, H1 needs only two items:** shortform social media addictive, then
cigarettes or comic books. A two-item run would have very high completion.
Adding the diagnosable-condition item makes the dissociation explicit rather than
inferred, for one more question.

Recommendation: **a three-item core** — roughly thirty seconds — then reveal
everything, then offer the rest as a browsable grid.

---

## Proposed board set

### Core run — everyone, fixed order, no results until the end

Three constructs, one per board, all about shortform social media:

| # | Construct | Board | Poles |
| --- | --- | --- | --- |
| 1 | Addictiveness | `social-addictive` | ADDICTIVE ↔ NOT ADDICTIVE *(anchored: like gambling / like watching paint dry)* |
| 2 | Destructive potential | `social-destructive` | CIGARETTES ↔ EXERCISE |
| 3 | Health impact | `social-healthy` | HARMFUL ↔ HEALTHY |

**Why destructiveness replaced cigarettes-vs-comic-books.** The old item asked
which precedent history would judge this to resemble — partly a prediction about
*society's* future verdict rather than the respondent's own view. Destructiveness
asks directly: given that it's compelling, is the compulsion damaging? That is a
tighter test, because clinical addiction *requires* impairment. Calling something
highly addictive and then calling the habit exercise-like states
compelling-but-harmless, which is exactly not the clinical construct.

The comic-books item survives as an optional board. It's a good question about
moral panics; it just isn't the cleanest test of H1.

**Order.** Addictive first, destructive immediately after — that pair is the
whole of H1 and its direction is load-bearing. Health goes last so it can't
prime either. The run enforces this on entry: arriving on a later core board
from a shared link redirects to the one you should be on, so nobody can run the
sequence backwards.

**Known weakness in board 2.** Exercise is also *healthy*, so an answer there may
partly reflect a health judgement — which is board 3's job. If boards 2 and 3
come back nearly identical, that's the likely cause. A benign-but-not-virtuous
pole ("a coffee habit") would separate the constructs at some cost in vividness.
Recorded in the code so it isn't rediscovered later.

### Second set — optional, browsable, order doesn't matter

The boards already built, which are about your broader interest rather than H1:

- Internet porn: addictive ↔ not addictive
- Shortform social media / internet porn: harmful ↔ healthy
- Shortform social media / internet porn: bad ↔ good for society
- Shortform social media: polarizing ↔ unifying

**BUILT: the trap is replicated on porn.** `porn-addictive` and
`porn-cigarettes` are the same pair on a second subject. If H1 holds for social
media but not porn, or the reverse, that contrast is more interesting than either
result alone. Whether those two join the core run or stay optional is open — my
instinct is optional, to keep the core at three.

### Candidates worth discussing, not yet included

- **Self versus other.** "Is *your own* use harmful?" against the existing
  general version. The third-person effect — people rate others as more affected
  than themselves — is well documented and would show up cleanly here.
- **Usage as a moderator.** "How much shortform video do you watch?"
  (constantly ↔ never). Lets you ask whether heavy users rate it *less*
  addictive, which is a good story either way it lands.
- **Regulation.** "Should it be age-restricted?" Attitudes toward action often
  diverge from harm ratings.

Each of these is a real question. Each also costs completion rate. I'd hold them
for a second wave rather than dilute the first.

---

## Two things to be honest about in anything published

**This is a convenience sample from X.** People who follow a psychology writer
and click a link are not the public. Every number here describes that group. It
does not need to be a limitation — "here's what an engaged, fairly online
audience thinks" is a legitimate framing — but it can't be dressed up as a
population estimate.

**One person can still vote a handful of times.** Rate limiting caps it at five
per board per day per IP, which stops floods but not someone determined with a
phone and a VPN. Fine for a conversation starter; worth a sentence if the numbers
are doing any real work in an argument.

---

## Built

The guided run is live. `lib/run.ts` derives run state from which core boards
have a stored answer — one source of truth, nothing to fall out of step.

- Core run: `social-addictive` -> `social-cigarettes` -> `social-disorder`,
  fixed order, marked by `core: 1|2|3` in `lib/topics.ts`.
- No core result is revealed until all three are answered; then `/results`
  shows every one at once.
- The eight-tile nav is hidden during the run. It's an escape hatch out of the
  sequence, and it shows "Addictive?" and "Cigarettes or comics?" side by side,
  which invites people to spot the tension before answering either.
- Revisiting an already-answered core board mid-run redirects to the next
  unanswered one rather than revealing anything.
- Anchors render on the dial face via `Topic.anchors`. The addictive boards get
  "like gambling" / "like watching paint dry". The trap boards get none.

Verified end to end: a complete run stores three answers under one session id,
and joining on it recovers the paired data H1 needs.

## Decided

1. **Anchors** — dial labels, not boards. Gambling ↔ watching paint dry on the
   addictive boards. None on the trap boards.
2. **Hold results until the core run is finished.** Also a better payoff: seeing
   your answers against every distribution at once beats three separate reveals,
   and it gives people a reason to answer boards they'd have skipped.
3. **Guided run**, kept short. Cut length, protect pairing.
4. **Replicate the trap on porn.** Built.

## Still open

- **Core length: two items or three?** Two is the minimum that tests H1 and will
  have the highest completion. Three adds the clinical-frame item and makes the
  finding explicit rather than inferred. I lean three; if reach matters more than
  the cleanliness of the claim, two is defensible.
- **Do the porn pair join the core run**, or stay in the optional grid?
- **Anchor wording** — "gambling" and "watching paint dry" are proposals, not
  decisions. Anything works as long as the high anchor isn't cigarettes, nicotine
  or opioids.
