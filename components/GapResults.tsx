"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Colophon from "./Colophon";
import InfoDialog from "./InfoDialog";
import SubscribeCallout from "./SubscribeCallout";
import { batteryTopics, getBattery } from "@/lib/experiment";
import { lastAnswer } from "@/lib/mine";
import {
  CLOSE_ENOUGH,
  MIN_FINISHERS_FOR_PERCENTILE,
  gradeOf,
  othersThan,
  percentileOf,
  readingOf,
  scoreGap,
  type GapScore,
} from "@/lib/gap";

const SHARE_ORIGIN = "https://www.vibecheckdata.xyz";

/**
 * The end of a quiz battery: the one screen the whole set exists to reach.
 *
 * Scored entirely from this browser's own saved answers — see lib/gap.ts for
 * why. That also means it renders nothing on the server: the first paint would
 * otherwise be a zero score that flips to the real one, which reads as a bug
 * and, worse, as a bad result.
 */
export default function GapResults({ batteryId }: { batteryId: string }) {
  const battery = getBattery(batteryId);
  const topics = batteryTopics(batteryId);
  const [score, setScore] = useState<GapScore | null>(null);
  const [finishers, setFinishers] = useState<number[] | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setScore(scoreGap(topics.map((topic) => ({ topic, guess: lastAnswer(topic.id)?.v ?? null }))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batteryId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/gap?battery=${encodeURIComponent(batteryId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && Array.isArray(d.accuracies)) setFinishers(d.accuracies);
      })
      .catch(() => {
        /* the percentile is a bonus; the score stands without it */
      });
    return () => {
      cancelled = true;
    };
  }, [batteryId]);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const kicker = batteryId === "groups" ? "group size" : "perception gap";
  const otherId = batteryId === "groups" ? "perception" : "groups";
  const otherLabel = batteryId === "groups"
    ? "how well you know your country"
    : "how big that group really is";

  if (!battery) return null;

  if (!score) {
    return (
      <main className="shell gap-results">
        <p className="lede" role="status">Working out your score…</p>
      </main>
    );
  }

  if (!score.answered) {
    return (
      <main className="shell gap-results">
        <header className="masthead">
          <div className="kicker">
            <span className="kicker-text">Vibe Check · {kicker}</span>
            <InfoDialog />
          </div>
          <h1>Nothing to score yet</h1>
          <p className="lede">
            Answer the {topics.length} questions and your score appears here.
            Answers are kept in this browser, so a different device starts fresh.
          </p>
        </header>
        <div className="gap-cta">
          <Link href={`/gap/${batteryId}`} className="lock-in gap-start">Start the quiz</Link>
        </div>
        <Colophon />
      </main>
    );
  }

  const reading = readingOf(score, battery.lean);
  const grade = gradeOf(score);

  /*
   * The percentile only exists for a finished battery compared against other
   * finished batteries — a partial score has nothing to rank, and a handful of
   * finishers has nothing to rank it against.
   */
  const others = finishers ? othersThan(score.accuracy, finishers) : null;
  const percentile = score.complete && others && others.length >= MIN_FINISHERS_FOR_PERCENTILE
    ? percentileOf(score.accuracy, others)
    : null;

  /*
   * The share carries the SCORE and never a board answer, so a recipient still
   * arrives at a blank dial with nothing spoiled. Same rule as SharePrompt: the
   * whole point is that the person you send it to can still play honestly.
   */
  const subject = batteryId === "groups"
    ? "guessing how big different groups in America really are"
    : "guessing what my country actually thinks";
  const shareText = !score.complete
    ? `I'm ${score.answered} questions into ${subject}. How well do you know yours?`
    : percentile !== null
      // A rank is a far better hook than a bare score, and unlike the score it
      // is not obvious whether 54/100 is good.
      ? `I scored ${score.accuracy}/100 ${subject} — better than ${percentile}% of people who've taken it. How would you do?`
      : `I scored ${score.accuracy}/100 ${subject} — ${reading.headline.toLowerCase()}. How would you do?`;
  const shareUrl = `${SHARE_ORIGIN}/gap/${batteryId}`;

  const briefly = (next: "copied" | "failed") => {
    setShareState(next);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setShareState("idle"), 2_500);
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      briefly("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      briefly("failed");
    }
  };

  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const remaining = topics.filter((topic) => lastAnswer(topic.id) === null);

  return (
    <main className="shell gap-results">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · {kicker}</span>
          <InfoDialog />
        </div>
        <h1>{reading.headline}</h1>
      </header>

      <section className="gap-scorecard" aria-labelledby="gap-score-title">
        <h2 id="gap-score-title" className="visually-hidden">Your score</h2>
        <div className="gap-score-figure">
          <span className="gap-score-number">{score.accuracy}</span>
          <span className="gap-score-outof">/ 100</span>
        </div>
        <p className="gap-score-grade">{grade}</p>
        {percentile !== null && others && (
          <p className="gap-percentile">
            Better than <strong>{percentile}%</strong> of the {others.length} people
            who&rsquo;ve finished
          </p>
        )}
        {score.complete && percentile === null && finishers && finishers.length > 0 && (
          /* Say how thin it is rather than dressing it up as a ranking. */
          <p className="gap-percentile is-thin">
            {finishers.length === 1 ? "1 person has" : `${finishers.length} people have`}{" "}
            finished so far — rankings start at {MIN_FINISHERS_FOR_PERCENTILE}
          </p>
        )}
        <dl className="gap-score-stats">
          <div>
            <dt>Average miss</dt>
            <dd>{Math.round(score.meanOff)} pts</dd>
          </div>
          <div>
            <dt>Within {CLOSE_ENOUGH} points</dt>
            <dd>{score.close} of {score.answered}</dd>
          </div>
          <div>
            <dt>Questions answered</dt>
            <dd>{score.answered} of {score.total}</dd>
          </div>
        </dl>
      </section>

      <p className="gap-reading">{reading.detail}</p>

      {!score.complete && remaining.length > 0 && (
        <div className="gap-cta gap-cta-inline">
          <Link href={`/${remaining[0].id}?stream=gap-continue`} className="lock-in gap-start">
            Answer the last {remaining.length === 1 ? "question" : `${remaining.length} questions`}
          </Link>
        </div>
      )}

      <section className="gap-breakdown" aria-labelledby="gap-breakdown-title">
        <h2 id="gap-breakdown-title">Question by question</h2>
        <ol className="gap-marks">
          {score.marks.map((mark) => {
            const benchmark = mark.topic.benchmark!;
            // On a battery with no gloomy direction (groups), colour by whether
            // the guess was too high — the characteristic error there.
            const tone = mark.off <= CLOSE_ENOUGH
              ? "is-close"
              : mark.gloomy === true
                ? "is-gloomy"
                : mark.gloomy === false
                  ? "is-sunny"
                  : battery.lean === "overestimate" && mark.error > 0
                    ? "is-gloomy"
                    : "is-off";
            return (
              <li key={mark.topic.id} className={`gap-mark ${tone}`}>
                <p className="gap-mark-q">{mark.topic.question}</p>
                {/*
                  The distance between the two marks IS the finding, so it is
                  drawn as a filled span rather than left to be inferred from
                  two dots. aria-hidden because the numbers below say the same
                  thing in words.
                */}
                <div className="gap-mark-bar" aria-hidden="true">
                  <span className="gap-mark-track" />
                  <span
                    className="gap-mark-span"
                    style={{
                      left: `${Math.min(mark.guessPct, mark.truthPct)}%`,
                      width: `${mark.off}%`,
                    }}
                  />
                  <span className="gap-mark-truth" style={{ left: `${mark.truthPct}%` }} />
                  <span className="gap-mark-guess" style={{ left: `${mark.guessPct}%` }} />
                </div>
                <p className="gap-mark-numbers">
                  <span className="gap-mark-yours">You said <strong>{mark.guessPct}</strong></span>
                  <span className="gap-mark-real">Real figure <strong>{benchmark.display}</strong></span>
                  <span className="gap-mark-delta">
                    {mark.off === 0
                      ? "exact"
                      : `${mark.off} pts ${mark.error > 0 ? "high" : "low"}`}
                  </span>
                </p>
                <p className="gap-mark-source">
                  <a href={benchmark.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {benchmark.sourceName}
                  </a>
                  <span>{benchmark.fielded}</span>
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="share-prompt gap-share" aria-label="Share your score">
        <div>
          <p className="share-kicker">Who else thinks they know?</p>
          <h3>Send it to someone who&rsquo;d disagree.</h3>
          <p>
            They get the blank quiz — your score and every answer stay hidden, so
            they play it honestly.
          </p>
        </div>
        <div className="share-actions">
          <button type="button" className="lock-in" aria-live="polite" onClick={() => void share()}>
            {shareState === "copied"
              ? "Copied!"
              : shareState === "failed"
                ? "Couldn’t copy"
                : "Share my score"}
          </button>
          <a className="reset share-x" href={xUrl} target="_blank" rel="noopener noreferrer">
            Post on X
          </a>
        </div>
      </section>

      <SubscribeCallout variant="general" />

      <section className="gap-next" aria-labelledby="gap-next-title">
        <h2 id="gap-next-title">Keep going</h2>
        <p>
          Try <Link href={`/gap/${otherId}`}>{otherLabel}</Link> — a different
          eight. Or the rest of Vibe Check, where there&rsquo;s no published
          answer, just where everyone else landed.
        </p>
        <div className="gap-cta">
          <Link href="/explore" className="reset">Explore the boards</Link>
          <Link href="/pulse" className="reset">Monthly AI poll</Link>
        </div>
      </section>

      <Colophon />
    </main>
  );
}
