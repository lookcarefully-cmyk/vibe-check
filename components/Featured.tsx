"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InfoDialog from "./InfoDialog";
import Colophon from "./Colophon";
import VibeCheck from "./VibeCheck";
import { EXPERIMENT_ENABLED, MAIN_TOPICS } from "@/lib/experiment";
import { readRunState, nextHref } from "@/lib/run";
import { canAnswerNow } from "@/lib/mine";
import type { Topic } from "@/lib/topics";

const HOME_TOPIC_KEY = "vibecheck:home-topic:v1";

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
  const [homeTopic, setHomeTopic] = useState<Topic | null>(null);
  const [homeTopicReady, setHomeTopicReady] = useState(false);

  useEffect(() => {
    if (!EXPERIMENT_ENABLED) return;
    const state = readRunState();
    router.replace(state.complete ? "/results" : nextHref(state));
  }, [router]);

  // Put a real, answerable board on the front page. Keep the choice stable on
  // refresh, but pick another once this browser has answered it. Rural/urban is
  // deliberately not first: the stream places that context question second so
  // the site opens like a game rather than an intake form.
  useEffect(() => {
    if (EXPERIMENT_ENABLED) return;
    const now = Date.now();
    const available = MAIN_TOPICS.filter(
      (topic) => topic.id !== "rural-urban" && canAnswerNow(topic, now),
    );
    let selected: Topic | undefined;
    try {
      const stored = window.sessionStorage.getItem(HOME_TOPIC_KEY);
      selected = available.find((topic) => topic.id === stored);
    } catch {
      /* storage-restricted browsing still gets a random board */
    }
    selected ??= available[Math.floor(Math.random() * available.length)];
    if (selected) {
      try {
        window.sessionStorage.setItem(HOME_TOPIC_KEY, selected.id);
      } catch {
        /* keeping the selection across refreshes is optional */
      }
      setHomeTopic(selected);
    }
    setHomeTopicReady(true);
  }, []);

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
          <span className="kicker-text">Vibe Check · public opinion, made visible</span>
          <InfoDialog />
        </div>
        <h1>Where do you land?</h1>
        <p className="lede">
          Place your answer, see how everyone else landed, then keep going or stop
          whenever you like.
        </p>
      </header>

      {homeTopic ? (
        <VibeCheck topic={homeTopic} embedded />
      ) : homeTopicReady ? (
        <section className="home-board-empty">
          <p>You&rsquo;ve answered every question currently available.</p>
          <Link href="/explore" className="lock-in">Explore the results</Link>
        </section>
      ) : (
        <p className="home-board-loading">Loading a question…</p>
      )}

      <nav className="home-utility-links" aria-label="More ways to participate">
        <Link href="/explore" className="reset">Explore boards</Link>
        <Link href="/b/new" className="reset">Make a board</Link>
      </nav>

      <section className="home-pulse" aria-labelledby="home-pulse-title">
        <div>
          <p className="explore-kicker">Live· monthly AI Pulse</p>
          <h2 id="home-pulse-title">Answer three questions to help track AI sentiment over time.</h2>
          <p>
            AI alignment, humanity&rsquo;s future, and whether development should
            pause or accelerate. Answer now, then track how collective opinions—and your own—change over time.
          </p>
        </div>
        <Link href="/pulse" className="lock-in">Take the AI Pulse</Link>
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
