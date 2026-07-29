# Wavelength — "Is shortform social media addictive?"

A single-page consensus game for public data collection. Visitors place their
answer on a spectrum from **Not Addictive** to **Addictive**; the moment they
click, their vote is recorded and the dial transforms into a live distribution
of everyone else's answers.

## Running it

```bash
npm install && npm run dev
```

Then open http://localhost:3210.

## How it works

**The flow.** The dial starts in *choose* mode — a teal handle on a horizontal
track, with a live percentage readout. A click (or `Enter`, after aiming with
the arrow keys) POSTs the value, and the dial animates into *result* mode:
coloured rays burst out of the red hub, the red needle swings to the consensus,
and the 80% margin bracket fades in. The viewer's own answer stays on screen as
the teal line, so they can see themselves against the crowd.

**The numbers.** `lib/aggregate.ts` turns raw votes into a mean, a standard
deviation, the 10th/90th percentiles, and a 40-bucket histogram. The "80%
margin" quoted in the UI is that p10–p90 band — 80% of all answers fall inside
it.

**The curve.** `lib/rays.ts` runs a D3-scaled kernel density estimate over the
histogram and samples it at 31 angles centred on the mean, mapping density to
ray length. A KDE rather than a plotted normal curve keeps the picture honest:
if opinion is genuinely bimodal, two humps appear instead of one smooth bell
that was never in the data. With a normal-ish sample it renders as the bell
curve you'd expect.

**Live updates.** The client polls `/api/votes` every 6 seconds and on tab
focus, so the distribution reshapes as new people answer.

### Files

| Path | Role |
| --- | --- |
| `app/page.tsx` | the page |
| `app/api/votes/route.ts` | `GET` aggregate, `POST` a vote |
| `components/Wavelength.tsx` | state, submission, polling |
| `components/Dial.tsx` | the SVG dial |
| `lib/store.ts` | vote persistence (Upstash or local file) |
| `lib/aggregate.ts` | mean / sd / percentiles / histogram |
| `lib/rays.ts` | KDE → ray geometry |
| `lib/geometry.ts` | shared dial geometry |

## Storage

Two interchangeable backends behind one interface:

- **Local (default).** Votes go to `.data/votes.json`. Zero configuration, but
  it only works where the filesystem is writable.
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
the local store with **clearly synthetic** votes for evaluation:

```bash
npm run seed -- 200
```

To wipe it before collecting real responses:

```bash
npm run seed -- 0
```

This only touches the local JSON store. Never point it at a store holding real
public responses.

## Notes

- One vote per browser, remembered in `localStorage`; "Answer again" clears it.
  This is a friction measure, not ballot-box protection — anyone determined can
  vote twice. Add rate limiting or a signed token if the data needs to hold up
  to adversarial use.
- Votes are stored as bare numbers. No identifiers, no IP addresses, nothing
  that ties an answer to a person.
- Keyboard accessible (the dial is a `role="slider"`), and honours
  `prefers-reduced-motion`.
