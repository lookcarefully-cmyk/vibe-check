import type { Metadata } from "next";
import CommunityLibrary from "@/components/CommunityLibrary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vibe Check — more boards",
  description: "Explore more Vibe Check questions and boards made by visitors.",
};

export default function CommunityLibraryPage() {
  return <CommunityLibrary />;
}
