"use client";

import TopicNav from "./TopicNav";
import InfoDialog from "./InfoDialog";

/** Every board, browsable. Reached from the end of the run, or directly. */
export default function BoardIndex() {
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

      <footer className="disclosure">
        Anonymous: your answer, the time, and a random ID that groups your answers
        together. No name, email, account or IP. Aggregate results are used for writing
        on X and Substack.{" "}
        <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>
    </main>
  );
}
