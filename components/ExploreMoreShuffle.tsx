"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MORE_TOPICS } from "@/lib/experiment";
import { revealTypeOf, type Topic } from "@/lib/topics";

const SAMPLE_SIZE = 6;

function sampleTopics(): Topic[] {
  const pool = [...MORE_TOPICS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, SAMPLE_SIZE);
}

/** A lightweight discovery shelf; no result numbers are exposed here. */
export default function ExploreMoreShuffle() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const reshuffle = useCallback(() => setTopics(sampleTopics()), []);

  useEffect(() => {
    reshuffle();
  }, [reshuffle]);

  if (topics.length === 0) return null;

  return (
    <section className="board-group explore-shuffle" aria-labelledby="explore-shuffle-title">
      <h2 id="explore-shuffle-title">A few from the wider shelf</h2>
      <ul className="clist">
        {topics.map((topic) => {
          const revealType = revealTypeOf(topic);
          return (
            <li key={topic.id}>
              <Link href={`/${topic.id}?stream=community-start`}>{topic.question}</Link>
              <span className="clist-meta">
                {topic.leftLabel} → {topic.rightLabel}
                {revealType === "other-side" && " · guess where others landed"}
                {revealType === "crowd" && " · guess where others landed"}
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="reset" onClick={reshuffle}>
        Shuffle these
      </button>
    </section>
  );
}
