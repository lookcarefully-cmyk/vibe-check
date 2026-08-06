"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopicNav from "./TopicNav";
import InfoDialog from "./InfoDialog";
import Colophon from "./Colophon";
import StartMainSet from "./StartMainSet";
import { EXPERIMENT_ENABLED, EXTRA_TOPICS, groupTopics } from "@/lib/experiment";
import { readRunState } from "@/lib/run";
import { voteStorageKey } from "@/lib/topics";

/**
 * The browse page, and with the experiment parked, the site's front door.
 *
 * Built to stay usable as boards are added. Three things do that work: sections
 * come from each board's `category`, so a new section is just a new string; the
 * filter narrows by any word in the question, subject or category; and the
 * counter tells people how much is left rather than making them remember.
 */
export default function BoardIndex() {
  const [query, setQuery] = useState("");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [runComplete, setRunComplete] = useState<boolean | null>(null);

  useEffect(() => {
    setAnsweredCount(
      EXTRA_TOPICS.filter(
        (t) => window.localStorage.getItem(voteStorageKey(t.id)) !== null,
      ).length,
    );
    if (EXPERIMENT_ENABLED) setRunComplete(readRunState().complete);
  }, []);

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXTRA_TOPICS;
    return EXTRA_TOPICS.filter((t) =>
      `${t.question} ${t.subject} ${t.category} ${t.axis} ${t.leftLabel} ${t.rightLabel}`
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  const groups = groupTopics(matching);

  return (
    <main className="shell">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · public opinion, made visible</span>
          <InfoDialog />
        </div>
        <h1>Main set</h1>
        <p className="lede">
          Browse for one question, or start a shuffled stream and answer as many
          as you want.
        </p>
      </header>

      <div className="front-door-actions">
        <StartMainSet label="Start scrolling" />
        <Link href="/explore" className="reset">Back to Explore</Link>
      </div>

      <input
        type="search"
        className="board-filter"
        placeholder="Filter questions…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Filter questions"
      />

      <p className="board-progress">
        {answeredCount > 0
          ? `You've answered ${answeredCount} of ${EXTRA_TOPICS.length}`
          : `${EXTRA_TOPICS.length} questions`}
        {query && ` · ${matching.length} match${matching.length === 1 ? "" : "es"}`}
      </p>

      {groups.length === 0 ? (
        <p className="board-empty">Nothing matches &ldquo;{query}&rdquo;.</p>
      ) : (
        groups.map((group) => (
          <section key={group.title} className="board-group">
            <h2>{group.title}</h2>
            {/*
              Tiles keep their subject even though the category heading is right
              above them. What identifies a board is subject + axis: a category
              of "Everyday habits" over a tile reading only "ADDICTIVE?" doesn't
              tell you it's about coffee, and three sections currently contain an
              addictiveness question. Mild repetition beats ambiguity.
            */}
            <TopicNav activeId="" refreshKey={0} topics={group.topics} />
          </section>
        ))
      )}

      <p className="board-index-run">
        <Link href="/b">Boards people made</Link> · <Link href="/b/new">Make your own &rarr;</Link>
      </p>

      {EXPERIMENT_ENABLED && runComplete !== null && (
        <p className="board-index-run">
          {runComplete ? (
            <>
              The main set is done. <Link href="/results">See those results again</Link>.
            </>
          ) : (
            <>
              There&rsquo;s also a main set. <Link href="/">Start it here</Link>.
            </>
          )}
        </p>
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
