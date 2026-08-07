import type { Metadata } from "next";
import PulseLanding from "@/components/PulseLanding";

export const metadata: Metadata = {
  title: "Vibe Check — monthly AI Pulse",
  description:
    "Three monthly questions on AI alignment, humanity's future, and the pace of development.",
};

export default function PulsePage() {
  return <PulseLanding />;
}
