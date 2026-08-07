import type { Metadata } from "next";
import PulseLanding from "@/components/PulseLanding";

export const metadata: Metadata = {
  title: "Vibe Check — monthly AI poll",
  description:
    "Three monthly questions on current AI alignment, who stands to benefit, and the pace of development.",
  openGraph: {
    title: "How are we feeling about AI?",
    description:
      "Take the monthly AI poll: three stable questions tracking how sentiment moves over time.",
    siteName: "Vibe Check",
    type: "website",
    url: "/pulse",
    images: [
      {
        url: "/ai-poll-card.png",
        width: 1200,
        height: 630,
        alt: "Vibe Check monthly AI poll — how are we feeling about AI?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How are we feeling about AI?",
    description:
      "Three stable questions, once a month. See where people land and how the answers move over time.",
    images: ["/ai-poll-card.png"],
  },
};

export default function PulsePage() {
  return <PulseLanding />;
}
