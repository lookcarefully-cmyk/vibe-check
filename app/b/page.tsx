import type { Metadata } from "next";
import CommunityLibrary from "@/components/CommunityLibrary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vibe Check — community boards",
  description: "Explore community boards or make one of your own.",
};

export default function CommunityLibraryPage() {
  return <CommunityLibrary />;
}
