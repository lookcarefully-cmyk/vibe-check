import { NextResponse } from "next/server";
import { getLiveSnapshot, publicResult } from "@/lib/live-results";
import { getTopic } from "@/lib/topics";

// Feeds the nav tiles, which show each board's average once the viewer has
// answered that board.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface TopicSummary {
  id: string;
  count: number;
  mean: number;
}

export async function GET(req: Request) {
  try {
    // A first-time browser has no revealed tiles and requests nothing. Returning
    // browsers ask only for boards they may legally see, instead of making one
    // browse page pull every vote list in the catalogue.
    const requested = (new URL(req.url).searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 50);
    const topics = requested
      .map(getTopic)
      .filter((topic): topic is NonNullable<typeof topic> => topic !== undefined);
    const summaries: TopicSummary[] = await Promise.all(
      topics.map(async (topic) => {
        const { count, mean } = publicResult(await getLiveSnapshot(topic.id));
        return { id: topic.id, count, mean };
      }),
    );
    return NextResponse.json(summaries, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("[summary] failed", err);
    return NextResponse.json({ error: "Could not read votes." }, { status: 500 });
  }
}
