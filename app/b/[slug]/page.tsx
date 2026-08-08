import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VibeCheck from "@/components/VibeCheck";
import { getCommunityBoard, toTopic } from "@/lib/boards";

// Community boards are created at runtime, so nothing here can be prerendered.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = (await params).slug;
  const board = await getCommunityBoard(slug);
  if (!board) return { title: "Vibe Check — board not found" };
  return {
    title: `Vibe Check — ${board.question}`,
    description: "Someone made this board. Place your answer, then see how everyone else answered.",
    openGraph: {
      title: board.question,
      description: "Answer on the spectrum, then see how everyone else answered.",
      siteName: "Vibe Check",
      type: "website",
      url: `/b/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: board.question,
      description: "Answer on the spectrum, then see how everyone else answered.",
    },
    // Unlisted boards are shared by link, and a link that gets indexed isn't
    // unlisted any more. The share preview still works; only crawlers are told
    // to stay out.
    robots: board.listed ? undefined : { index: false, follow: false },
  };
}

export default async function CommunityBoardPage({ params }: Params) {
  const board = await getCommunityBoard((await params).slug);
  if (!board) notFound();
  return <VibeCheck topic={toTopic(board)} community standalone={!board.listed} />;
}
