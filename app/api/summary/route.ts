import { NextResponse } from "next/server";
import { aggregate } from "@/lib/aggregate";
import { store } from "@/lib/store";
import { TOPICS } from "@/lib/topics";

// Feeds the nav tiles, which show each board's average once the viewer has
// answered that board.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface TopicSummary {
  id: string;
  count: number;
  mean: number;
}

export async function GET() {
  try {
    const summaries: TopicSummary[] = await Promise.all(
      TOPICS.map(async (topic) => {
        const records = await store.all(topic.id);
        const { count, mean } = aggregate(records.map((r) => r.v));
        return { id: topic.id, count, mean };
      }),
    );
    return NextResponse.json(summaries, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[summary] failed", err);
    return NextResponse.json({ error: "Could not read votes." }, { status: 500 });
  }
}
