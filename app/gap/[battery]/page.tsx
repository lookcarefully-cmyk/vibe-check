import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GapLanding from "@/components/GapLanding";
import { GAP_BATTERIES, getBattery } from "@/lib/experiment";

type Params = { params: Promise<{ battery: string }> };

export function generateStaticParams() {
  return GAP_BATTERIES.map((b) => ({ battery: b.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const battery = getBattery((await params).battery);
  if (!battery) return {};
  return {
    title: `${battery.title} — Vibe Check`,
    description: battery.blurb,
    openGraph: {
      title: battery.title,
      description: battery.hook,
      siteName: "Vibe Check",
      type: "website",
      url: `/gap/${battery.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: battery.title,
      description: battery.hook,
    },
  };
}

export default async function GapBatteryPage({ params }: Params) {
  const { battery } = await params;
  if (!getBattery(battery)) notFound();
  return <GapLanding batteryId={battery} />;
}
