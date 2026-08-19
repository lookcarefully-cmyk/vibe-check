# Perception-Gap Question Bank

> **Update (Aug 2026):** the group-size set below shipped as the live `groups`
> battery at **/gap/groups** — eight boards, each figure verified against its
> primary source. The batteries live at the **/gap** hub. Remaining items here
> are still candidates; verify each primary source before shipping.

A sourced catalogue of candidate items for the "How well do you know your
country?" battery (`/gap`). Each item is a share of people (0–100) with a
**published national figure** to check the guess against — which is what lets
the battery pay off with no crowd present.

Compiled Aug 2026. Every figure here traces to a real source found in research;
none are invented. But **a number in this file is a lead, not a shipped claim.**
Before any item becomes a live `benchmark`, pull the exact current figure from
the primary source and set `fielded` to its real date. See "Sourcing standard"
at the bottom.

## The three flavours (decide the mix deliberately)

The game's framing holds all three, but they feel different and the strongest
ones are not evenly spread:

1. **Group-size misperception (⭐ the flagship).** "What share of Americans are
   gay / Black / millionaires / gun owners?" People overestimate small groups
   dramatically and *consistently* — documented in Nyhan et al., *PNAS* 2025,
   and the Ipsos/YouGov "Perils of Perception" line. This is the most viral kind
   because almost everyone misses in the same direction, by a lot. The benchmark
   is a current Census/Gallup figure; the "people get this wrong" evidence is
   the 2025 PNAS paper.
2. **Sentiment perception gap** (matches the existing benchmark boards). "What
   share are worried about X / would cover $400 / trust others?" Guess what the
   country *feels*. Carries a `pessimism` direction — people read the country as
   bleaker than it is.
3. **Country-by-the-numbers / civic literacy.** "What share own their home / have
   a degree / are foreign-born?" Objective facts about the nation. No gloomy
   direction; scored on accuracy alone.

Legend:  ✅ figure + source in hand   📋 Census ACS, pull exact value from
data.census.gov   ⚠️ widely cited, confirm exact current primary figure
`pess:` = gloomy-guess direction for the `pessimism` field (blank = none).

---

## A · Group size — the flagship set ⭐

Benchmark = current true share. Evidence people overestimate: Nyhan/Sides et al.,
*PNAS* 2025, "Quirks of cognition…"; earlier YouGov 2022.

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| Out of 100 Americans, how many are immigrants (foreign-born)? | ~14% | Census ACS (2023) ✅ | People guess ~30%+ |
| …are Black? | ~13% | Census (2023) ⚠️ | Guessed ~41% (YouGov) |
| …are gay or lesbian? | ~3% | Gallup (2024) ✅ | Guessed ~30% |
| …identify as LGBTQ+ (any)? | 9% | Gallup (2025) ✅ | Rises to 23% under 30 |
| …are transgender? | ~1.3% | Gallup (2024) ✅ | Guessed ~20% |
| …are Muslim? | ~1% | Pew ⚠️ | Guessed ~27% |
| …personally own a gun? | 31% | Gallup (2024) ✅ | Household 44%; guessed ~54% |
| …are vegetarian? | ~5% | ⚠️ confirm primary | Guessed ~30% |
| …earn $1 million+ a year? | <1% | ⚠️ (IRS/Census) | Guessed ~20% |
| …belong to a labor union? | ~10% | BLS (2024) ✅ | 9.9% of wage/salary workers |

**Bonus factual misperception (not a group, but same "you're wildly off" energy):**

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| What share of the **federal budget** goes to foreign aid? | ~1% | KFF (Feb 2025) ✅ | Public guesses ~26%. Legendary gap. |

---

## B · Money & economic security  (sentiment + facts)

Source: Federal Reserve, *Economic Well-Being of U.S. Households in 2024* (SHED,
May 2025) unless noted.

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| …would cover a $400 emergency with cash/equivalent? | 63% | Fed SHED (2024) ✅ | **Already in game** |
| …say they're "doing okay or living comfortably" financially? | 73% | Fed SHED (2024) ✅ | pess: low |
| …(non-retirees) think their retirement savings are on track? | 35% | Fed SHED (2024) ✅ | pess: low |
| …say inflation made their finances worse last year? | 60% | Fed SHED (2024) ✅ | pess: high |
| …own their home? | ~65% | Census ACS (2023) ✅ | Civic-fact flavour |
| …are uninsured (under 65)? | ~10% | Census/CDC (2023) ✅ | Record low; pess: high |

---

## C · Politics & the other side  (sentiment ⭐)

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| Of 100 opposite-party voters, how many hold "extreme" views? | ~30% | More in Common (2019) | **In game.** Pre-2023 but shipped |
| How much do the other side support political violence (0–100)? | ~9.8 | Mernyk et al., PNAS (2020) | **In game.** Pre-2023 but shipped |
| …call themselves political independents? | ~43% | Pew / Gallup (2024) ✅ | |
| …trust the federal government to do right always/most of the time? | 22% | Pew (2024) ✅ | pess: low |
| …are dissatisfied with how democracy is working? | 62% | Pew (2025) ✅ | pess: high |

---

## D · Trust & institutions  (sentiment ⭐, strong gloomy lean)

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| …say "most people can be trusted"? | 34% | Pew (2023–24) ✅ | **In game.** pess: low |
| …trust all/most people in their neighborhood? | 44% | Pew (May 2025) ✅ | pess: low |
| …know all/most of their neighbors? | 26% | Pew (May 2025) ✅ | |
| …have high confidence in US institutions (avg)? | 28% | Gallup (2024/25) ✅ | pess: low |
| …have confidence in higher education? | 38% | Gallup (2024) ⚠️ | pess: low |

---

## E · Social connection, health & wellbeing

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| …feel lonely or isolated all/most of the time? | 16% | Pew ✅ | **In game.** pess: high |
| …have obesity (adults)? | ~40% | CDC NHANES (2021–23) ✅ | pess: high? optional |
| …would help a neighbor (bring in mail, water plants)? | 82% of "trusters" | Pew (2025) ✅ | Reframe needed |

---

## F · Religion & values

Source: Pew *Religious Landscape Study 2023–24* (fielded Jul 2023–Mar 2024,
n≈37,000).

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| …identify as Christian? | ~62% | Pew RLS (2023–24) ✅ | |
| …are religiously unaffiliated ("nones")? | ~29% | Pew RLS (2023–24) ✅ | |
| …pray at least once a day? | 44% | Pew RLS (2023–24) ✅ | |

---

## G · Technology, media & AI

Source: Pew *Americans' Social Media Use* (Jan 2024 / Nov 2025).

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| …use YouTube? | 84% | Pew (2024) ✅ | Guess likely low |
| …use Facebook? | 71% | Pew (2024) ✅ | |
| …use TikTok? | 37% | Pew (2024) ✅ | |
| …are more concerned than excited about AI? | ~50% | Pew (2024/25) ✅ | pess: high? optional |
| …regularly get news from social media (Instagram)? | 20% | Pew (2024) ✅ | |

---

## H · Climate & environment

Source: Yale/GMU *Climate Change in the American Mind* (Fall 2024 / Spring 2025).

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| …think global warming is happening? | 73% | Yale (2024) ✅ | |
| …understand it's mostly human-caused? | 60% | Yale (2024) ✅ | pess: low |
| …are at least somewhat worried about global warming? | ~65% | Yale (2024) ✅ | **In game** (64%). Consistent |
| …say they've personally felt its effects? | 46% | Yale (2024) ✅ | |

---

## I · Work & education

| Question | Real figure | Source (year) | Notes |
|---|---|---|---|
| …(25+) have a bachelor's degree or higher? | ~39% | Census (2024) ✅ | Guess varies wildly |
| …(25+) have at least a high-school diploma? | ~91% | Census (2024) ✅ | Guess likely low |
| …of workers belong to a union? | ~10% | BLS (2024) ✅ | |
| …of workers telework at least sometimes? | ~23% | BLS (2024) ✅ | |
| …who changed jobs say the new one is better? | 62% | Fed SHED (2024) ✅ | |

---

## J · Country-by-the-numbers — Census ACS pulls (📋 high-value, need exact figure)

The user flagged the ACS (census.gov/programs-surveys/acs.html). These are the
gold standard and trivially pullable from data.census.gov — I have the concepts
and table references but should pull the exact current value before shipping.
All make excellent civic-literacy items.

| Question | Where to pull | Table |
|---|---|---|
| …live alone (one-person households)? | ACS 1-yr | DP02 / S1101 |
| …(adults) have never been married? | ACS 1-yr | S1201 |
| …are veterans? | ACS 1-yr | S2101 |
| …commute to work by car (drive alone)? | ACS 1-yr | S0801 |
| …moved homes in the last year? | ACS 1-yr | S0701 |
| …speak a language other than English at home? | ACS 1-yr | S1601 |
| …have a disability? | ACS 1-yr | S1810 |
| …of households have no vehicle? | ACS 1-yr | S2504/DP04 |
| …of children live with two married parents? | ACS 1-yr | S0901 |
| …have health insurance of any kind? | ACS 1-yr | S2701 |

---

## Sourcing standard (do not skip before shipping an item)

1. **Primary source only** on the live board. A news write-up or Statista page is
   a lead; the `benchmark.sourceUrl` must point at Pew/Gallup/Census/Fed/CDC/Yale
   itself.
2. **Exact figure + exact field date.** Set `benchmark.display` to the published
   precision ("about 30%", "63%", "9.8 / 100") and `fielded` to the real survey
   window. Never round in a way the source didn't.
3. **Recency:** field date 2023 or later (the two pre-2023 items already shipped —
   More in Common 2019, Mernyk 2020 — are grandfathered; don't add more that old).
4. **One clean share.** The dial reads 0–100. Dollar amounts (median income
   $83,730) and multi-part questions don't fit — skip or reframe.
5. **`pessimism` only where a gloomy direction is real.** Sentiment items about
   trust/loneliness/finances get it; demographic facts (homeownership, degrees,
   group sizes) do not — a group-size miss is a numeric bias, not cynicism.
6. **Question wording matches the source's construct exactly.** If Pew asked
   "somewhat or very worried", the board can't say "very worried".

## Rough tally

~35 items with a figure + recent source in hand (flavours A, B, C, D, E, F, G,
H, I), plus ~10 Census ACS pulls (J) that are one query each from ready. That's
45–50 solid candidates now, and the ACS is a bottomless well for more civic-fact
items. More than enough to build 4–6 themed batteries of 8.

## Suggested batteries (8 items each keeps the two-minute promise)

- **"The other side"** — extremism, political violence, independents, trust in
  govt, democracy satisfaction, foreign-aid budget, most-people-trusted, guns.
- **"How big is that group?"** (⭐ most shareable) — immigrant, Black, gay,
  LGBTQ+, transgender, Muslim, gun owner, union member.
- **"Your neighbours"** — trust, know neighbours, loneliness, help a neighbour,
  most-people-trusted, live alone, married parents, religiously unaffiliated.
- **"Money"** — $400 emergency, doing-okay, retirement on track, inflation,
  homeownership, uninsured, bachelor's degree, telework.
- **"Believe it or not"** (civic facts) — homeownership, foreign-born, bachelor's,
  HS diploma, Christian, YouTube use, obesity, union.
