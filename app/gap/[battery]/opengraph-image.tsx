import { getBattery } from "@/lib/experiment";
import { GAP_SHARE_SIZE, gapShareCard } from "@/lib/gap-share-card";

export const runtime = "nodejs";
export const alt = "Vibe Check real-figure quiz";
export const size = GAP_SHARE_SIZE;
export const contentType = "image/png";

export default async function BatteryCard({
  params,
}: {
  params: Promise<{ battery: string }>;
}) {
  return gapShareCard(getBattery((await params).battery));
}
