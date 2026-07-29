"use client";

import { useEffect, useState } from "react";
import MiniBoard from "./MiniBoard";
import type { TopicSummary } from "@/app/api/summary/route";
import { TOPICS } from "@/lib/topics";

interface TopicNavProps {
  activeId: string;
  /** Bumped by the parent after a vote lands, to refresh the tiles. */
  refreshKey: number;
}

export default function TopicNav({ activeId, refreshKey }: TopicNavProps) {
  const [summary, setSummary] = useState<TopicSummary[]>([]);

  useEffect(() => {
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
        return (
          <MiniBoard
            key={topic.id}
            topic={topic}
            active={topic.id === activeId}
            mean={s && s.count > 0 ? s.mean : null}
            count={s?.count ?? 0}
          />
        );
      })}
    </nav>
  );
}
