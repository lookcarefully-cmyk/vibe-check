# Going live — checklist for review

Nothing in here is done yet. Review, cut what you don't want, then we work
through it.

Each item is tagged:

- **[me]** I can do it start to finish.
- **[you]** Needs your login, your card, or your decision. I'll walk you through it.
- **[both]** I do the work, you click one thing.

---

## A. Blockers — it will not work on the internet without these

### A1. Move vote storage to Upstash Redis **[both]**

Right now votes go to JSON files on disk. Vercel's filesystem is read-only and
throws your server away between requests, so **every vote would be lost, or
error out.** This isn't a polish item; the site is non-functional online without
it.

The code already supports Upstash — it switches automatically when two
environment variables are present. So this is account setup, not programming:
you make a free Upstash database, paste two values into Vercel, done.

Free tier is 10,000 commands/day. Each vote is ~2 commands, each page view ~1.
Fine unless a post goes properly viral.

### A2. Wipe the fake seed data **[me]**

All eight boards currently hold 200 invented votes each. I made those numbers up
so I could see the graphics working. **If you launch as-is, every "average" on
the site is fiction**, and any Substack post quoting them would be quoting me
guessing. Real collection starts from zero.

### A3. Deploy to Vercel **[both]**

Free tier, connect the GitHub repo, it builds on push. Needs a GitHub account
and a Vercel account. ~20 minutes, mostly you clicking through signup.

### A4. Pick the address **[you]**

Options: a free `something.vercel.app` subdomain, or a custom domain (~$12/yr).
A custom domain looks more legitimate when a stranger lands on it from Substack.

---

## B. Decide before collection starts — these can't be fixed later

This is the section I'd most want you to actually read. Everything here is
cheap now and impossible to backfill once real people have voted.

### B1. Store a timestamp with each vote? **[you decides, me implements]**

Right now a vote is a bare number. No date, no time. That means you can never
write "responses in the first week skewed harder than later ones," or chart
opinion over time, or separate the Substack launch spike from the long tail. You
also can't spot a burst of votes that arrived in one suspicious minute.

Adding a timestamp is ~15 minutes of work. Adding it **after** 500 people have
voted means those 500 are permanently undated.

My recommendation: add it. It costs nothing and it's the difference between a
dataset and a running total.

### B2. Store which board-set a session answered? **[you]**

Deliberately not collected today, and the disclosure promises this: nothing links
your answers across boards. That's a real privacy property — but it also means
you can never write "people who called it addictive also called it harmful."
Correlations between boards are the most interesting thing a multi-board survey
can produce, and right now they are impossible by construction.

You can't have both. Pick:

- **Keep it unlinked.** Disclosure stays as strong as it is. You lose all
  cross-board analysis forever.
- **Add a random session ID.** Enables correlations. The disclosure must then
  change to say answers are linked to each other by a random ID, which is
  honest but weaker — and it matters more than usual because one of these boards
  is about porn.

My recommendation: keep it unlinked for launch. It's the more defensible promise
for these particular topics, and a weaker privacy claim is not something you can
walk back after people have answered.

### B3. Raise or remove the 20,000-vote cap **[me]**

At 20,000 votes per board, the oldest votes get silently deleted to make room.
Averages would then quietly start meaning "the most recent 20,000 people"
without anything on the page saying so. Unlikely to be reached, trivial to fix
now, genuinely misleading if it ever happens unnoticed.

---

## C. Abuse resistance — pick a level

Today, one determined person with a browser console can add 10,000 votes to any
board in a minute. Nothing stops them. For a private demo that's irrelevant; for
numbers you're going to publish under your name, it's the weakest part of the
whole thing.

The `localStorage` check is a politeness measure. It stops accidental double
voting. It stops nothing else — incognito, a different browser, or clearing site
data all reset it.

Pick one:

- **Level 0 — do nothing.** Fine if you treat results as a conversation
  starter, not evidence. If you publish these numbers, publish this caveat too.
- **Level 1 — rate limit by IP (recommended).** ~1 hour. A few votes per board
  per IP per day. Stops casual stuffing and scripted floods. Doesn't stop someone
  with a VPN who really cares.
- **Level 2 — Level 1 plus a bot check** (Cloudflare Turnstile, the invisible
  kind). ~2 hours, adds a third-party script, and the disclosure would need to
  say so since it currently promises no third-party scripts.

My recommendation: Level 1. Level 2's cost is a promise you've already made to
visitors.

### C1. Reject POSTs from other websites **[me]**

Separate from rate limiting and quick (~20 min). Right now any website can post
votes to your API from its own pages. Checking the request's origin closes the
easy version of this.

---

## D. So it looks right when shared

### D1. Link preview image and favicon **[me]**

There's no `public/` folder, no favicon, no social preview image. A link shared
on Substack, Twitter or in a text message currently shows a blank box and a bare
URL. I'd render a preview card from the actual dial artwork — it's the most
on-brand thing available and it's the first thing anyone sees.

### D2. Styled 404 **[me]**

A mistyped board URL shows Next.js's default error page, which looks nothing
like the site. ~15 minutes.

### D3. How does this reach Substack readers? **[you]**

Worth deciding before launch, because it changes what I build:

- **A plain link** in the post. Always works, including in the email version.
- **An embed** inside the web post. Substack restricts which embeds run, and
  interactive embeds generally do not work in the emailed copy — so email
  subscribers would see nothing. I'd need to check what Substack currently
  permits before promising this.

If email subscribers are most of your audience, the link is the safe answer.

### D4. A results page you can read without voting **[you]**

You will want to look at all eight boards' numbers to write about them. But
you've answered every board already, so you'd see them anyway — and a *public*
results page would break the anchoring protection for everyone who hasn't voted.

Options: a private URL only you know, or export the data and read it offline
(see E1). I lean toward export — it can't leak by being shared.

---

## E. Operating it once it's live

### E1. Get the data out **[me]**

You'll need the raw numbers to write anything. A small export (CSV or JSON, one
file per board) beats reading percentages off the screen. ~30 minutes.

### E2. Know if it's working **[you]**

Vercel shows visitor counts with no extra script and no change to the
disclosure. Anything more detailed means adding analytics, which **would**
require changing the disclosure, since it currently says no tracking scripts.
I'd stay with Vercel's built-in numbers.

### E3. A backup **[me]**

If the Upstash database is deleted or the free tier lapses, the votes are gone.
A periodic export to a file you keep is cheap insurance once real responses
exist.

---

## What I'd actually do, in order

1. A2 wipe fake data, B1 timestamps, B3 the cap, C1 origin check — all code, no
   accounts needed. **[me]**
2. A1 + A3 + A4 — Upstash, Vercel, address. The session where you're at the
   keyboard. **[both]**
3. C Level 1 rate limiting, D1 preview image, D2 404, E1 export. **[me]**
4. Launch. Then E3 backup on a schedule.

Steps 1 and 3 are a few hours of my work. Step 2 is maybe 30 minutes of yours.

The two I'd push you hardest on: **B1** (timestamps, because it's unrecoverable)
and **C** (pick a level consciously, because you're publishing these numbers
under your own name).
