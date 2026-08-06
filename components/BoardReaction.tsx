"use client";

import { useEffect, useState } from "react";
import { getSessionId } from "@/lib/session";
import {
  readBoardReaction,
  recordBoardReaction,
  type MyBoardReaction,
} from "@/lib/reaction";

export default function BoardReaction({ slug }: { slug: string }) {
  const [choice, setChoice] = useState<MyBoardReaction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setChoice(readBoardReaction(slug));
  }, [slug]);

  async function react(next: MyBoardReaction) {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          action: "react",
          choice: next,
          session: getSessionId(),
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      recordBoardReaction(slug, next);
      setChoice(next);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="board-reaction" aria-labelledby="board-reaction-title">
      <p id="board-reaction-title">Should we show more questions like this?</p>
      <div>
        <button
          type="button"
          aria-pressed={choice === "like"}
          disabled={pending}
          onClick={() => react("like")}
        >
          More like this
        </button>
        <button
          type="button"
          aria-pressed={choice === "dislike"}
          disabled={pending}
          onClick={() => react("dislike")}
        >
          Not for me
        </button>
      </div>
      <small>
        {error
          ? "That didn’t save. Try again."
          : choice
            ? "Saved privately — you can change it."
            : "Private feedback for what appears in community discovery."}
      </small>
    </section>
  );
}
