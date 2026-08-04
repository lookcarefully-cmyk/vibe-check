import type { Metadata } from "next";
import CommunityLibrary from "@/components/CommunityLibrary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vibe Check — boards people made",
  description: "Boards made by visitors. Answer one, or make your own.",
};

export default function CommunityLibraryPage() {
  return <CommunityLibrary />;
}
