import { getCommunityBoard, toTopic } from "@/lib/boards";
import { boardShareCard } from "@/lib/share-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Vibe Check community question";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CommunityBoardCard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const board = await getCommunityBoard((await params).slug);
  return boardShareCard(board ? toTopic(board) : null);
}
