"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Colophon from "./Colophon";
import InfoDialog from "./InfoDialog";
import { GAP_TOPICS } from "@/lib/experiment";
import { lastAnswer } from "@/lib/mine";

/**
 * The front door to the perception-gap battery.
 *
 * Deliberately promises the payoff in the first sentence. The rest of the site
 * asks people to contribute to a crowd result; this asks them to find out
 * something about themselves, which is a much easier thing to say yes to and
 * the only thing here that works on an empty site.
 *
 * No number from any board appears before it is answered — the published
 * figures are the answers, so printing one here would spoil the item and
 * anchor the guess. Same rule as the crowd mean, for the same reason.
 */
export default function GapLanding() {
  const [answered, setAnswered] = useState<number | null>(null);

  useEffect(() => {
    setAnswered(GAP_TOPICS.filter((topic) => lastAnswer(topic.id) !== null).length);
  }, []);

  const started = answered !== null && answered > 0;
  const finished = answered !== null && answered >= GAP_TOPICS.length;
  // Resume where they stopped rather than sending them back through answered
  // items: the server would refuse the repeat anyway (one answer per epoch).
  const resume = GAP_TOPICS.find((topic) => lastAnswer(topic.id) === null) ?? GAP_TOPICS[0];

  return (
    <main className="shell gap-page">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · perception gap</span>
          <InfoDialog />
        </div>
        <h1>How well do you know your country?</h1>
        <p className="lede">
          Eight questions about what other people actually think, do and feel.
          Guess the real national figure — then see how close you were.
        </p>
      </header>

      <section className="gap-hero">
        <p className="gap-hero-lead">
          Almost everybody gets these wrong in the same direction. The
          interesting part isn&rsquo;t your score. It&rsquo;s <em>which way</em> you
          miss.
        </p>
        {/*
          These boards are `cadence: "once"` — answering again would measure how
          well someone remembers the published figure, not what they perceived
          before seeing it. So a finished visitor is sent to their score, never
          offered a retake the server would refuse.
        */}
        <div className="gap-cta">
          {finished ? (
            <Link href="/gap/results" className="lock-in gap-start">
              See my score
            </Link>
          ) : (
            <Link href={`/${resume.id}?stream=gap-start`} className="lock-in gap-start">
              {started ? "Pick up where you left off" : "Start the quiz"}
            </Link>
          )}
        </div>
        {started && !finished && (
          <p className="gap-progress" role="status">
            {answered} of {GAP_TOPICS.length} answered
          </p>
        )}
        <p className="gap-meta">
          {finished
            ? "You've answered all eight. Each one is asked only once — a second guess would just be recalling the answer."
            : "Takes about two minutes · no account · answers are anonymous"}
        </p>
      </section>

      <section className="gap-how" aria-labelledby="gap-how-title">
        <h2 id="gap-how-title">What you&rsquo;re guessing</h2>
        <p>
          Every question has a real answer, measured by a national survey —{" "}
          <strong>Pew</strong>, the <strong>Federal Reserve</strong>,{" "}
          <strong>Gallup</strong>, <strong>Yale</strong>, and a study in{" "}
          <strong>PNAS</strong>. You place a guess on the dial. The moment you
          lock it in, you get the published figure and the source, so you can
          check the answer yourself.
        </p>
        <ol className="gap-steps">
          <li>
            <span className="gap-step-n">1</span>
            <span>
              <strong>Guess the number.</strong> How many people out of 100? The
              dial starts blank.
            </span>
          </li>
          <li>
            <span className="gap-step-n">2</span>
            <span>
              <strong>See the real figure</strong> and who measured it, straight
              away.
            </span>
          </li>
          <li>
            <span className="gap-step-n">3</span>
            <span>
              <strong>Get your score</strong> at the end — and find out which way
              you lean.
            </span>
          </li>
        </ol>
      </section>

      <section className="gap-why" aria-labelledby="gap-why-title">
        <h2 id="gap-why-title">Why this is worth two minutes</h2>
        <p>
          Being wrong about your neighbours is not a harmless mistake. People who
          badly misjudge the other side are measurably more likely to describe
          them as hateful or brainwashed — and the gap gets <em>wider</em> with
          more news consumption, not narrower.
        </p>
        <p className="gap-why-source">
          More in Common surveyed 2,100 Americans and found people believed 55%
          of the other party held extreme views. The real figure was about 30%.
          One of these eight questions is that question.
        </p>
      </section>

      <Colophon />
    </main>
  );
}
