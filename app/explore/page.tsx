import type { Metadata } from "next";
import ExploreHub from "@/components/ExploreHub";

export const metadata: Metadata = {
  title: "Vibe Check — explore",
  description: "Explore the main question set, community boards, or make your own.",
};

export default function ExplorePage() {
  return <ExploreHub />;
}
