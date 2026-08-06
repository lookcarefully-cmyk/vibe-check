"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InfoDialog from "./InfoDialog";
import Colophon from "./Colophon";
import { MORE_TOPICS } from "@/lib/experiment";
import { revealTypeOf } from "@/lib/topics";

/**
 * Curated boards outside the Main Set, plus the public library of boards people
 * made and the boards this browser made itself.
 *
 * Ranked primarily by answers in the last seven days, with private reactions as
 * a capped recommendation nudge — see app/api/boards/route.ts. A "new" tab
 * exists because a trending-only feed makes a brand-new board invisible forever.
 */

interface Listed {
  slug: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
  category: string;
  people: number;
  recentAnswers: number;
  revealType: "other-side" | "crowd" | null;
}

interface Mine {
  slug: string;
  question: string;
  token: string;
}

export default function CommunityLibrary() {
  const [boards, setBoards] = useState<Listed[]>([]);
  const [sort, setSort] = useState<"trending" | "new">("trending");
  const [loaded, setLoaded] = useState(false);
  const [mine, setMine] = useState<Mine[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("vibecheck:mine");
      if (raw) setMine(JSON.parse(raw));
    } catch {
      /* private browsing */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/boards?sort=${sort}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { boards: [] }))
      .then((d) => {
        if (!cancelled) {
          setBoards(Array.isArray(d.boards) ? d.boards : []);
          setLoaded(true);
        }
      })
      .catch(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [sort]);

  return (
    <main className="shell">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · more questions</span>
          <InfoDialog />
        </div>
        <h1>More boards</h1>
        <p className="lede">
          Keep exploring our wider shelf, or try a question somebody made.
        </p>
      </header>

      <Link href="/b/new" className="lock-in maker-cta">
        Make a board
      </Link>

      {MORE_TOPICS.length > 0 && (
        <section className="board-group">
          <h2>More from Vibe Check</h2>
          <p className="board-progress">
            Good questions that aren&rsquo;t in the focused Main Set. Pick one to start
            a shuffled stream through this wider collection.
          </p>
          <ul className="clist">
            {MORE_TOPICS.map((topic) => {
              const revealType = revealTypeOf(topic);
              return (
                <li key={topic.id}>
                  <Link href={`/${topic.id}?stream=community-start`}>
                    {topic.question}
                  </Link>
                  <span className="clist-meta">
                    {topic.leftLabel} → {topic.rightLabel}
                    {revealType === "real-figure" && " · guess the real figure"}
                    {revealType === "other-side" && " · guess the other side"}
                    {revealType === "crowd" && " · guess the crowd"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {mine.length > 0 && (
        <section className="board-group">
          <h2>Yours</h2>
          <ul className="clist">
            {mine.map((m) => (
              <li key={m.slug}>
                <Link href={`/b/${m.slug}?stream=community-start`}>{m.question}</Link>
                <span className="clist-meta">yours · saved in this browser</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="board-group">
        <h2>Made by visitors</h2>
        <p className="board-progress">
          Public boards are screened, but their questions and wording belong to
          the people who made them.
        </p>
      </section>

      <div className="csort" role="tablist" aria-label="Sort visitor-made boards">
        {(["trending", "new"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={sort === option}
            className={`csort-tab${sort === option ? " is-on" : ""}`}
            onClick={() => setSort(option)}
          >
            {option === "trending" ? "Trending" : "Newest"}
          </button>
        ))}
      </div>

      {!loaded ? (
        <p className="board-progress">Loading…</p>
      ) : boards.length === 0 ? (
        <p className="board-empty">
          Nobody has published a board yet. <Link href="/b/new">Make the first one.</Link>
        </p>
      ) : (
        <section className="board-group">
          <ul className="clist">
            {boards.map((b) => (
              <li key={b.slug}>
                <Link href={`/b/${b.slug}?stream=community-start`}>{b.question}</Link>
                <span className="clist-meta">
                  {b.leftLabel} → {b.rightLabel}
                  {b.revealType === "other-side" && " · guess the other side"}
                  {b.revealType === "crowd" && " · guess the crowd"}
                  {b.people > 0 && ` · ${b.people} ${b.people === 1 ? "person" : "people"}`}
                  {sort === "trending" && b.recentAnswers > 0 && ` · ${b.recentAnswers} this week`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="board-index-run">
        <Link href="/explore">Explore every collection &rarr;</Link>
      </p>

      <footer className="disclosure">
        The &ldquo;More from Vibe Check&rdquo; shelf is ours. Boards under &ldquo;Made by
        visitors&rdquo; are screened for the obvious, but a published community board
        is somebody else&rsquo;s question, not a claim we&rsquo;re making.{" "}
        <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>

      <Colophon />
    </main>
  );
}
