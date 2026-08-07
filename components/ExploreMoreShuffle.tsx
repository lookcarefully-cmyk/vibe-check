"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MORE_TOPICS } from "@/lib/experiment";
import { readBoardReaction } from "@/lib/reaction";
import { revealTypeOf, type RevealType } from "@/lib/topics";

const SAMPLE_SIZE = 6;

interface CommunitySample {
  slug: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
  revealType: "other-side" | "crowd" | null;
}

interface SampleItem {
  id: string;
  href: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
  revealType: RevealType | null;
  visitorMade: boolean;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sampleItems(community: CommunitySample[]): SampleItem[] {
  const curated = shuffle(MORE_TOPICS).map((topic) => ({
    id: topic.id,
    href: `/${topic.id}?stream=community-start`,
    question: topic.question,
    leftLabel: topic.leftLabel,
    rightLabel: topic.rightLabel,
    revealType: revealTypeOf(topic),
    visitorMade: false,
  }));
  const visitorMade = shuffle(
    community.filter((board) => readBoardReaction(board.slug) !== "dislike"),
  ).map((board) => ({
    id: board.slug,
    href: `/b/${board.slug}?stream=community-start`,
    question: board.question,
    leftLabel: board.leftLabel,
    rightLabel: board.rightLabel,
    revealType: board.revealType,
    visitorMade: true,
  }));

  // Give early community boards guaranteed visibility instead of asking one
  // new board to win a 1-in-35 random draw. Once there are several, up to half
  // of this small preview comes from visitors.
  const visitorSlots = Math.min(visitorMade.length, Math.ceil(SAMPLE_SIZE / 2));
  return shuffle([
    ...visitorMade.slice(0, visitorSlots),
    ...curated.slice(0, SAMPLE_SIZE - visitorSlots),
  ]);
}

/** A lightweight mixed discovery shelf; no result numbers are exposed here. */
export default function ExploreMoreShuffle() {
  const [community, setCommunity] = useState<CommunitySample[]>([]);
  const [items, setItems] = useState<SampleItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/boards?sort=trending")
      .then((response) => (response.ok ? response.json() : { boards: [] }))
      .then((data) => {
        if (!cancelled && Array.isArray(data.boards)) setCommunity(data.boards);
      })
      .catch(() => {
        /* curated questions still fill the shelf if community loading fails */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setItems(sampleItems(community));
  }, [community]);

  const reshuffle = useCallback(() => setItems(sampleItems(community)), [community]);

  if (items.length === 0) return null;

  return (
    <section className="board-group explore-shuffle" aria-labelledby="explore-shuffle-title">
      <h2 id="explore-shuffle-title">A few to try</h2>
      <ul className="clist">
        {items.map((item) => (
          <li key={`${item.visitorMade ? "visitor" : "vibe"}-${item.id}`}>
            <Link href={item.href}>{item.question}</Link>
            <span className="clist-meta">
              {item.leftLabel} → {item.rightLabel}
              {item.revealType === "real-figure" && " · guess the real figure"}
              {item.revealType === "other-side" && " · guess where others landed"}
              {item.revealType === "crowd" && " · guess where others landed"}
              {item.visitorMade && " · visitor-made"}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="reset" onClick={reshuffle}>
        Shuffle these
      </button>
    </section>
  );
}
