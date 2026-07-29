import { NextResponse } from "next/server";
import { aggregate } from "@/lib/aggregate";
import { store } from "@/lib/store";
import { getTopic } from "@/lib/topics";

// Votes are mutable state; never let a CDN or the build step freeze this.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ topic: string }> };

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const topic = getTopic((await params).topic);
  if (!topic) return noStore({ error: "Unknown topic." }, 404);

  try {
    return noStore(aggregate(await store.all(topic.id)));
  } catch (err) {
    console.error("[votes] GET failed", err);
    return noStore({ error: "Could not read votes." }, 500);
  }
}

export async function POST(req: Request, { params }: Params) {
  const topic = getTopic((await params).topic);
  if (!topic) return noStore({ error: "Unknown topic." }, 404);

  let value: unknown;
  try {
    ({ value } = (await req.json()) as { value?: unknown });
  } catch {
    return noStore({ error: "Body must be JSON." }, 400);
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    return noStore({ error: "`value` must be a number between 0 and 1." }, 400);
  }

  try {
    // Round to the nearest 0.1% — plenty of resolution, and it keeps the
    // stored payload small.
    await store.push(topic.id, Math.round(value * 1000) / 1000);
    return noStore(aggregate(await store.all(topic.id)));
  } catch (err) {
    console.error("[votes] POST failed", err);
    return noStore({ error: "Could not record your vote." }, 500);
  }
}
