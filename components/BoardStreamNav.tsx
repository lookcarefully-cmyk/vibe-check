"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { EXTRA_TOPICS } from "@/lib/experiment";
import { boardStreamStep, type BoardStreamStep } from "@/lib/board-stream";

interface BoardStreamNavProps {
  currentId: string;
  answered: boolean;
}

export default function BoardStreamNav({
  currentId,
  answered,
}: BoardStreamNavProps) {
  const router = useRouter();
  const [step, setStep] = useState<BoardStreamStep | null>(null);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const continueStream = new URLSearchParams(window.location.search).get("stream")
      === "continue";
    const nextStep = boardStreamStep(currentId, EXTRA_TOPICS, continueStream);
    setStep(nextStep);
    movingRef.current = false;
    setMoving(false);
    if (nextStep) router.prefetch(`/${nextStep.next.id}?stream=continue`);
  }, [currentId, router]);

  const goNext = () => {
    if (!step || movingRef.current) return;
    movingRef.current = true;
    setMoving(true);
    router.push(`/${step.next.id}?stream=continue`);
  };

  const onTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const onTouchEnd = (event: TouchEvent<HTMLButtonElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const swipedLeft = dx < -52 && Math.abs(dx) > Math.abs(dy);
    const swipedUp = dy < -52 && Math.abs(dy) > Math.abs(dx);
    if (swipedLeft || swipedUp) goNext();
  };

  if (!step) return null;

  return (
    <nav className={`board-stream${answered ? " is-answered" : ""}`} aria-label="Question navigation">
      <Link href="/boards" className="board-stream-all">
        All boards
      </Link>
      <button
        type="button"
        className="board-stream-next"
        onClick={goNext}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        disabled={moving}
        aria-label={answered ? "Go to the next question" : "Skip to the next question"}
      >
        <span className="board-stream-action">
          {moving ? "Loading…" : answered ? "Next question" : "Skip"}
        </span>
        <span className="board-stream-arrow" aria-hidden="true">→</span>
        <span className="board-stream-gesture" aria-hidden="true">
          Swipe up or left
        </span>
      </button>
    </nav>
  );
}
