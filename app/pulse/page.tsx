import type { Metadata } from "next";
import PulseLanding from "@/components/PulseLanding";

export const metadata: Metadata = {
  title: "Vibe Check — monthly AI Pulse",
  description:
    "Three monthly questions on AI alignment, humanity's future, and the pace of development.",
  openGraph: {
    title: "How are we feeling about AI?",
    description:
      "Take the monthly AI Pulse: three stable questions tracking how sentiment moves over time.",
    siteName: "Vibe Check",
    type: "website",
    url: "/pulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "How are we feeling about AI?",
    description:
      "Three stable questions, once a month. See where people land and how the answers move over time.",
  },
};

export default function PulsePage() {
  return <PulseLanding />;
}
