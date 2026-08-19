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
          Guess a real figure, then see how close you were. Eight questions each,
          checked against Census, Gallup, Pew and the CBO.
        </p>
      </header>

      <GapBatteryCards />

      <p className="gap-hub-note">
        No account. Every figure comes with its source.
      </p>

      <Colophon />
    </main>
  );
}
