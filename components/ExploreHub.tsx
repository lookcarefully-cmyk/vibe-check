import Link from "next/link";
import InfoDialog from "./InfoDialog";
import StartMainSet from "./StartMainSet";
import Colophon from "./Colophon";
import ExploreMoreShuffle from "./ExploreMoreShuffle";
import { EXTRA_TOPICS, MORE_TOPICS } from "@/lib/experiment";

export default function ExploreHub() {
  return (
    <main className="shell">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · explore</span>
          <InfoDialog />
        </div>
        <h1>Choose your route</h1>
        <p className="lede">
          Scroll a shuffled set, browse for one question, or make a board of your own.
        </p>
      </header>

      <section className="explore-routes" aria-label="Board collections">
        <article>
          <p className="explore-kicker">Research-led</p>
          <h2>Main set</h2>
          <p>
            {EXTRA_TOPICS.length} questions chosen and worded as one collection. Start
            anywhere, then swipe or click through as many as you want.
          </p>
          <div className="explore-actions">
            <StartMainSet label="Start scrolling" />
            <Link href="/boards" className="reset">Browse the main set</Link>
          </div>
        </article>

        <article>
          <p className="explore-kicker">Keep exploring or create</p>
          <h2>More + community</h2>
          <p>
            {MORE_TOPICS.length} more questions from us, followed by public boards
            people chose to share. The two are clearly labeled.
          </p>
          <div className="explore-actions">
            <Link href="/b" className="lock-in">Explore more boards</Link>
            <Link href="/b/new" className="reset">Make a board</Link>
          </div>
        </article>
      </section>

      <p className="explore-note">
        Every stream is optional and finite. Skip freely, stop whenever you like, or
        return here to switch collections.
      </p>

      <ExploreMoreShuffle />

      <Colophon />
    </main>
  );
}
