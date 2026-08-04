"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InfoDialog from "./InfoDialog";
import Colophon from "./Colophon";

/**
 * The public library of boards people made, plus the boards you made yourself.
 *
 * Ranked by answers in the last seven days rather than lifetime totals — see
 * the GET handler in app/api/boards/route.ts for why. A "new" tab exists
 * because a trending-only feed makes a brand-new board invisible forever.
 */

interface Listed {
  slug: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
  category: string;
  people: number;
  recentAnswers: number;
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
          <span className="kicker-text">Vibe Check · boards people made</span>
          <InfoDialog />
        </div>
        <h1>Boards people made</h1>
        <p className="lede">
          Anyone can make one. These are the ones their makers chose to publish.
        </p>
      </header>

      <Link href="/b/new" className="lock-in maker-cta">
        Make a board
      </Link>

      {mine.length > 0 && (
        <section className="board-group">
          <h2>Yours</h2>
          <ul className="clist">
            {mine.map((m) => (
              <li key={m.slug}>
                <Link href={`/b/${m.slug}`}>{m.question}</Link>
                <span className="clist-meta">yours · saved in this browser</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="csort" role="tablist" aria-label="Sort boards">
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
                <Link href={`/b/${b.slug}`}>{b.question}</Link>
                <span className="clist-meta">
                  {b.leftLabel} → {b.rightLabel}
                  {b.people > 0 && ` · ${b.people} ${b.people === 1 ? "person" : "people"}`}
                  {sort === "trending" && b.recentAnswers > 0 && ` · ${b.recentAnswers} this week`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="board-index-run">
        <Link href="/boards">Browse the main collection &rarr;</Link>
      </p>

      <footer className="disclosure">
        Boards here were made by visitors, not by us. They&rsquo;re screened for
        the obvious, but a published board is somebody&rsquo;s question, not a
        claim we&rsquo;re making.{" "}
        <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>

      <Colophon />
    </main>
  );
}
