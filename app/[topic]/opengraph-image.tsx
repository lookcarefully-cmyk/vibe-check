import { getTopic } from "@/lib/topics";
import { boardShareCard } from "@/lib/share-card";

export const runtime = "nodejs";
export const alt = "Vibe Check question";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function BoardCard({ params }: { params: Promise<{ topic: string }> }) {
  return boardShareCard(getTopic((await params).topic) ?? null);
}
