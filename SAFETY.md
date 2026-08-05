# Safety & content policy

How Vibe Check keeps community-made boards from becoming a vector for harm,
what's actually built to enforce it, and what's still a judgement call for the
owner. Written plainly because a policy nobody can follow is decoration.

The tension this manages: the whole point of community boards is that anyone can
ask a question, and most people asking one mean no harm. But "anyone can publish
a question to a public audience" is, unmanaged, a harassment and hate-speech
surface. The design leans on one idea — **most people want to share with their
group, not the world** — so the default is private, and every step toward a
wider audience adds a stronger check.

---

## The three tiers, and what gates each

A board's reach is earned, not automatic.

| Tier | Where it appears | What it takes to get there |
| --- | --- | --- |
| **Unlisted** | Its own link only | Just being created. Passes the automated floor. |
| **Listed** | The `/b` library | The creator chooses to publish. Still only the floor. |
| **Featured** | The **home page** | **The owner approves it.** A human decision. |

This is the core safety property: **nothing reaches the front page without you
approving it.** A creator can publish their own board to the browsable library,
but the place where every first-time visitor looks is curated by hand. An
approval that's never given means an empty (safe) home-page section, not an open
door.

---

## What is not allowed

A board — its question, its two ends, its category — may not contain or promote:

1. **Slurs and dehumanising hate** aimed at a protected class (race, ethnicity,
   religion, national origin, gender, sexual orientation, disability).
2. **Harassment of, or a question targeting, a private individual.** "Is
   [real private person] a creep?" is out. Public figures, in their public
   capacity, are fair game — "Does [politician] deserve re-election?" is fine.
3. **Sexual content involving minors**, in any framing. Zero tolerance, no review
   path — removed and not reinstated.
4. **Incitement to violence** or credible threats.
5. **Doxxing** — phone numbers, addresses, emails, government IDs, or anything
   that identifies a specific person.
6. **Spam, scams, and links.** Boards can't render links, so a URL is only ever
   bait.

Boards that are merely provocative, political, crude, or that you personally
disagree with are **allowed**. The instrument is for contested questions; a
policy that removed everything uncomfortable would defeat it. The line is harm to
people, not discomfort with opinions.

---

## How it's enforced — what's actually built

Layered, cheapest first. Each layer is a floor, not a guarantee; they back each
other up.

1. **Automated screen at creation** (`lib/moderation.ts`). Structural checks
   (length, no markup, no links), a slur list matched on word boundaries (so
   "Scunthorpe" survives), doxxing patterns, and a check for boards aimed at a
   named individual — which flags for review rather than blocking, because the
   false positives are legitimate public-figure questions.

2. **Unlisted by default.** The single most effective control: a board with no
   audience is not worth anyone's effort to abuse.

3. **Reporting** (the "Report this board" control on every community board). Any
   visitor can flag a board; reports are rate-limited to one per connection per
   board so a lone actor can't run the count up. At **4 reports** a board is
   auto-hidden from the library and front page — kept, never deleted, still
   reachable by its link — and marked for your review.

4. **The moderation panel** (`/admin`, gated by `ADMIN_TOKEN`). Lists every
   community board, reported ones first, with one-click **approve** (to the home
   page), **hide** (pull from public view, keep the board), **restore**, and
   **delete** (permanent). This is the backstop: there is always a way to remove
   anything, including a board whose creator won't take it down themselves.

### The gap, stated honestly

The automated screen is a **keyword-and-pattern floor**. It will not catch hate
speech that avoids slurs, coded language, or a genuinely harmful question phrased
politely. Today the real safety net for those is the combination of *nothing
reaches the home page without your approval* + *reporting* + *takedown*. That is
adequate at low volume. It is **not** adequate for a large, adversarial audience
hitting the `/b` library directly.

The next control, when there's an API budget for it, is a **model classifier**
in the create path (`LLM_HOOK` in `lib/moderation.ts`): a check for harassment,
hate, and CSAM that runs before a board is even created. It must **fail open to
review, not closed** — an outage should queue boards for a human, never silently
reject everyone. Until then, keep the `/b` library link less prominent than the
curated set, and check the moderation panel regularly.

---

## Operating it

- **Approvals:** boards only reach the home page when you approve them in
  `/admin`. Check it before pointing a large audience at the site.
- **Reports:** a board with reports, or `UNDER REVIEW`, sits at the top of the
  panel. Decide: restore (a false alarm), hide (borderline), or delete (a real
  violation).
- **The token:** `ADMIN_TOKEN` is the only thing standing between the internet
  and the delete button. Keep it out of chats, screenshots, and the repo. Rotate
  it if it's ever exposed.
- **Appeals:** there is no account system, so there's no formal appeal channel.
  A creator who thinks a takedown was wrong can remake the board or reach you
  directly. Document that decision if you publish anything about the data.

## Data-side safety

Separate from board content: the **votes** themselves carry no name, email, or
IP — only a random per-browser id. That id links one person's answers together
(needed for the trend analysis) and is the one mildly sensitive thing in the
dataset, which is why raw per-answer data stays private and only aggregates are
published. See `AGENTS.md` and the export codebook.
