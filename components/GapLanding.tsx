"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Colophon from "./Colophon";
import InfoDialog from "./InfoDialog";
import { batteryTopics, getBattery } from "@/lib/experiment";
import { lastAnswer } from "@/lib/mine";

const KICKER: Record<string, string> = {
  perception: "perception gap",
  groups: "group size",
  budget: "the federal budget",
};

/**
 * The front door to one quiz battery (/gap/<battery>).
 *
 * Deliberately spare: a title, one line of provocation, and a big button. The
 * how and the why used to live here and made the page a wall of text between
 * the visitor and the thing they came to do. You learn how it works by playing
 * question one; the point lands harder for having played than for being told.
 *
 * No number appears before the visitor guesses — the published figures are the
 * answers, so printing one here would spoil the item and anchor the guess.
 */
export default function GapLanding({ batteryId }: { batteryId: string }) {
  const battery = getBattery(batteryId);
  const topics = batteryTopics(batteryId);
  const [answered, setAnswered] = useState<number | null>(null);

  useEffect(() => {
    setAnswered(topics.filter((topic) => lastAnswer(topic.id) !== null).length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batteryId]);

  if (!battery) return null;

  const count = topics.length;
  const started = answered !== null && answered > 0;
  const finished = answered !== null && answered >= count;
  // Resume where they stopped: the server refuses a repeat anyway (once each).
  const resume = topics.find((topic) => lastAnswer(topic.id) === null) ?? topics[0];

  return (
    <main className="shell gap-page">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · {KICKER[batteryId] ?? "quiz"}</span>
          <InfoDialog />
        </div>
        <h1>{battery.title}</h1>
      </header>

      <section className="gap-hero">
        <p className="gap-hero-lead">{battery.hook}</p>
        <div className="gap-cta">
          {finished ? (
            <Link href={`/gap/${batteryId}/results`} className="lock-in gap-start">
              See my score
            </Link>
          ) : (
            <Link href={`/${resume.id}?stream=gap-start`} className="lock-in gap-start">
              {started ? "Pick up where you left off" : "Start"}
            </Link>
          )}
        </div>
        <p className="gap-meta">
          {finished
            ? `You've answered all ${count} — each is asked only once.`
            : `${count} questions · about 2 minutes · real figures, with sources`}
        </p>
      </section>

      <p className="gap-switch">
        <Link href="/gap">Try another quiz</Link>
      </p>

      <Colophon />
    </main>
  );
}
