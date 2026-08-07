"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Dial from "./Dial";
import Colophon from "./Colophon";
import SharePrompt from "./SharePrompt";
import { BIN_COUNT, type WindowedAggregate } from "@/lib/aggregate";
import { bandFor } from "@/lib/likert";
import { guessScale } from "@/lib/board-shape";
import { leadingQuestionHint } from "@/lib/moderation";

type CreatorReveal = "standard" | "crowd" | "other-side";

/**
 * The board maker.
 *
 * The live preview is the point: most people have never thought about what a
 * spectrum's two ends should be until they see their words on a dial, and
 * "OPTIMIST / DOOMER" reads very differently from "GOOD / BAD" once it's drawn.
 * Seeing it prevents most of the bad boards that a validation message would
 * otherwise have to reject afterwards.
 */

const EMPTY_AGG: WindowedAggregate = {
  count: 0,
  mean: 0.5,
  sd: 0,
  p10: 0.5,
  p90: 0.5,
  hist: new Array(BIN_COUNT).fill(0),
  counts: new Array(BIN_COUNT).fill(0),
  updatedAt: 0,
  windowDays: 30,
  windowLabel: "last 30 days",
  answers: 0,
  previousMean: null,
  changePoints: null,
};

const STARTER_IDEAS = [
  {
    label: "Settle a group-chat debate",
    question: "Our next group trip should be…",
    left: "CITY WEEKEND",
    right: "CABIN ESCAPE",
    category: "Friends",
    revealType: "standard" as CreatorReveal,
  },
  {
    label: "Poll your followers",
    question: "This trend is…",
    left: "JUST GETTING STARTED",
    right: "ALREADY OVER",
    category: "Culture",
    revealType: "crowd" as CreatorReveal,
  },
  {
    label: "Test a perception gap",
    question: "Where do you think people who disagree with you land?",
    left: "CLOSER THAN IT SEEMS",
    right: "FAR APART",
    category: "Debate",
    revealType: "other-side" as CreatorReveal,
  },
];

interface Created {
  slug: string;
  token: string;
  reviewOnly: boolean;
  notice: string | null;
}

export default function BoardMaker() {
  const [question, setQuestion] = useState("");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [category, setCategory] = useState("");
  const [revealType, setRevealType] = useState<CreatorReveal>("standard");
  const [pick, setPick] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const preview = useMemo(
    () => ({
      id: "preview",
      subject: category || "Community",
      axis: "Preview",
      question: question || "Your question will appear here",
      prompt: "",
      leftLabel: (left || "LEFT").toUpperCase(),
      rightLabel: (right || "RIGHT").toUpperCase(),
      highMeans: "",
      scale: guessScale(left, right),
      category: category || "Community",
    }),
    [question, left, right, category],
  );

  const hint = leadingQuestionHint(question);
  const bandExample = bandFor(0.72, preview.scale, {
    left: preview.leftLabel,
    right: preview.rightLabel,
  });

  const ready = question.trim().length >= 10 && left.trim() && right.trim();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          leftLabel: left.trim(),
          rightLabel: right.trim(),
          category: category.trim(),
          revealType: revealType === "standard" ? null : revealType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not create the board.");

      // The token is shown once and only ever lives in this browser — there is
      // no account to recover it from, so it's written before anything else.
      try {
        const mine = JSON.parse(window.localStorage.getItem("vibecheck:mine") ?? "[]");
        mine.push({ slug: data.slug, token: data.token, question: question.trim() });
        window.localStorage.setItem("vibecheck:mine", JSON.stringify(mine));
      } catch {
        /* private browsing: the link below is then the only copy */
      }
      setCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the board.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const url = `${window.location.origin}/b/${created.slug}`;
    return (
      <main className="shell">
        <header className="masthead">
          <div className="kicker">
            <span className="kicker-text">Vibe Check</span>
          </div>
          <h1>Your board is live</h1>
          <p className="lede">
            It&rsquo;s unlisted — only people with this link can find it.
          </p>
        </header>

        <div className="made">
          <input className="made-url" readOnly value={url} onFocus={(e) => e.target.select()} />
          <div className="made-actions">
            <Link href={`/b/${created.slug}`} className="reset">
              Open it
            </Link>
          </div>

          <SharePrompt question={question.trim()} path={`/b/${created.slug}`} />

          {created.notice && <p className="made-notice">{created.notice}</p>}

          {!created.reviewOnly && (
            <PublishToggle slug={created.slug} token={created.token} />
          )}

          <p className="made-note">
            Saved in this browser so you can manage it later. There&rsquo;s no
            account, so if you clear your browser data the link still works but
            you won&rsquo;t be able to publish or delete it.
          </p>
        </div>

        <Colophon />
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check</span>
        </div>
        <h1>Make a board</h1>
        <p className="lede">
          Write a question with two ends to it. You get an unlisted link straight
          away; putting it in the public library is up to you.
        </p>
      </header>

      <section className="maker-ideas" aria-labelledby="maker-ideas-title">
        <div>
          <p className="explore-kicker">Need a starting point?</p>
          <h2 id="maker-ideas-title">Make one for your people.</h2>
          <p>
            Group chats, follower polls, teams and niche communities all work. Pick
            an example to load it, then make the wording yours.
          </p>
        </div>
        <div className="maker-idea-buttons">
          {STARTER_IDEAS.map((idea) => (
            <button
              type="button"
              key={idea.label}
              onClick={() => {
                setQuestion(idea.question);
                setLeft(idea.left);
                setRight(idea.right);
                setCategory(idea.category);
                setRevealType(idea.revealType);
              }}
            >
              {idea.label}
            </button>
          ))}
        </div>
        <small>
          Every new board starts unlisted, so it is ready for a private link before
          you decide whether to put it in the public library.
        </small>
      </section>

      <div className="maker">
        <label className="maker-field">
          <span>The question</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={140}
            placeholder="Is remote work good or bad for early-career people?"
          />
          <small>{140 - question.length} left</small>
        </label>

        <fieldset className="maker-reveals">
          <legend>What happens after someone answers?</legend>
          <label className={revealType === "standard" ? "is-selected" : ""}>
            <input
              type="radio"
              name="revealType"
              value="standard"
              checked={revealType === "standard"}
              onChange={() => setRevealType("standard")}
            />
            <span>
              <strong>Show the crowd</strong>
              <small>They answer, then immediately see where everyone landed.</small>
            </span>
          </label>
          <label className={revealType === "crowd" ? "is-selected" : ""}>
            <input
              type="radio"
              name="revealType"
              value="crowd"
              checked={revealType === "crowd"}
              onChange={() => setRevealType("crowd")}
            />
            <span>
              <strong>Guess the whole crowd</strong>
              <small>They answer, predict the crowd&rsquo;s average, then see both.</small>
            </span>
          </label>
          <label className={revealType === "other-side" ? "is-selected" : ""}>
            <input
              type="radio"
              name="revealType"
              value="other-side"
              checked={revealType === "other-side"}
              onChange={() => setRevealType("other-side")}
            />
            <span>
              <strong>Guess the other side</strong>
              <small>
                They predict the opposite half. That comparison waits for at least
                10 people on that side.
              </small>
            </span>
          </label>
          <p>
            Published &ldquo;real figure&rdquo; comparisons are reserved for the main set,
            where sources are checked before the board goes live.
          </p>
        </fieldset>

        <div className="maker-poles">
          <label className="maker-field">
            <span>Left end</span>
            <input
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              maxLength={28}
              placeholder="BAD"
            />
          </label>
          <label className="maker-field">
            <span>Right end</span>
            <input
              value={right}
              onChange={(e) => setRight(e.target.value)}
              maxLength={28}
              placeholder="GOOD"
            />
          </label>
        </div>

        <label className="maker-field">
          <span>Category (optional)</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={40}
            placeholder="Work"
          />
        </label>

        {hint && <p className="maker-hint">{hint}</p>}

        {bandExample && (
          <p className="maker-hint is-quiet">
            An answer at 72% will read as &ldquo;<strong>{bandExample}</strong>&rdquo;.
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="lock-in"
          disabled={!ready || busy}
          onClick={() => void submit()}
        >
          {busy ? "Creating…" : "Create the board"}
        </button>
      </div>

      <section className="maker-preview">
        <h2>Preview</h2>
        <div className="stage">
          <Dial
            phase="choose"
            pick={pick}
            agg={EMPTY_AGG}
            topic={preview}
            onPick={setPick}
            onCommit={() => {}}
            interactive
          />
        </div>
        <p className="maker-hint is-quiet">
          Tap or drag it — this is exactly what people will see. Nothing is recorded.
        </p>
      </section>

      <Colophon />
    </main>
  );
}

/** Publish / unpublish, shown once a board exists. */
function PublishToggle({ slug, token }: { slug: string; token: string }) {
  const [listed, setListed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, token, action: listed ? "unpublish" : "publish" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not change that.");
      setListed(data.listed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="publish">
      <p>
        {listed
          ? "This board is in the public library, where anyone can find it."
          : "Only people with the link can see this board."}
      </p>
      <button type="button" className="reset" onClick={() => void toggle()} disabled={busy}>
        {busy ? "Saving…" : listed ? "Make it unlisted again" : "Add it to the public library"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
