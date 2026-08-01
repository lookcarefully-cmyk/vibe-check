"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readRunState, nextHref } from "@/lib/run";

/**
 * The entry point. Assigns an experiment arm on first visit (see
 * lib/experiment.ts) and sends the visitor to the right first board.
 *
 * Client-side because the arm lives in localStorage — the server has no way to
 * know which arm this browser belongs to, and assigning one server-side would
 * either need a cookie or would reassign on every request.
 */
export default function Start() {
  const router = useRouter();

  useEffect(() => {
    const state = readRunState();
    router.replace(state.complete ? "/results" : nextHref(state));
  }, [router]);

  return (
    <main className="shell">
      <p className="lede">Starting…</p>
    </main>
  );
}
