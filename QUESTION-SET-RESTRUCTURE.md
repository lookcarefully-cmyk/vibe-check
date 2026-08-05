# Core question-set restructure

Local working note. This is intentionally not a deployment plan.

## What changed

The curated library now leads with the 30 research-led questions from the
August 2026 review, grouped into six sections:

1. Perception gaps
2. Public life
3. Money & work
4. Health & connection
5. Trust, meaning & place
6. Media & technology

A thirty-first context board asks how rural or urban the place someone lives
is. The older curated boards are still present and reachable after the core.
They were not deleted, renamed, or silently reworded, because their existing
votes belong to the wording and orientation under which they were collected.

The home-page shelf now samples the new core rather than leading with AI and
internet-culture questions.

## How the previous questions fit

The previous collection is not bad; it is lopsided.

- `kids-social`, `online-gambling`, `pitbulls`, `college-recommend-2026`,
  `college-worth`, `social-polarizing`, and `ai-tempo` fit the framework well:
  each asks for position on a real continuum and can plausibly move.
- The AI prognosis boards (`agi-here`, `singularity-here`, `opensource-gap`)
  are legitimate continuous estimates, but require insider knowledge and make
  the library look narrower than the intended public instrument.
- The lab, SF/NYC, and Labubu boards work as texture and social
  entry points. They do not support the larger claim about hidden middles or
  public misperception, so they should not define the front door.
- The five chud/chad boards have now been retired from the public site. Their
  definitions and vote records remain archived rather than being deleted.
- The pornography and short-video boards are relevant but cluster several
  near-duplicate framings around the same subjects. They remain intact because
  the experimental items and their historical votes are load-bearing.

The practical decision was therefore to change emphasis and ordering, not to
erase the old collection.

## The location question: useful, with limits

`rural-urban` asks:

> How rural or urban is the place where you live?

with poles `VERY RURAL` and `DENSE URBAN CORE`.

This is worth collecting. Urbanicity is plausibly related to trust, policing,
guns, cost of living, rootedness, social isolation, and views of national
politics. Because the same random browser ID already groups a person's answers,
the latest rural/urban answer can be joined to their other answers in private
analysis.

But it should be described accurately: this is **urbanicity, not location**.
It cannot distinguish Boston from Atlanta, or even two very different rural
places. It is subjective and some people will classify suburbs differently.
Those are acceptable trade-offs for a low-friction context measure.

The privacy advantage is substantial. It collects no city, ZIP code, state,
coordinates, or IP-derived geography. Adding any of those would make a person's
cross-board answer vector easier to identify. Keep the raw joined data private,
do not publish small rural/urban cross-tabs, and suppress any segmented result
with fewer than a defensible minimum number of people.

Monthly re-answering is intentional: the answer is stable for most people but
can change when someone moves.

## Published benchmarks

Three perception-gap boards now reveal a representative published estimate
after a visitor locks in their guess, alongside the Vibe Check distribution:

- perceived extremism: More in Common / YouGov;
- climate worry: Yale Program on Climate Change Communication; and
- average support for partisan violence: Mernyk et al. in PNAS.

The result says how many points the visitor's guess was above or below the
published estimate and links the source. The political-violence board is worded
as a 0–100 support score because that is what the study measured; it does not
misstate the score as a percentage of people.

## Three reveal instruments

The research slate now implements all three reveal types:

- **Real figure:** the guess is the board itself and is scored against a cited
  representative estimate.
- **Other side:** after answering, the visitor places a separate prediction of
  where respondents on the opposite half of that dial landed.
- **Whole crowd:** personal and experiential boards ask for a prediction of the
  full Vibe Check average.

Predictions are written to a separate storage namespace and exported to a
separate private file, so they cannot be confused with opinion votes. An
opposite-side average stays suppressed until that half contains at least ten
people. Someone who answers at exactly 50% has no opposite half, so that case
falls back to predicting the whole crowd and says so explicitly.

One proposed board also exposes a product gap: "If you're not having more
children..." is not applicable to everyone. Until the site records a genuine
"not applicable / no view" response, its result must be interpreted as the
distribution among people willing and able to answer, not among all visitors.
