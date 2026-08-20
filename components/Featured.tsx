"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InfoDialog from "./InfoDialog";
import Colophon from "./Colophon";
import StartMainSet from "./StartMainSet";
import GapBatteryCards from "./GapBatteryCards";
import { EXPERIMENT_ENABLED } from "@/lib/experiment";
import { readRunState, nextHref } from "@/lib/run";

/** A trending community board, as returned by /api/boards. */
interface TrendingBoard {
  slug: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
  people: number;
  recentAnswers: number;
}

/**
 * The front door offers one low-choice way into the randomized main set, plus
 * Explore and Make. The large libraries live beyond those explicit choices.
 *
 * When the order experiment is live (EXPERIMENT_ENABLED), the front door is the
 * guided run instead, so this bounces to it — the same behaviour the old Start
 * screen had. Parked, it renders the shelf.
 */
export default function Featured() {
  const router = useRouter();
  const [trending, setTrending] = useState<TrendingBoard[]>([]);

  useEffect(() => {
    if (!EXPERIMENT_ENABLED) return;
    const state = readRunState();
    router.replace(state.complete ? "/results" : nextHref(state));
  }, [router]);

  // The top few published community boards, by answers in the last 7 days. Only
  // `listed` boards come back (published + past moderation), so nothing unvetted
  // reaches the front page. The section renders only when there are any, so the
  // home page stays clean before anyone has made one.
  useEffect(() => {
    if (EXPERIMENT_ENABLED) return;
    let cancelled = false;
    fetch("/api/boards?sort=trending&featured=1")
      .then((r) => (r.ok ? r.json() : { boards: [] }))
      .then((d) => {
        if (!cancelled && Array.isArray(d.boards)) setTrending(d.boards.slice(0, 4));
      })
      .catch(() => {
        /* the section just stays hidden if this fails */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (EXPERIMENT_ENABLED) {
    return (
      <main className="shell">
        <p className="lede">Starting…</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · quizzes</span>
          <InfoDialog />
        </div>
        <h1>You are probably wrong about everyone else.</h1>
        <p className="lede">
          Almost everyone is. Guess the real numbers — then see how close you got.
        </p>
      </header>

      {/*
        The quiz leads because it is the only thing here that pays off on an
        empty site: its answers come from national surveys, not from the crowd,
        so a lone visitor still gets the whole experience. The crowd boards
        below need other people to be worth anything.
      */}
      <GapBatteryCards />

      <div className="front-door-secondary home-secondary">
        <StartMainSet label="Answer a crowd question" />
        <Link href="/explore" className="reset">Explore boards</Link>
        <Link href="/b/new" className="reset">Make a board</Link>
      </div>


      <section className="home-pulse" aria-labelledby="home-pulse-title">
        <div>
          <p className="explore-kicker">New · monthly AI poll</p>
          <h2 id="home-pulse-title">The monthly AI poll</h2>
          <p>
            Three questions on where AI is headed. Answer now, then watch the
            country&rsquo;s take — and your own — move month to month.
          </p>
        </div>
        <Link href="/pulse" className="lock-in">Take the monthly AI poll</Link>
      </section>

      {trending.length > 0 && (
        <section className="board-group">
          <h2>Trending — boards people made</h2>
          <ul className="clist">
            {trending.map((b) => (
              <li key={b.slug}>
                <Link href={`/b/${b.slug}?stream=community-start`}>{b.question}</Link>
                <span className="clist-meta">
                  {b.leftLabel} → {b.rightLabel}
                  {b.recentAnswers > 0 && ` · ${b.recentAnswers} this week`}
                </span>
              </li>
            ))}
          </ul>
          <p className="board-index-run">
            <Link href="/b">Explore community &rarr;</Link>
            {" · "}
            <Link href="/b/new">Make your own</Link>
          </p>
        </section>
      )}

      <footer className="disclosure">
        Private by design: your answer, any prediction, the time, and a random browser ID
        that groups your marks together. No name, email, account, or precise location;
        your IP is never attached to an answer. Aggregate results are public.{" "}
        <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>

      <Colophon />
    </main>
  );
}
