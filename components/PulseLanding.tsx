"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Colophon from "./Colophon";
import InfoDialog from "./InfoDialog";
import SharePrompt from "./SharePrompt";
import SubscribeCallout from "./SubscribeCallout";
import { PULSE_TOPICS } from "@/lib/experiment";
import { canAnswerNow, myStanding } from "@/lib/mine";
import { revealStorageKey } from "@/lib/topics";

interface PulseStatus {
  ready: boolean;
  answeredThisMonth: boolean;
  closed: boolean;
  waiting: boolean;
}

export default function PulseLanding() {
  const [statuses, setStatuses] = useState<Record<string, PulseStatus>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const now = Date.now();
    setStatuses(Object.fromEntries(PULSE_TOPICS.map((topic) => {
      const standing = myStanding(topic, now);
      let closed = false;
      try {
        closed = window.localStorage.getItem(revealStorageKey(topic.id)) !== null;
      } catch {
        /* storage-restricted browsing: the board page/server remains authoritative */
      }
      return [topic.id, {
        ready: canAnswerNow(topic, now),
        answeredThisMonth: standing.eligibility.reason === "same-epoch",
        closed,
        waiting: standing.eligibility.reason === "too-soon",
      }];
    })));
    setLoaded(true);
  }, []);

  const firstReady = PULSE_TOPICS.find((topic) => statuses[topic.id]?.ready);
  const completedCount = useMemo(
    () => PULSE_TOPICS.filter((topic) => {
      const status = statuses[topic.id];
      return status?.answeredThisMonth || status?.closed;
    }).length,
    [statuses],
  );
  const waiting = PULSE_TOPICS.some((topic) => statuses[topic.id]?.waiting);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date());

  return (
    <main className="shell pulse-page">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · monthly AI poll</span>
          <InfoDialog />
        </div>
        <h1>How are we feeling about AI?</h1>
        <p className="lede">
          Three stable questions, once a month. See where people land now — and
          how the answers move over time.
        </p>
      </header>

      <SubscribeCallout prominent />

      <section className="pulse-card" aria-labelledby="pulse-month">
        <p className="pulse-date" id="pulse-month">{month}</p>
        <ol className="pulse-questions">
          {PULSE_TOPICS.map((topic, index) => {
            const status = statuses[topic.id];
            return (
              <li key={topic.id}>
                <span className="pulse-number">{index + 1}</span>
                <div>
                  <Link href={`/${topic.id}?stream=pulse-start`}>{topic.question}</Link>
                  <small>
                    {!loaded
                      ? "Checking…"
                      : status?.closed
                        ? "Results viewed · voting closed"
                        : status?.answeredThisMonth
                          ? "Answered this month · view results"
                          : status?.waiting
                            ? "Available again soon"
                            : "Ready to answer"}
                  </small>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="pulse-actions">
          {firstReady ? (
            <Link href={`/${firstReady.id}?stream=pulse-start`} className="lock-in">
              {completedCount > 0 ? "Continue the AI poll" : "Take the AI poll"}
            </Link>
          ) : loaded ? (
            <p className="pulse-complete">
              {waiting
                ? "The next monthly poll is open. Your questions unlock after the three-day gap."
                : "You’re caught up. The AI poll reopens next month."}
            </p>
          ) : (
            <span className="lock-in is-loading">Checking the AI poll…</span>
          )}
          <small>About one minute. Skip any question.</small>
        </div>
      </section>

      <SharePrompt
        question="How are we feeling about AI?"
        path="/pulse"
        kicker="Share the monthly AI poll"
        heading="Who else should take it?"
        description="They’ll get all three blank questions. No answers or current results are included."
        ariaLabel="Share the monthly AI poll"
      />

      <p className="pulse-method-note">
        The questions remain the same each month to track sentiment shifts. Respondents
        are self-selected, so the results describe this crowd rather than its population.
      </p>

      <p className="board-index-run">
        <Link href="/explore">Explore every board</Link>
      </p>

      <Colophon />
    </main>
  );
}
