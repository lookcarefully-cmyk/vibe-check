# Monthly AI Pulse — owner checklist

The code is the easy half. The habit comes from making one small promise and
keeping it: three stable AI questions, one reminder a month.

## Set up Substack once

1. The publication is `https://vibecheckpublicdata.substack.com/`; it is the
   built-in destination for `/subscribe`.
2. Redeploy, then open `/subscribe` in a private window. It should send you to
   that Substack signup page.

`SUBSTACK_URL` remains available as an optional Vercel environment variable if
the publication ever moves. Its value overrides the built-in address; use the
URL only, with no `SUBSTACK_URL=` prefix and no quotation marks.

No Substack API key, webhook or embedded form is needed. The separation is
intentional: Substack stores an email address; Vibe Check stores an unrelated
random browser id. Never export the emails into the vote store or add the random
browser id to a Substack link.

## At the start of each month

1. Confirm `/pulse` says the new month and all three boards are available in a
   clean browser.
2. Publish one short Substack reminder linking to `/pulse`.
3. Keep the reminder blind: name the three themes, but do not include the current
   averages or screenshots of results. Showing the crowd immediately before a
   return visit would anchor the answers the Pulse is trying to measure.
4. Let the same three questions run. Do not rewrite them to match the news cycle;
   annotate major events in the timeline instead.

Suggested reminder copy:

> The new monthly AI Pulse is open: three questions on alignment, humanity's
> future, and whether development should pause or accelerate. It takes about a
> minute. Where do you land?

## What is manual for now

Substack sends the email when you publish the monthly reminder; Vibe Check does
not automatically schedule it. That is the right launch trade-off: one manual
post per month is simple, and it avoids building an email pipeline before we
know whether people return. Automation can come later if the routine proves
worth keeping.

Reports are a separate editorial product. Publish a Month One or quarterly
report when the sample supports it, and label self-selected crowd movement and
same-browser panel movement separately.
