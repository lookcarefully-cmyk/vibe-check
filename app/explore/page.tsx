import type { Metadata } from "next";
import ExploreHub from "@/components/ExploreHub";

export const metadata: Metadata = {
  title: "Vibe Check — explore",
  description: "Explore the Main Set, more Vibe Check questions, community boards, or make your own.",
};

export default function ExplorePage() {
  return <ExploreHub />;
}
