import type { Metadata } from "next";
import GapResults from "@/components/GapResults";

export const metadata: Metadata = {
  title: "Your perception gap — Vibe Check",
  description:
    "How close your guesses came to what your country actually thinks, question by question.",
  // Not indexed: this page is one visitor's own score, read from their browser.
  // There is nothing here for a search engine, and a shared link should send
  // people to the blank quiz rather than to an empty scoreboard.
  robots: { index: false, follow: true },
  openGraph: {
    title: "How well do you know your country?",
    description:
      "Eight questions. Guess what your country really thinks — then see which way you lean.",
    siteName: "Vibe Check",
    type: "website",
    url: "/gap",
  },
};

export default function GapResultsPage() {
  return <GapResults />;
}
