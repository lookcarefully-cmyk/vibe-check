import type { Metadata } from "next";
import RunResults from "@/components/RunResults";

export const metadata: Metadata = {
  title: "Vibe Check — your results",
  description: "Where you landed against everyone else.",
};

export default function ResultsPage() {
  return <RunResults />;
}
