"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  const buttonSwipeStart = useRef<{
    x: number;
    y: number;
    pointerId: number;
  } | null>(null);
  const pageSwipeStart = useRef<{
    x: number;
    y: number;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    const continueStream = new URLSearchParams(window.location.search).get("stream")
      === "continue";
    const nextStep = boardStreamStep(currentId, EXTRA_TOPICS, continueStream);
    setStep(nextStep);
    movingRef.current = false;
    setMoving(false);
    if (nextStep?.next) router.prefetch(`/${nextStep.next.id}?stream=continue`);
  }, [currentId, router]);

  const goNext = useCallback(() => {
    if (!step?.next || movingRef.current) return;
    movingRef.current = true;
    setMoving(true);
    router.push(`/${step.next.id}?stream=continue`);
  }, [router, step]);

  /*
   * On a phone, a left swipe on the non-interactive page background advances
   * the stream. The dial, links, buttons and form controls are excluded so a
   * fine adjustment or ordinary tap can never throw someone onto a new board.
   * Vertical page movement remains normal scrolling; only a clearly horizontal
   * gesture counts here.
   */
  useEffect(() => {
    if (!step?.next) return;
    const shell = document.querySelector<HTMLElement>("main.shell");
    if (!shell) return;

    const isInteractive = (target: EventTarget | null) =>
      target instanceof Element
      && target.closest(
        "a, button, input, textarea, select, dialog, .dial, [role='slider']",
      ) !== null;

    const onPointerDown = (event: PointerEvent) => {
      if (
        !event.isPrimary
        || !window.matchMedia("(max-width: 640px)").matches
      ) {
        pageSwipeStart.current = null;
        buttonSwipeStart.current = null;
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".board-stream-next")) {
        buttonSwipeStart.current = {
          x: event.clientX,
          y: event.clientY,
          pointerId: event.pointerId,
        };
        pageSwipeStart.current = null;
        return;
      }

      buttonSwipeStart.current = null;
      if (isInteractive(event.target)) {
        pageSwipeStart.current = null;
        return;
      }
      pageSwipeStart.current = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      const buttonStart = buttonSwipeStart.current;
      buttonSwipeStart.current = null;
      if (buttonStart && buttonStart.pointerId === event.pointerId) {
        const dx = event.clientX - buttonStart.x;
        const dy = event.clientY - buttonStart.y;
        const swipedLeft = dx < -52 && Math.abs(dx) > Math.abs(dy);
        const swipedUp = dy < -52 && Math.abs(dy) > Math.abs(dx);
        if (swipedLeft || swipedUp) goNext();
        pageSwipeStart.current = null;
        return;
      }

      const start = pageSwipeStart.current;
      pageSwipeStart.current = null;
      if (!start || start.pointerId !== event.pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (dx < -70 && Math.abs(dx) > Math.abs(dy) * 1.2) goNext();
    };

    const clearPointer = () => {
      pageSwipeStart.current = null;
      buttonSwipeStart.current = null;
    };

    shell.addEventListener("pointerdown", onPointerDown);
    shell.addEventListener("pointerup", onPointerUp);
    shell.addEventListener("pointercancel", clearPointer);
    return () => {
      shell.removeEventListener("pointerdown", onPointerDown);
      shell.removeEventListener("pointerup", onPointerUp);
      shell.removeEventListener("pointercancel", clearPointer);
    };
  }, [goNext, step?.next]);

  if (!step) return null;

  return (
    <nav
      className={`board-stream${answered ? " is-answered" : ""}${step.complete ? " is-complete" : ""}`}
      aria-label="Question navigation"
    >
      <Link href="/boards" className="board-stream-all">
        All boards
      </Link>
      {step.complete ? (
        <div className="board-stream-finished" role="status">
          <span>That&rsquo;s every board</span>
          <small>{step.position} of {step.total} seen</small>
        </div>
      ) : (
        <button
          type="button"
          className="board-stream-next"
          onClick={goNext}
          disabled={moving}
          aria-label={answered ? "Go to the next question" : "Skip to the next question"}
        >
          <span className="board-stream-action">
            <span>{moving ? "Loading…" : answered ? "Next question" : "Skip"}</span>
            <small className="board-stream-meta">
              {step.position} of {step.total}
              <span className="board-stream-gesture"> · swipe left, or up here</span>
            </small>
          </span>
          <span className="board-stream-arrow" aria-hidden="true">→</span>
        </button>
      )}
    </nav>
  );
}
