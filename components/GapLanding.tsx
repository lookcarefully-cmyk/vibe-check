"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Colophon from "./Colophon";
import InfoDialog from "./InfoDialog";
import { batteryTopics, getBattery } from "@/lib/experiment";
import { lastAnswer } from "@/lib/mine";

/**
 * The front door to one quiz battery (/gap/<battery>).
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
export default function GapLanding({ batteryId }: { batteryId: string }) {
  const battery = getBattery(batteryId);
  const topics = batteryTopics(batteryId);
  const [answered, setAnswered] = useState<number | null>(null);

  useEffect(() => {
    setAnswered(topics.filter((topic) => lastAnswer(topic.id) !== null).length);
    // topics is derived from a module constant; recomputing per battery id is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batteryId]);

  if (!battery) return null;

  const count = topics.length;
  const started = answered !== null && answered > 0;
  const finished = answered !== null && answered >= count;
  // Resume where they stopped rather than sending them back through answered
  // items: the server would refuse the repeat anyway (one answer per epoch).
  const resume = topics.find((topic) => lastAnswer(topic.id) === null) ?? topics[0];
  const isGroups = batteryId === "groups";

  return (
    <main className="shell gap-page">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · {isGroups ? "group size" : "perception gap"}</span>
          <InfoDialog />
        </div>
        <h1>{battery.title}</h1>
        <p className="lede">
          {count} questions. {battery.blurb}
        </p>
      </header>

      <section className="gap-hero">
        <p className="gap-hero-lead">{battery.hook}</p>
        {/*
          These boards are `cadence: "once"` — answering again would measure how
          well someone remembers the published figure, not what they perceived
          before seeing it. So a finished visitor is sent to their score, never
          offered a retake the server would refuse.
        */}
        <div className="gap-cta">
          {finished ? (
            <Link href={`/gap/${batteryId}/results`} className="lock-in gap-start">
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
            {answered} of {count} answered
          </p>
        )}
        <p className="gap-meta">
          {finished
            ? `You've answered all ${count}. Each one is asked only once — a second guess would just be recalling the answer.`
            : "Takes about two minutes · no account · answers are anonymous"}
        </p>
      </section>

      <section className="gap-how" aria-labelledby="gap-how-title">
        <h2 id="gap-how-title">What you&rsquo;re guessing</h2>
        <p>
          {isGroups ? (
            <>
              Every question has a real answer, measured by a national survey or
              the <strong>Census</strong> — <strong>Gallup</strong>,{" "}
              <strong>Pew</strong>, the <strong>Bureau of Labor Statistics</strong>.
              You place a guess on the dial. The moment you lock it in, you get
              the published figure and the source.
            </>
          ) : (
            <>
              Every question has a real answer, measured by a national survey —{" "}
              <strong>Pew</strong>, the <strong>Federal Reserve</strong>,{" "}
              <strong>Gallup</strong>, <strong>Yale</strong>, and a study in{" "}
              <strong>PNAS</strong>. You place a guess on the dial. The moment you
              lock it in, you get the published figure and the source, so you can
              check the answer yourself.
            </>
          )}
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
        {isGroups ? (
          <>
            <p>
              People picture minorities as several times their real size — and it
              barely matters who you ask. It is one of the most consistent
              findings in social science, and it quietly shapes how threatening or
              divided the country feels.
            </p>
            <p className="gap-why-source">
              In a 2025 <em>PNAS</em> study, Americans estimated the country was
              around 30% gay or lesbian (really about 3%) and 27% Muslim (really
              about 1%). One of these questions is one of those.
            </p>
          </>
        ) : (
          <>
            <p>
              Being wrong about your neighbours is not a harmless mistake. People
              who badly misjudge the other side are measurably more likely to
              describe them as hateful or brainwashed — and the gap gets{" "}
              <em>wider</em> with more news consumption, not narrower.
            </p>
            <p className="gap-why-source">
              More in Common surveyed 2,100 Americans and found people believed
              55% of the other party held extreme views. The real figure was
              about 30%. One of these questions is that question.
            </p>
          </>
        )}
      </section>

      <p className="gap-switch">
        {isGroups ? (
          <>Or try <Link href="/gap/perception">how well you know your country</Link>.</>
        ) : (
          <>Or try <Link href="/gap/groups">how big that group really is</Link>.</>
        )}
      </p>

      <Colophon />
    </main>
  );
}
