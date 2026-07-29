# Vibe Check

A set of consensus dials for public data collection. Visitors place their answer
on a spectrum; the moment they click, their vote is recorded and the dial
transforms into a live distribution of everyone else's answers.

Eight boards, each with its own separate vote store:

| Board | Spectrum |
| --- | --- |
| `/social-addictive` | Shortform social media: addictive ↔ not addictive |
| `/porn-addictive` | Internet porn: addictive ↔ not addictive |
| `/social-healthy` | Shortform social media: harmful ↔ healthy |
| `/porn-healthy` | Internet porn: harmful ↔ healthy |
| `/social-cigarettes` | Shortform social media: cigarettes ↔ comic books |
| `/social-polarizing` | Shortform social media: polarizing ↔ unifying |
| `/social-society` | Shortform social media: bad ↔ good for society |
| `/porn-society` | Internet porn: bad ↔ good for society |

They're defined in one place, `lib/topics.ts`. Adding an entry there creates the
board, its route, its nav tile, and its store — no other file needs touching.

**Orientation is uniform: the negative pole is always on the left (0), the
positive pole always on the right (1).** Eight dials read side by side in the nav
are only comparable if they all run the same way.

If you ever swap an existing board's ends, **bump `STORE_VERSION` in
`lib/store.ts`.** Votes are stored as bare positions on the 0..1 scale with no
record of which way the labels ran, so reversing the labels would silently turn
every vote already collected into its exact opposite. Bumping the version starts
that board's collection cleanly instead. (The store is on `v4`: `v3` moved the negative pole left, `v4` added timestamps
and session ids and dropped the vote cap.)

## Running it

**Double-click `Start Vibe Check.command` in Finder.** It opens a Terminal
window, starts the server, and opens the site in your browser. Leave that
Terminal window open while you're using it — closing it stops the server.

Or from a terminal:

```bash
npm install && npm run dev
```

> **Don't run `npm run build` while the dev server is running.** They share the
> `.next` directory, so the build overwrites the files the running server is
> reading and every page starts returning 500. Stop the server first. (If it
> happens: stop it, `rm -rf .next`, start it again.)

Either way it lives at http://localhost:3210. It runs on this machine only;
nobody else can reach it until it's deployed (see Deploying, below).

## How it works

**The flow.** The dial starts in *choose* mode — a teal handle on a horizontal
track and no numbers at all. A click (or `Enter`, after aiming with the arrow
keys) POSTs the value, and the dial animates into *result* mode: coloured rays
burst out of the red hub, the red needle swings to the average, and the spread
bracket fades in. The viewer's own answer stays on screen as the teal line, so
they can see themselves against the crowd.

### Anchoring

**No percentage is shown to anyone who hasn't answered yet.** This is a
deliberate constraint on the whole UI, not a styling choice, and it's easy to
break by accident:

- There's no live readout on the dial while choosing. A running "50%" anchors
  people to the midpoint and turns a felt judgement into a number-picking task.
- A nav tile only draws its needle and average once the viewer has answered
  *that* board. Four averages on screen before you've given an opinion is the
  strongest anchor on the page, so `TopicNav` gates each tile on its own
  `localStorage` entry and passes `mean: null` otherwise — the number never
  reaches the tile it would leak from.
- Tiles still show a response count. A count lends credibility without
  suggesting an answer.

The one exception is `aria-valuetext`, which announces the viewer's own handle
position to screen readers. There's no other way to convey where the handle sits,
and it's their own pick rather than the crowd's, so it carries no anchor.

Note that `/api/summary` returns every board's mean regardless. The gate is in
the UI, so a visitor who opens the network tab can still find the numbers. That's
a fine trade for a public opinion board — tighten it only if you ever need the
guarantee to hold against someone deliberately looking.

**The numbers.** `lib/aggregate.ts` turns raw votes into a mean, a standard
deviation, the 10th/90th percentiles, and a 40-bucket histogram.

### A note on units

An earlier version put "80%" on the dial next to the average. That was a
mistake, and it's worth recording so it doesn't come back: **66% and 80% were
different kinds of number.** 66% was a *position on the spectrum*; 80% was a
*proportion of people*. Rendered side by side in the same type, they read as
comparable quantities and invited arithmetic that means nothing.

The rule now: **everything drawn on the dial is in spectrum units.** The chip
reads `AVERAGE 66%`; the bracket's two ends are labelled with the positions they
sit at (`61` and `94`). The share-of-people figure only appears below, in prose
where it can't be confused — "Most answers — 8 in 10 — land between 61% and
94%."

The bracket labels sit inboard of their ticks, and the endpoint labels
(`NOT ADDICTIVE` / `ADDICTIVE`) live in the navy band rather than on the face.
Both are collision fixes, not decoration: the bracket's midpoint is always
roughly where the average marker already is, and a band that reaches either
extreme will otherwise push its label into the endpoint text.

**The curve.** `lib/rays.ts` runs a D3-scaled kernel density estimate over the
histogram and samples it at 31 angles centred on the mean, mapping density to
ray length. A KDE rather than a plotted normal curve keeps the picture honest:
if opinion is genuinely bimodal, two humps appear instead of one smooth bell
that was never in the data. With a normal-ish sample it renders as the bell
curve you'd expect.

**Live updates.** The client polls `/api/votes/<topic>` every 20 seconds, and on
tab focus, so the distribution reshapes as new people answer. Polling stops while
the tab is hidden. Both are cost controls as much as UX: every poll is a read of
the whole vote list, which is one database command, and at 6s a single tab left
open for ten minutes cost 100 of them.

### The "?" panel and the disclosure

`components/InfoDialog.tsx` holds the how-to-play explanation, how to read the
dial, and the data disclosure. It's a native `<dialog>` opened with
`showModal()`, which gives focus trapping, an inert background and a styleable
`::backdrop` for nothing. Two things there are deliberate:

- **Escape is handled explicitly** rather than left to the browser's built-in
  dialog behaviour, so closing works identically everywhere.
- **No `aria-expanded` on the trigger.** That attribute is for disclosure
  widgets and comboboxes, whose content sits beside the trigger in the DOM. A
  button that opens a modal takes `aria-haspopup`; the dialog reports its own
  open state.

A one-line version of the disclosure sits permanently under the dial, so it's
readable without opening anything.

If the disclosure changes, keep it true to what the code does. Right now a vote
record is exactly `{ v, t, s }` — position, timestamp, and a random 16-byte
session id minted in the browser (`lib/session.ts`).

That session id is what makes cross-board correlation possible, and it is the
reason the disclosure can no longer say answers are unlinked. It went in
deliberately, with that trade understood: correlation is the most interesting
thing a multi-board survey can produce, and the id is not derived from anything
about the person. Nothing identifying is stored beside it, and neither `t` nor
`s` is ever returned by a public endpoint — `/api/votes` and `/api/summary` both
map records down to positions before responding.

Rate limiting hashes the caller's IP with `RATE_LIMIT_SALT` and keeps only a
counter under that hash, expiring within a day. The raw address is never written
and the hash is never stored next to a vote. The disclosure says this in plain
words; if you ever change the limiter to store more, change those words too.

### Files

| Path | Role |
| --- | --- |
| `lib/topics.ts` | **the board definitions — start here** |
| `components/InfoDialog.tsx` | the "?" panel: how to play + data disclosure |
| `components/VibeCheck.tsx` | state, submission, polling |
| `lib/session.ts` | the random per-browser id sent with each vote |
| `lib/request.ts` | origin check + hashed rate-limit bucket |
| `app/[topic]/page.tsx` | a board |
| `app/api/votes/[topic]/route.ts` | `GET` aggregate, `POST` a vote |
| `app/api/summary/route.ts` | every board's average, for the nav tiles |
| `components/Dial.tsx` | the SVG dial |
| `components/TopicNav.tsx` / `MiniBoard.tsx` | the mini-board switcher |
| `lib/store.ts` | vote persistence (Upstash or local file) |
| `lib/aggregate.ts` | mean / sd / percentiles / histogram |
| `lib/rays.ts` | KDE → ray geometry |
| `lib/geometry.ts` | shared dial geometry |

## Storage

Two interchangeable backends behind one interface:

- **Local (default).** Votes go to `.data/votes-<version>-<topic>.json`, one file
  per board. Zero configuration, but it only works where the filesystem is
  writable.
- **Upstash Redis.** Set both variables and the app switches automatically:

  ```
  UPSTASH_REDIS_REST_URL=...
  UPSTASH_REDIS_REST_TOKEN=...
  ```

**Deploying to Vercel (or any serverless host) requires Upstash** — serverless
filesystems are read-only and ephemeral, so the file store would silently drop
every vote. Create a free Upstash Redis database, paste the two REST values into
the project's environment variables, and deploy. Nothing else changes.

Either way the store keeps the most recent 20,000 votes.

## Demo data

The visualisation needs a sample before it says anything interesting. To fill
every board's local store with **clearly synthetic** votes for evaluation:

```bash
npm run seed -- 200
```

One board only:

```bash
npm run seed -- 200 social-addictive
```

To wipe every board before collecting real responses:

```bash
npm run seed -- 0
```

The centres the seeder uses are invented so the four boards look different while
developing. **They are not findings.** This only touches the local JSON stores;
never point it at a store holding real public responses.

## Notes

- One vote per browser **per board**, remembered in `localStorage`; "Answer
  again" clears it. This is a friction measure, not ballot-box protection —
  anyone determined can vote twice. Add rate limiting or a signed token if the
  data needs to hold up to adversarial use.
- Votes are stored as bare numbers. No identifiers, no IP addresses, nothing
  that ties an answer to a person.
- Keyboard accessible (the dial is a `role="slider"`), and honours
  `prefers-reduced-motion`.
