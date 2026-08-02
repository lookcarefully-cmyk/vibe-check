# What we're trying to find out

Current as of the three-arm experiment. For the codebase itself, read
`AGENTS.md` first — where this file and the code disagree, the code wins.

---

## The question

Clinical addiction requires **impairment**. Colloquial "addictive" only means
**hard to stop**. The gap between those two is the whole subject.

**H1.** The public's "addictive" is an intensifier, not the clinical construct.

The problem with testing that directly is that "78% addictive" has no referent —
78% of a scale each respondent invented for themselves. So instead of printing a
referent on the dial (which would replace their concept with ours), the referent
is **measured**, and its position in the sequence is **randomised**. The
comparator and the manipulation are the same item.

---

## The design

| Arm | Order |
| --- | --- |
| A | coffee → shortform social media |
| B | shortform social media → coffee |
| C | slime → shortform social media |

Coffee is the socially acceptable dependence: genuinely habit-forming,
chemically real, near-universal, and not considered a problem.

### What each comparison buys

- **B alone** — shortform social media rated cold, with no comparator. The
  clean unprimed estimate.
- **A vs B** — does having just rated coffee change the rating? Two mechanisms
  predict opposite directions, which is why the prediction has to be written down
  in advance:
  - *Contrast*: coffee sets a high bar, so shortform video scores **lower**.
  - *Semantic licensing*: coffee demonstrates that "addictive" can apply to
    something harmless, lowering the cost of the word, so it scores **higher**.
- **A vs C** — the one that matters. C controls for simply being asked second.
  Without it, "answered after coffee" and "answered second" are perfectly
  confounded and an A-vs-B gap proves nothing about the comparator.
- **Either arm, coffee vs social directly** — is shortform video rated *more*
  addictive than coffee? This one ignores the manipulation entirely, so it holds
  whichever mechanism wins. Caffeine has real physiological dependence and
  recognised withdrawal; "scrolling addiction" has no established diagnosis. If
  the public ranks scrolling above coffee, that's the clinician/lay disconnect in
  a single rank comparison, with no scale interpretation needed.

That last one is probably the headline. It's the most robust thing here.

### Slime

Doubles as the comprehension check. It has a defensible correct answer — the
middle — so an answer slammed at either extreme means the respondent isn't using
the continuum, and their other answers can be dropped.

Judge it with a **wide** band. Slime is non-Newtonian and reasonable people land
anywhere from ~30 to ~70. It's there to catch non-engagement, not to grade
physics.

---

## Before the first real response

**Write the predicted direction down, with a date.** Contrast and semantic
licensing predict opposite results, and a story is available either way. Without
a prior commitment, whatever happens will look predicted.

**Rough sample sizes.** Between-subjects mean comparison, 80% power, two-sided:

| Effect | Per arm |
| --- | --- |
| d = 0.5 | ~64 |
| d = 0.3 | ~176 |
| d = 0.2 | ~394 |

Order effects usually run small-to-moderate, so **~180 per arm** (~540 total
complete runs) is the realistic target. Don't read a gap at n = 40.

---

## Rejected, and why

Kept because the same ideas keep resurfacing.

**Printed anchors on the addictive scale** ("like gambling" / "like watching
paint dry"). Fixes interpretability, but replaces the respondent's concept of
addictive with ours — and the hypothesis is *about* their concept. The game's
convention is that the guesser forms their own extremes. Removed; the anchor is
now a measured item instead.

**Cigarettes ↔ comic books** as the trap. Asked which precedent history would
judge this to resemble — partly a prediction about society's future verdict
rather than the respondent's own view. Deleted.

**Cigarettes ↔ exercise.** Exercise carries a virtue halo, so choosing it can
mean "actively good for you" rather than "the compulsion is harmless", which
drags the item into the health construct. Also badly matched: it varied
substance-vs-behaviour, stigma and physiological dependence all at once. Coffee
holds those roughly constant. Survives as `social-coffee` in the extras.

**Gambling and crossword puzzles as separate anchor boards.** Sound, but each
extra item costs completions, and the coffee item now does the same job while
being the manipulation.

**Randomising everything.** Considered and rejected when the design was
correlational — order effects move means far more than correlations, and a fixed
order applies to everyone equally. That reasoning **does not apply now**: the
order effect is the dependent variable, so randomisation is load-bearing rather
than optional.

---

## Known limits

**Convenience sample from X.** People who follow a psychology writer and click a
link are not the public. "Here's what an engaged, fairly online audience thinks"
is a legitimate framing; a population estimate is not.

**Run order is enforced client-side only.** Anyone clearing storage or posting
to the API directly can answer out of order. Mitigation is analytical and is the
same filter the analysis needs anyway: join on session id, keep complete runs,
and report the completion rate.

**Rate limiting caps one person at five answers per board per day per IP.** That
stops floods, not someone determined with a phone and a VPN.

**Cigarettes are stigmatised in a way coffee isn't**, so part of the
`social-coffee` signal is social disapproval rather than perceived harm.

---

## Open

- Do the porn boards join the experiment? Porn carries heavy perceived moral and
  social damage with thin clinical evidence for addiction, so the same
  manipulation on a second subject would be a sharp contrast. Currently optional,
  which means whatever scattered votes arrive.
- Should the run be extended past two items once completion rates are known?
- A separate collection for children was raised and not designed. Everything here
  assumes adults.
