# How to edit Vibe Check text yourself

There is no content-management screen inside the site. The words are ordinary
text in the code, and you can safely change most display copy in GitHub without
learning programming.

## The easiest method: GitHub's web editor

1. Open `github.com/lookcarefully-cmyk/vibe-check` and sign in.
2. Use the file map below to open the file containing the words you want.
3. Click the pencil icon at the upper right of the file.
4. Use the browser's Find command (`Command-F`) to locate the exact sentence.
5. Change only the visible words. Leave the surrounding punctuation, quotation
   marks, angle brackets, braces and field names in place.
6. Click **Commit changes**, write a short description such as “Tighten homepage
   copy,” choose **Commit directly to the main branch**, and confirm.

That saves the real code. It may create a Vercel deployment automatically, but
always check the actual domain afterwards. If it does not appear there, open the
Vercel project and redeploy the newest commit—or ask Codex only to deploy it.

## Where the main words live

| What you want to change | File |
| --- | --- |
| Homepage headline, introduction and buttons | `components/Featured.tsx` |
| Explore page cards and descriptions | `components/ExploreHub.tsx` |
| Monthly AI Pulse introduction and method note | `components/PulseLanding.tsx` |
| The three AI Pulse questions and every other dial question | `lib/topics.ts` |
| Community browse-page wording | `components/CommunityLibrary.tsx` |
| Board-creation wording and starter ideas | `components/BoardMaker.tsx` |
| The `?` explanation panel | `components/InfoDialog.tsx` |
| Reminder/signup wording | `components/SubscribeCallout.tsx` |
| Site title and social-preview description | `app/layout.tsx` |

## What is safe to change alone

Ordinary explanatory sentences, headings and button labels are generally safe.
For example, in:

```tsx
<h1>Where do you land?</h1>
```

change only `Where do you land?`.

## Stop before changing these

Ask for a quick check before editing anything in `lib/topics.ts` beyond a typo.
A question's wording, pole direction and scale are part of the research measure,
not merely decoration. In particular, do not change:

- `id`
- `leftLabel` or `rightLabel`
- `highMeans`
- `scale`, `collection`, `cadence` or `version`
- any `benchmark` number or source

Swapping a board's ends silently reverses every existing vote unless the store
is migrated. Meaningful question rewrites also need a new board version so old
and new answers are not mislabeled as the same measure.

If GitHub shows red syntax highlighting, a failed check, or the page looks blank
after a change, do not keep editing around the error. Revert that commit or send
Codex the commit link to repair it.
