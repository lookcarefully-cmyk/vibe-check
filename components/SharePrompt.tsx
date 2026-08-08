"use client";

import { useEffect, useRef, useState } from "react";

interface SharePromptProps {
  question: string;
  path: string;
}

function shareOrigin(): string {
  return "https://www.vibecheckdata.xyz";
}

/**
 * The share stays deliberately blind: question + link, never the visitor's
 * answer or the crowd result. A recipient therefore arrives at an uncontaminated
 * dial even when the sender shares immediately after seeing the reveal.
 */
export default function SharePrompt({ question, path }: SharePromptProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = `${shareOrigin()}${path}`;
  const text = question;
  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const briefly = (next: "copied" | "failed") => {
    setStatus(next);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 2_500);
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: question, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      briefly("copied");
    } catch (error) {
      // Closing the native share sheet is not an error the visitor needs to see.
      if (error instanceof DOMException && error.name === "AbortError") return;
      briefly("failed");
    }
  };

  return (
    <section className="share-prompt" aria-label="Share this question">
      <div>
        <p className="share-kicker">Keep the board moving</p>
        <h3>Who else should answer this?</h3>
        <p>They&rsquo;ll get a blank dial. Your answer and the crowd result stay hidden.</p>
      </div>
      <div className="share-actions">
        <button
          type="button"
          className="lock-in"
          aria-live="polite"
          onClick={() => void share()}
        >
          {status === "copied"
            ? "Link copied!"
            : status === "failed"
              ? "Couldn’t copy"
              : "Share"}
        </button>
        <a className="reset share-x" href={xUrl} target="_blank" rel="noopener noreferrer">
          Post on X
        </a>
      </div>
    </section>
  );
}
