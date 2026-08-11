import type { Metadata } from "next";
import GapLanding from "@/components/GapLanding";

export const metadata: Metadata = {
  title: "How well do you know your country? — Vibe Check",
  description:
    "Eight questions about what other people actually think, do and feel. Guess the real national figure, then see how close you were.",
  openGraph: {
    title: "How well do you know your country?",
    description:
      "Eight questions. Guess what your country really thinks — then see which way you lean.",
    siteName: "Vibe Check",
    type: "website",
    url: "/gap",
  },
  twitter: {
    card: "summary_large_image",
    title: "How well do you know your country?",
    description:
      "Eight questions. Guess what your country really thinks — then see which way you lean.",
  },
};

export default function GapPage() {
  return <GapLanding />;
}
