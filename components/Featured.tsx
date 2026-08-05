"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopicNav from "./TopicNav";
import InfoDialog from "./InfoDialog";
import HowToPlay from "./HowToPlay";
import Colophon from "./Colophon";
import { EXPERIMENT_ENABLED, EXTRA_TOPICS } from "@/lib/experiment";
import { readRunState, nextHref } from "@/lib/run";
import { FEATURED_TOPICS } from "@/lib/topics";

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
 * The front door: a short, hand-picked shelf of boards (see FEATURED_TOPICS in
 * lib/topics.ts) with a way through to the full library at /boards.
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
    fetch("/api/boards?sort=trending&featured=1", { cache: "no-store" })
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
          <span className="kicker-text">Vibe Check · public data collection</span>
          <InfoDialog />
        </div>
        <h1>Where do you land?</h1>
        <p className="lede">
          Place your answer on the dial, then see how everyone else answered. A
          board stays blank until you&rsquo;ve had your say.
        </p>
      </header>

      <HowToPlay />

      <section className="board-group">
        <h2>Featured questions</h2>
        {/*
          The tiles keep their subject: on the front page there's no category
          heading naming it, and "OPTIMIST OR DOOMER?" over a faceless dial
          doesn't tell you it's about AI.
        */}
        <TopicNav activeId="" refreshKey={0} topics={FEATURED_TOPICS} />
      </section>

      {trending.length > 0 && (
        <section className="board-group">
          <h2>Trending — boards people made</h2>
          <ul className="clist">
            {trending.map((b) => (
              <li key={b.slug}>
                <Link href={`/b/${b.slug}`}>{b.question}</Link>
                <span className="clist-meta">
                  {b.leftLabel} → {b.rightLabel}
                  {b.recentAnswers > 0 && ` · ${b.recentAnswers} this week`}
                </span>
              </li>
            ))}
          </ul>
          <p className="board-index-run">
            <Link href="/b">More boards people made &rarr;</Link>
            {" · "}
            <Link href="/b/new">Make your own</Link>
          </p>
        </section>
      )}

      <p className="board-index-run">
        <Link href="/boards">Browse all {EXTRA_TOPICS.length} questions &rarr;</Link>
        {trending.length === 0 && (
          <>
            {" · "}
            <Link href="/b">Boards people made &rarr;</Link>
          </>
        )}
      </p>

      <footer className="disclosure">
        Anonymous: your answer, any prediction, the time, and a random ID that groups your
        marks together. No name, email, account or IP. Results are public, so anyone can see how the crowd answered.{" "}
        <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>

      <Colophon />
    </main>
  );
}
