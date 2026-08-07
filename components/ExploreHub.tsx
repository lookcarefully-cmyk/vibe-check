import Link from "next/link";
import InfoDialog from "./InfoDialog";
import StartMainSet from "./StartMainSet";
import Colophon from "./Colophon";
import ExploreMoreShuffle from "./ExploreMoreShuffle";

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
        <article className="is-pulse">
          <p className="explore-kicker">Monthly · three questions</p>
          <h2>AI Pulse</h2>
          <p>
            A stable monthly read on alignment, humanity&rsquo;s future, and the
            pace of advanced AI development.
          </p>
          <div className="explore-actions">
            <Link href="/pulse" className="lock-in">Take the Pulse</Link>
          </div>
        </article>

        <article>
          <p className="explore-kicker">Research-led</p>
          <h2>Main set</h2>
          <p>
            Our focused set of research-led questions. Start anywhere, then swipe or
            click through as many as you want.
          </p>
          <div className="explore-actions">
            <StartMainSet label="Start scrolling" />
            <Link href="/boards" className="reset">Browse the main set</Link>
          </div>
        </article>

        <article>
          <p className="explore-kicker">Browse or create</p>
          <h2>Community</h2>
          <p>
            Find more questions to answer, including boards people publish — or
            make an unlisted one for your own people.
          </p>
          <div className="explore-actions">
            <Link href="/b" className="lock-in">Explore community boards</Link>
            <Link href="/b/new" className="reset">Make a board</Link>
          </div>
        </article>
      </section>

      <ExploreMoreShuffle />

      <Colophon />
    </main>
  );
}
