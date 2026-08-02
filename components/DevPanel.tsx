"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ARMS, armTopics, type Arm } from "@/lib/experiment";
import { TOPICS, voteStorageKey } from "@/lib/topics";

/**
 * A test harness for walking the run as a fresh visitor.
 *
 * Only touches this browser's own localStorage — it cannot alter anyone else's
 * experience or reach the stored votes. It is reachable by anyone who guesses
 * the URL, which is acceptable: the worst it allows is re-answering, and the
 * per-IP rate limit already caps that at five per board per day.
 *
 * Test answers ARE real votes and do land in the store. Clear them before
 * launch with `npm run reset`.
 */
export default function DevPanel() {
  const router = useRouter();
  const [arm, setArm] = useState<string | null>(null);
  const [answered, setAnswered] = useState<string[]>([]);

  const refresh = () => {
    setArm(window.localStorage.getItem("vibecheck:arm"));
    setAnswered(
      TOPICS.filter((t) => window.localStorage.getItem(voteStorageKey(t.id)) !== null).map(
        (t) => t.id,
      ),
    );
  };

  useEffect(refresh, []);

  const clearAnswers = () => {
    for (const topic of TOPICS) window.localStorage.removeItem(voteStorageKey(topic.id));
    refresh();
  };

  const startAs = (next: Arm) => {
    clearAnswers();
    window.localStorage.setItem("vibecheck:arm", next);
    router.push("/");
  };

  return (
    <main className="shell">
      <header className="masthead">
        <p className="kicker">
          <span className="kicker-text">Vibe Check · test harness</span>
        </p>
        <h1>Try the run</h1>
        <p className="lede">
          Pick an arm to start it from scratch. Only your own browser is affected.
        </p>
      </header>

      <section className="dev-block">
        <p className="dev-state">
          Current arm: <strong>{arm ?? "none yet"}</strong>
          {arm && <> — {armTopics(arm as Arm).map((t) => t.question).join("  →  ")}</>}
        </p>
        <p className="dev-state">
          Answered so far: <strong>{answered.length ? answered.join(", ") : "nothing"}</strong>
        </p>
      </section>

      <section className="dev-block">
        <h2>Start a fresh run</h2>
        <div className="dev-buttons">
          {ARMS.map((a) => (
            <button key={a} type="button" className="reset" onClick={() => startAs(a)}>
              Arm {a}
              <small>{armTopics(a).map((t) => t.subject).join(" → ")}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="dev-block">
        <h2>Or just clear</h2>
        <div className="dev-buttons">
          <button type="button" className="reset" onClick={clearAnswers}>
            Forget my answers (keep arm)
          </button>
          <button
            type="button"
            className="reset"
            onClick={() => {
              Object.keys(window.localStorage)
                .filter((k) => k.startsWith("vibecheck:"))
                .forEach((k) => window.localStorage.removeItem(k));
              refresh();
            }}
          >
            Forget everything, reassign at random
          </button>
        </div>
      </section>

      <footer className="disclosure">
        Answers given here are real votes and do land in the database. Wipe them before
        launch with <code>npm run reset</code>.
      </footer>
    </main>
  );
}
