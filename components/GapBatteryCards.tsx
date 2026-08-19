"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAP_BATTERIES, batteryTopics } from "@/lib/experiment";
import { lastAnswer } from "@/lib/mine";

/**
 * The quiz cards — one per battery — shown on the home page and the /gap hub.
 *
 * Batteries are pure data (GAP_BATTERIES in lib/experiment.ts), so a new
 * flagship set is a registry entry plus its boards; this list picks it up with
 * no change. Progress is read from this browser so a card can say "continue" or
 * "see your score" instead of always "start".
 */
export default function GapBatteryCards() {
  const [progress, setProgress] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    setProgress(
      Object.fromEntries(
        GAP_BATTERIES.map((b) => [
          b.id,
          batteryTopics(b.id).filter((t) => lastAnswer(t.id) !== null).length,
        ]),
      ),
    );
  }, []);

  return (
    <section className="gap-hub-cards" aria-label="Choose a quiz">
      {GAP_BATTERIES.map((b) => {
        const total = batteryTopics(b.id).length;
        const done = progress?.[b.id] ?? 0;
        const finished = done >= total && total > 0;
        const started = done > 0 && !finished;
        return (
          <Link key={b.id} href={`/gap/${b.id}`} className="gap-hub-card">
            <h2>{b.title}</h2>
            <p className="gap-hub-hook">{b.hook}</p>
            <p className="gap-hub-meta">
              {total} questions · about 2 minutes
              {finished ? " · done ✓" : started ? ` · ${done} of ${total} so far` : ""}
            </p>
            <span className="gap-hub-go" aria-hidden="true">
              {finished ? "See your score →" : started ? "Continue →" : "Start →"}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
