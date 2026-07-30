"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopicNav from "./TopicNav";
import InfoDialog from "./InfoDialog";
import { readRunState } from "@/lib/run";

/** Every board, browsable. Reached from the end of the run, or directly. */
export default function BoardIndex() {
  // null until read on the client, so server and first client render agree.
  const [runComplete, setRunComplete] = useState<boolean | null>(null);
  useEffect(() => setRunComplete(readRunState().complete), []);

  return (
    <main className="shell">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · public data collection</span>
          <InfoDialog />
        </div>
        <h1>All the boards</h1>
        <p className="lede">
          Pick any of them. A board stays blank until you&rsquo;ve answered it.
        </p>
      </header>

      <TopicNav activeId="" refreshKey={0} />

      {/* The core three live in the run, not in the grid above. */}
      {runComplete !== null && (
        <p className="board-index-run">
          {runComplete ? (
            <>
              The main three-question set is done.{" "}
              <Link href="/results">See those results again</Link>.
            </>
          ) : (
            <>
              There&rsquo;s also a main three-question set.{" "}
              <Link href="/social-addictive">Start it here</Link>.
            </>
          )}
        </p>
      )}

      <footer className="disclosure">
        Anonymous: your answer, the time, and a random ID that groups your answers
        together. No name, email, account or IP. Aggregate results are used for writing
        on X and Substack.{" "}
        <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>
    </main>
  );
}
