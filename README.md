# Vibe Check

A public opinion instrument dressed as a game. Visitors place an answer on a
dial — a semicircular spectrum — and once they finish they see how everyone else
answered.

It exists to run one experiment about how the public uses the word "addictive",
and to trail a piece of writing on X and Substack.

## → Read [AGENTS.md](AGENTS.md) first

That's the orientation file: what the experiment is, the design rules that look
like preferences but aren't, the data shape, and current status. It's kept
accurate deliberately. **This README is a front door, not a spec** — earlier
versions of it drifted several designs behind the code and misled anyone reading
them, which is why the detail now lives in one place instead of three.

## Running it

**Double-click `Start Vibe Check.command` in Finder.** It opens a Terminal
window, starts the server and opens your browser. Leave that window open; closing
it stops the server.

Or:

```bash
npm install && npm run dev
```

It lives at http://localhost:3210, on this machine only. Nobody else can reach it
until it's deployed.

> **Don't run `npm run build` while the dev server is running.** They share the
> `.next` directory, so the build pulls files out from under the running server
> and every page starts returning 500. Stop it first; if it happens, stop it,
> `rm -rf .next`, start again.

## Trying the run

`/dev` is a test harness — pick an arm and it starts a fresh run in your browser.
It only touches your own browser storage.

Answers given there are **real votes and do land in the database**. Clear
everything back to zero with:

```bash
npm run reset
```

## The other documents

| File | What it's for |
| --- | --- |
| [AGENTS.md](AGENTS.md) | **the orientation file — start here** |
| [QUESTION-DESIGN.md](QUESTION-DESIGN.md) | the research reasoning: hypotheses, and what was tried and rejected |
| [DEPLOY-CHECKLIST.md](DEPLOY-CHECKLIST.md) | what's left before this can go on the internet |

Where any document disagrees with the code, the code wins.
