import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vibe Check — page not found",
};

/**
 * Styled 404. The default Next.js error page looks nothing like the site, and a
 * mistyped board URL is the most likely way to land here.
 */
export default function NotFound() {
  return (
    <main className="shell notfound">
      <p className="kicker">
        <span className="kicker-text">Vibe Check</span>
      </p>
      <h1>Off the dial</h1>
      <p className="lede">
        There&rsquo;s no board here. It may have been renamed, or the link was
        mistyped.
      </p>
      <div className="notfound-actions">
        <Link href="/" className="reset">
          Featured questions
        </Link>
        <Link href="/explore" className="reset">
          Explore boards
        </Link>
      </div>
    </main>
  );
}
