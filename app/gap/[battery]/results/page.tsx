import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GapResults from "@/components/GapResults";
import { GAP_BATTERIES, getBattery } from "@/lib/experiment";

type Params = { params: Promise<{ battery: string }> };

export function generateStaticParams() {
  return GAP_BATTERIES.map((b) => ({ battery: b.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const battery = getBattery((await params).battery);
  if (!battery) return {};
  return {
    title: `Your score — ${battery.title}`,
    description: "How close your guesses came to the real national figures, question by question.",
    // Not indexed: one visitor's own score. A shared link points at the blank
    // quiz (/gap/<battery>), never at an empty scoreboard.
    robots: { index: false, follow: true },
    openGraph: {
      title: battery.title,
      description: battery.hook,
      siteName: "Vibe Check",
      type: "website",
      url: `/gap/${battery.id}`,
    },
  };
}

export default async function GapBatteryResultsPage({ params }: Params) {
  const { battery } = await params;
  if (!getBattery(battery)) notFound();
  return <GapResults batteryId={battery} />;
}
