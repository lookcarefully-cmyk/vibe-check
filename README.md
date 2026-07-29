# Wavelength

A set of consensus dials for public data collection. Visitors place their answer
on a spectrum; the moment they click, their vote is recorded and the dial
transforms into a live distribution of everyone else's answers.

Four boards, each with its own separate vote store:

| Board | Spectrum |
| --- | --- |
| `/social-addictive` | Shortform social media: not addictive ↔ addictive |
| `/porn-addictive` | Internet porn: not addictive ↔ addictive |
| `/social-healthy` | Shortform social media: unhealthy ↔ healthy |
| `/porn-healthy` | Internet porn: unhealthy ↔ healthy |

They're defined in one place, `lib/topics.ts`. Adding an entry there creates the
board, its route, its nav tile, and its store — no other file needs touching.

## Running it

**Double-click `Start Wavelength.command` in Finder.** It opens a Terminal
window, starts the server, and opens the site in your browser. Leave that
Terminal window open while you're using it — closing it stops the server.

Or from a terminal:

```bash
npm install && npm run dev
```

Either way it lives at http://localhost:3210. It runs on this machine only;
nobody else can reach it until it's deployed (see Deploying, below).

## How it works

**The flow.** The dial starts in *choose* mode — a teal handle on a horizontal
track, with a live percentage readout. A click (or `Enter`, after aiming with
the arrow keys) POSTs the value, and the dial animates into *result* mode:
coloured rays burst out of the red hub, the red needle swings to the average,
and the spread bracket fades in. The viewer's own answer stays on screen as the
teal line, so they can see themselves against the crowd.

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

**Live updates.** The client polls `/api/votes/<topic>` every 6 seconds and on
tab focus, so the distribution reshapes as new people answer. The nav tiles show
each board's current average as a tiny needle, refreshed after every vote.

### Files

| Path | Role |
| --- | --- |
| `lib/topics.ts` | **the board definitions — start here** |
| `app/[topic]/page.tsx` | a board |
| `app/api/votes/[topic]/route.ts` | `GET` aggregate, `POST` a vote |
| `app/api/summary/route.ts` | every board's average, for the nav tiles |
| `components/Wavelength.tsx` | state, submission, polling |
| `components/Dial.tsx` | the SVG dial |
| `components/TopicNav.tsx` / `MiniBoard.tsx` | the mini-board switcher |
| `lib/store.ts` | vote persistence (Upstash or local file) |
| `lib/aggregate.ts` | mean / sd / percentiles / histogram |
| `lib/rays.ts` | KDE → ray geometry |
| `lib/geometry.ts` | shared dial geometry |

## Storage

Two interchangeable backends behind one interface:

- **Local (default).** Votes go to `.data/votes-<topic>.json`, one file per
  board. Zero configuration, but it only works where the filesystem is writable.
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
