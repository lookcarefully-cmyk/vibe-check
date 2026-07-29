"use client";

import { useEffect, useState } from "react";
import MiniBoard from "./MiniBoard";
import type { TopicSummary } from "@/app/api/summary/route";
import { TOPICS, voteStorageKey } from "@/lib/topics";

interface TopicNavProps {
  activeId: string;
  /** Bumped by the parent after a vote lands, to refresh the tiles. */
  refreshKey: number;
}

export default function TopicNav({ activeId, refreshKey }: TopicNavProps) {
  const [summary, setSummary] = useState<TopicSummary[]>([]);
  const [answered, setAnswered] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Which boards this viewer has answered. Read on the client only, so the
    // server never renders a revealed average into the HTML.
    setAnswered(
      new Set(
        TOPICS.filter((t) => window.localStorage.getItem(voteStorageKey(t.id)) !== null).map(
          (t) => t.id,
        ),
      ),
    );

    let cancelled = false;
    fetch("/api/summary", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setSummary(data);
      })
      .catch(() => {
        /* the tiles simply stay blank if this fails */
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <nav className="topic-nav" aria-label="Boards">
      {TOPICS.map((topic) => {
        const s = summary.find((x) => x.id === topic.id);
        const isAnswered = answered.has(topic.id);
        return (
          <MiniBoard
            key={topic.id}
            topic={topic}
            active={topic.id === activeId}
            answered={isAnswered}
            // Withheld entirely unless answered, so nothing can leak it early.
            mean={isAnswered && s && s.count > 0 ? s.mean : null}
            count={s?.count ?? 0}
          />
        );
      })}
    </nav>
  );
}
