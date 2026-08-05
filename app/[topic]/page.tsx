import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VibeCheck from "@/components/VibeCheck";
import { TOPICS, getTopic } from "@/lib/topics";

// This page is only the shell — every vote number is fetched on the client
// from /api/votes/[topic], which is itself force-dynamic. So prerendering the
// four boards is safe and there is nothing here that can go stale.

type Params = { params: Promise<{ topic: string }> };

export function generateStaticParams() {
  return TOPICS.filter((t) => !t.retiredFromSite).map((t) => ({ topic: t.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const topic = getTopic((await params).topic);
  if (!topic) return {};
  return {
    title: `Vibe Check — ${topic.question}`,
    description: "A live consensus dial. Answer on the spectrum, then see the crowd's distribution.",
  };
}

export default async function TopicPage({ params }: Params) {
  const topic = getTopic((await params).topic);
  if (!topic) notFound();
  return <VibeCheck topic={topic} />;
}
