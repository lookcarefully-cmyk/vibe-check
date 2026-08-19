"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Colophon from "./Colophon";
import InfoDialog from "./InfoDialog";
import { GAP_BATTERIES, batteryTopics } from "@/lib/experiment";
import { lastAnswer } from "@/lib/mine";

/**
 * The quiz hub. Lists every battery as a card.
 *
 * Batteries are pure data (GAP_BATTERIES in lib/experiment.ts), so a new
 * flagship set is a registry entry plus its boards — this page needs no change.
 */
export default function GapHub() {
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
    <main className="shell gap-hub">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · quizzes</span>
          <InfoDialog />
        </div>
        <h1>How well do you know America?</h1>
        <p className="lede">
          Guess a real national figure, then see how close you were. Two short
          quizzes, each eight questions against published numbers — Census,
          Gallup, Pew, the Fed.
        </p>
      </header>

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

      <p className="gap-hub-note">
        No account, answers are anonymous, and each figure comes with its source
        so you can check it yourself.
      </p>

      <Colophon />
    </main>
  );
}
