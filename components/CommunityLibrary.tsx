"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InfoDialog from "./InfoDialog";
import Colophon from "./Colophon";
import { MORE_TOPICS } from "@/lib/experiment";
import { revealTypeOf, type RevealType } from "@/lib/topics";

/**
 * One browse pool for everything outside the focused Main Set.
 *
 * Vibe Check's secondary questions and public visitor-made boards are
 * interleaved instead of split into two shelves. Visitor-made items remain
 * quietly marked because their wording is somebody else's, and the individual
 * board page still carries the full safety disclosure.
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

interface LibraryItem {
  id: string;
  href: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
  revealType: RevealType | null;
  visitorMade: boolean;
  people: number;
  recentAnswers: number;
}

function interleave(curated: LibraryItem[], community: LibraryItem[]): LibraryItem[] {
  const out: LibraryItem[] = [];
  const length = Math.max(curated.length, community.length);
  for (let index = 0; index < length; index += 1) {
    if (curated[index]) out.push(curated[index]);
    if (community[index]) out.push(community[index]);
  }
  return out;
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
    fetch(`/api/boards?sort=${sort}`)
      .then((response) => (response.ok ? response.json() : { boards: [] }))
      .then((data) => {
        if (!cancelled) {
          setBoards(Array.isArray(data.boards) ? data.boards : []);
          setLoaded(true);
        }
      })
      .catch(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [sort]);

  const items = useMemo(() => {
    const curated: LibraryItem[] = MORE_TOPICS.map((topic) => ({
      id: topic.id,
      href: `/${topic.id}?stream=community-start`,
      question: topic.question,
      leftLabel: topic.leftLabel,
      rightLabel: topic.rightLabel,
      revealType: revealTypeOf(topic),
      visitorMade: false,
      people: 0,
      recentAnswers: 0,
    }));
    const community: LibraryItem[] = boards.map((board) => ({
      id: board.slug,
      href: `/b/${board.slug}?stream=community-start`,
      question: board.question,
      leftLabel: board.leftLabel,
      rightLabel: board.rightLabel,
      revealType: board.revealType,
      visitorMade: true,
      people: board.people,
      recentAnswers: board.recentAnswers,
    }));
    return interleave(curated, community);
  }, [boards]);

  return (
    <main className="shell">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · community</span>
          <InfoDialog />
        </div>
        <h1>Explore boards</h1>
        <p className="lede">
          Find a question worth answering, or make one for your own people.
        </p>
      </header>

      <Link href="/b/new" className="lock-in maker-cta">
        Make a board
      </Link>

      {mine.length > 0 && (
        <section className="board-group">
          <h2>Yours</h2>
          <ul className="clist">
            {mine.map((board) => (
              <li key={board.slug}>
                <Link href={`/b/${board.slug}?stream=community-start`}>{board.question}</Link>
                <span className="clist-meta">yours · saved in this browser</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="board-group">
        <h2>Community</h2>
        <p className="board-progress">
          Pick anywhere to start, then keep scrolling or make your own.
        </p>
      </section>

      <div className="csort" role="tablist" aria-label="Sort community boards">
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

      {!loaded && <p className="board-progress">Loading public boards…</p>}

      <section className="board-group">
        <ul className="clist">
          {items.map((item) => (
            <li key={`${item.visitorMade ? "visitor" : "vibe"}-${item.id}`}>
              <Link href={item.href}>{item.question}</Link>
              <span className="clist-meta">
                {item.leftLabel} → {item.rightLabel}
                {item.revealType === "real-figure" && " · guess the real figure"}
                {item.revealType === "other-side" && " · guess the other side"}
                {item.revealType === "crowd" && " · guess the crowd"}
                {item.visitorMade && " · visitor-made"}
                {item.visitorMade && item.people > 0
                  && ` · ${item.people} ${item.people === 1 ? "person" : "people"}`}
                {item.visitorMade && sort === "trending" && item.recentAnswers > 0
                  && ` · ${item.recentAnswers} this week`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="board-index-run">
        <Link href="/explore">Explore every collection &rarr;</Link>
      </p>

      <footer className="disclosure">
        Boards marked &ldquo;visitor-made&rdquo; are screened for the obvious, but their
        wording belongs to the person who made them.{" "}
        <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>

      <Colophon />
    </main>
  );
}
