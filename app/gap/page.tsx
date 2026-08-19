import type { Metadata } from "next";
import GapHub from "@/components/GapHub";

export const metadata: Metadata = {
  title: "How well do you know America? — Vibe Check",
  description:
    "Short quizzes that check your guesses against real national figures — how the country actually thinks, and how big different groups really are.",
  openGraph: {
    title: "How well do you know America?",
    description: "Guess the real national figure — then see how close you were.",
    siteName: "Vibe Check",
    type: "website",
    url: "/gap",
  },
  twitter: {
    card: "summary_large_image",
    title: "How well do you know America?",
    description: "Guess the real national figure — then see how close you were.",
  },
};

export default function GapHubPage() {
  return <GapHub />;
}
