"use client";

import Colophon from "./Colophon";
import InfoDialog from "./InfoDialog";
import GapBatteryCards from "./GapBatteryCards";

/**
 * The quiz hub. Lists every battery as a card.
 *
 * Batteries are pure data (GAP_BATTERIES in lib/experiment.ts), so a new
 * flagship set is a registry entry plus its boards — this page needs no change.
 */
export default function GapHub() {
  return (
    <main className="shell gap-hub">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · quizzes</span>
          <InfoDialog />
        </div>
        <h1>How well do you know America?</h1>
        <p className="lede">
          Guess a real national figure, then see how close you were. Each quiz is
          eight questions checked against published numbers — Census, Gallup,
          Pew, the CBO.
        </p>
      </header>

      <GapBatteryCards />

      <p className="gap-hub-note">
        No account, answers are anonymous, and each figure comes with its source
        so you can check it yourself.
      </p>

      <Colophon />
    </main>
  );
}
