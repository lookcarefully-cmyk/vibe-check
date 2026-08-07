import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Colophon from "@/components/Colophon";

export const metadata: Metadata = {
  title: "Vibe Check — monthly reminder",
  description: "Get a reminder when the next monthly AI Pulse opens.",
};

export const dynamic = "force-dynamic";

function substackUrl(): string | null {
  const raw = (
    process.env.SUBSTACK_URL
    ?? process.env.NEXT_PUBLIC_SUBSTACK_URL
    ?? "https://vibecheckpublicdata.substack.com/"
  ).trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function SubscribePage() {
  const destination = substackUrl();
  if (destination) redirect(destination);

  return (
    <main className="shell">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · monthly AI Pulse</span>
        </div>
        <h1>The reminder list is opening soon.</h1>
        <p className="lede">
          No email was collected here. When reminders open, signup will happen on
          Substack and stay separate from anonymous Vibe Check answers.
        </p>
      </header>
      <Link href="/pulse" className="reset">Back to the AI Pulse</Link>
      <Colophon />
    </main>
  );
}
