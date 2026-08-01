"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Aggregate } from "@/lib/aggregate";
import type { Topic } from "@/lib/topics";
import { buildRays, RAY_COUNT } from "@/lib/rays";
import {
  CX,
  CY,
  R_BRACKET,
  R_BRACKET_LABEL,
  R_FACE,
  R_HUB,
  R_RAY_MAX,
  R_RIM,
  R_SCALLOP,
  VIEW,
  dome,
  polar,
  rotationOf,
  scallopedDome,
  seededRandom,
} from "@/lib/geometry";

const BASE = 122; // how far the dial body extends below the hub line
const SCALLOPS = 24;
const TRACK_Y = CY + 74; // below the hub, so the handle is never occluded by it
const HALF_RAY = (1 / (RAY_COUNT - 1)) * 0.36; // angular half-width, in value units

export type Phase = "choose" | "result";

interface DialProps {
  phase: Phase;
  /** The viewer's own pick, 0..1. */
  pick: number;
  agg: Aggregate;
  topic: Topic;
  onPick: (value: number) => void;
  onCommit: (value: number) => void;
  interactive: boolean;
}

/** Stars are baked once from a fixed seed so SSR and hydration agree. */
const STARS = (() => {
  const rand = seededRandom(20260729);
  return Array.from({ length: 190 }, () => ({
    x: rand() * VIEW.w,
    y: rand() * VIEW.h,
    r: 1 + rand() * 2.1,
    o: 0.25 + rand() * 0.6,
    delay: rand() * 6,
  }));
})();

function arcBetween(from: number, to: number, radius: number): string {
  const [x1, y1] = polar(from, radius);
  const [x2, y2] = polar(to, radius);
  const large = Math.abs(to - from) > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
}

function rayPoints(value: number, radius: number): string {
  const [ix, iy] = polar(value, R_HUB + 2);
  const [lx, ly] = polar(Math.min(1.02, value + HALF_RAY), radius);
  const [rx, ry] = polar(Math.max(-0.02, value - HALF_RAY), radius);
  return `${ix},${iy} ${lx},${ly} ${rx},${ry}`;
}

/**
 * On a phone the whole dial is ~340px wide, so type set in viewBox units comes
 * out microscopic. Scale in-SVG text up when the viewport is narrow. Starts
 * false so the server and the first client render agree.
 */
function useTypeScale(): number {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact ? 1.45 : 1;
}

export default function Dial({
  phase,
  pick,
  agg,
  topic,
  onPick,
  onCommit,
  interactive,
}: DialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rays = useMemo(() => buildRays(agg), [agg]);
  const t = useTypeScale();
  // --te is gentler than --t: the endpoint labels sit on a fixed-width baseline
  // and would run into the hub if they grew as much as the rest of the type.
  const typeScaleVars = { "--t": t, "--te": 1 + (t - 1) * 0.45 } as React.CSSProperties;

  const isResult = phase === "result";
  const needleValue = isResult ? agg.mean : pick;

  // Where the marker line should land: the tip of the tallest (mean) ray.
  const markerRadius = rays.length
    ? rays.reduce((best, r) => (r.density > best.density ? r : best), rays[0]).radius
    : R_FACE * 0.7;
  const [markerX, markerY] = polar(agg.mean, markerRadius);
  // Chip geometry is derived from the label so it never clips at any type scale.
  const chipLabel = `AVERAGE ${Math.round(agg.mean * 100)}%`;
  const chipFont = 23 * t;
  const chipW = chipLabel.length * chipFont * 0.78 + 46;
  const chipH = chipFont * 2.2;
  const chipTop = 20;
  const chipX = Math.min(VIEW.w - chipW / 2 - 10, Math.max(chipW / 2 + 10, markerX));

  /** Pointer x -> value, using the horizontal track across the dial face. */
  function valueFromEvent(e: React.PointerEvent<SVGSVGElement>): number {
    const svg = svgRef.current;
    if (!svg) return pick;
    const box = svg.getBoundingClientRect();
    const userX = ((e.clientX - box.left) / box.width) * VIEW.w;
    return Math.min(1, Math.max(0, (userX - (CX - R_FACE)) / (2 * R_FACE)));
  }

  const handleX = CX - R_FACE + pick * 2 * R_FACE;
  const [aimX, aimY] = polar(pick, R_FACE - 10);

  return (
    <svg
      ref={svgRef}
      className={`dial ${isResult ? "is-result" : "is-choose"}`}
      style={typeScaleVars}
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="xMidYMid meet"
      role={interactive ? "slider" : "img"}
      aria-label={
        interactive
          ? `${topic.question} Click along the spectrum to answer, where 0 percent is ${topic.leftLabel.toLowerCase()} and 100 percent is ${topic.rightLabel.toLowerCase()}.`
          : `Average answer: ${Math.round(agg.mean * 100)} percent toward ${topic.rightLabel.toLowerCase()}, from ${agg.count} responses.`
      }
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 100 : undefined}
      aria-valuenow={interactive ? Math.round(pick * 100) : undefined}
      aria-valuetext={
        // Screen-reader users get a number for their own handle position —
        // there is no other way to convey it. It is their own pick, never the
        // crowd's average, so it carries no anchor.
        interactive
          ? `${Math.round(pick * 100)} percent toward ${topic.rightLabel.toLowerCase()}`
          : undefined
      }
      tabIndex={interactive ? 0 : -1}
      onPointerMove={interactive ? (e) => onPick(valueFromEvent(e)) : undefined}
      onPointerDown={
        interactive
          ? (e) => {
              e.preventDefault();
              onCommit(valueFromEvent(e));
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              const stepKeys: Record<string, number> = {
                ArrowLeft: -0.02,
                ArrowRight: 0.02,
                ArrowDown: -0.02,
                ArrowUp: 0.02,
                PageDown: -0.1,
                PageUp: 0.1,
              };
              if (e.key in stepKeys) {
                e.preventDefault();
                onPick(Math.min(1, Math.max(0, pick + stepKeys[e.key])));
              } else if (e.key === "Home") {
                e.preventDefault();
                onPick(0);
              } else if (e.key === "End") {
                e.preventDefault();
                onPick(1);
              } else if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCommit(pick);
              }
            }
          : undefined
      }
    >
      <defs>
        <clipPath id="faceClip">
          <path d={dome(R_FACE, 0)} />
        </clipPath>
        <clipPath id="bodyClip">
          <path d={dome(R_RIM, BASE)} />
        </clipPath>
        <radialGradient id="faceGlow" cx="50%" cy="100%" r="86%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.16" />
          </feComponentTransfer>
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
      </defs>

      {/* ---------------------------------------------------- starfield */}
      <g className="stars" aria-hidden="true">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#ffffff"
            opacity={s.o}
            style={{ animationDelay: `${s.delay}s` }}
          />
        ))}
      </g>

      {/* ------------------------------------------- scalloped white border */}
      <path className="scallop" d={scallopedDome(R_SCALLOP, SCALLOPS, BASE)} fill="#FBF7EE" />

      {/* ------------------------------------------------- navy dial body */}
      <path d={dome(R_RIM, BASE)} fill="#101A4A" />
      <path d={dome(R_RIM, BASE)} fill="#101A4A" filter="url(#grain)" opacity="0.9" />

      {/* stars inside the navy rim, for the speckled look of the reference */}
      <g className="rim-stars" clipPath="url(#bodyClip)" aria-hidden="true">
        {STARS.slice(0, 110).map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.7} fill="#ffffff" opacity={s.o * 0.7} />
        ))}
      </g>

      {/* ------------------------------------------------------ dial face */}
      <path className="face" d={dome(R_FACE, 0)} />
      <path d={dome(R_FACE, 0)} fill="url(#faceGlow)" opacity="0.5" />

      {/* --------------------------------------------------------- rays */}
      <g clipPath="url(#faceClip)">
        <g className="rays">
          {isResult &&
            rays.map((ray) => (
              <polygon
                key={ray.value.toFixed(4)}
                className="ray"
                points={rayPoints(ray.value, ray.radius)}
                fill={ray.color}
                opacity={0.55 + ray.density * 0.45}
                style={{ animationDelay: `${120 + ray.distanceFromCentre * 45}ms` }}
              />
            ))}
        </g>

        {/* the viewer's own answer, kept visible next to the crowd's */}
        <line
          className="aim"
          x1={CX}
          y1={CY}
          x2={aimX}
          y2={aimY}
          stroke="#5FD3D4"
          strokeWidth={isResult ? 6 : 9}
          strokeLinecap="round"
          opacity={isResult ? 0.5 : 0.95}
        />
      </g>

      {/* -------------------------------------------- 80% margin bracket */}
      {isResult && agg.count > 1 && (
        <g className="margin">
          <path
            d={arcBetween(agg.p10, agg.p90, R_BRACKET)}
            fill="none"
            stroke="#101A4A"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.7"
          />
          {[agg.p10, agg.p90].map((v, i) => {
            const [x1, y1] = polar(v, R_BRACKET - 22);
            const [x2, y2] = polar(v, R_BRACKET + 22);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#101A4A" strokeWidth="4" strokeLinecap="round" opacity="0.7" />;
          })}
          {/*
            The ends carry the numbers, in the same units as everything else on
            the dial. Two reasons not to put a single label at the midpoint:
            the midpoint is always about where the average marker already sits,
            and quoting the crowd proportion there ("80%") put a share-of-people
            number beside a position-on-the-spectrum number and invited readers
            to compare them.
          */}
          {/*
            Set inboard of the ticks rather than outboard: a band that reaches
            either extreme would otherwise push its label into the endpoint
            labels sitting along the baseline.
          */}
          {(() => {
            const inset = Math.min(0.04, (agg.p90 - agg.p10) / 3);
            return [
              { v: agg.p10, at: agg.p10 + inset },
              { v: agg.p90, at: agg.p90 - inset },
            ];
          })().map(({ v, at }, i) => {
            const [tx, ty] = polar(at, R_BRACKET_LABEL);
            return (
              <text
                key={i}
                className="margin-label"
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                paintOrder="stroke"
              >
                {Math.round(v * 100)}
              </text>
            );
          })}
        </g>
      )}

      {/* ---------------------------------------- consensus marker + chip */}
      {isResult && (
        <g className="marker">
          {/* red reads against both the navy sky and the cream face */}
          <line
            x1={chipX}
            y1={chipTop + chipH}
            x2={markerX}
            y2={markerY - 6}
            stroke="#E51D35"
            strokeWidth="3"
            strokeDasharray="10 9"
            opacity="0.85"
          />
          <circle cx={markerX} cy={markerY - 6} r="8" fill="#E51D35" stroke="#FBF7EE" strokeWidth="3" />
          <rect x={chipX - chipW / 2} y={chipTop} width={chipW} height={chipH} rx={chipH / 2} fill="#E51D35" />
          <text
            className="chip-text"
            x={chipX}
            y={chipTop + chipH * 0.68}
            textAnchor="middle"
            style={{ fontSize: chipFont }}
          >
            {chipLabel}
          </text>
        </g>
      )}

      {/*
        No number is drawn while choosing, deliberately. Showing a running
        percentage turns a felt judgement into a number-picking task and anchors
        people to the 50% the dial starts at. Position is conveyed by the aim
        line and the handle; the arithmetic only appears once an answer is in.
      */}

      {/* ----------------------------------------------- notches + ends */}
      <circle cx={CX - R_FACE} cy={CY} r="13" className="notch" />
      <circle cx={CX + R_FACE} cy={CY} r="13" className="notch" />

      {/*
        These sit in the navy band below the baseline, not on the face. On the
        face they collided with the ray fan, and with the bracket labels
        whenever a band ran out to either extreme.

        Neither end is styled as the "bad" one. Orientation now varies per board
        (see lib/topics.ts) — NOT ADDICTIVE sits on the left of the addictive
        boards while HARMFUL sits on the left of the harm boards — so colouring
        the left label as alarming would be wrong half the time.
      */}
      <text className="end-label" x={CX - R_FACE + 6} y={CY + 38}>
        {topic.leftLabel}
      </text>
      <text className="end-label" x={CX + R_FACE - 6} y={CY + 38} textAnchor="end">
        {topic.rightLabel}
      </text>

      {/* ------------------------------------------------ track + handle */}
      <g className={`slider ${isResult ? "muted" : ""}`}>
        <line
          x1={CX - R_FACE}
          y1={TRACK_Y}
          x2={CX + R_FACE}
          y2={TRACK_Y}
          stroke="#5FD3D4"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.45"
        />
        {/* rod: a horizontal arm anchored under the hub, sliding to the handle */}
        <line
          className="rod"
          x1={CX}
          y1={TRACK_Y}
          x2={handleX}
          y2={TRACK_Y}
          stroke="#5FD3D4"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* stem tying the rod back to the hub */}
        <line x1={CX} y1={CY} x2={CX} y2={TRACK_Y} stroke="#5FD3D4" strokeWidth="14" strokeLinecap="round" />
        <circle className="handle" cx={handleX} cy={TRACK_Y} r="24" fill="#7FE3E4" stroke="#0A1238" strokeWidth="5" />
      </g>

      {/* ---------------------------------------------- needle + red hub */}
      <g
        className="needle"
        style={{ transform: `rotate(${rotationOf(needleValue)}deg)` }}
        opacity={isResult ? 1 : 0}
      >
        <line x1={CX} y1={CY} x2={CX} y2={CY - (R_RAY_MAX + 14)} stroke="#E51D35" strokeWidth="11" strokeLinecap="round" />
      </g>
      <circle cx={CX} cy={CY} r={R_HUB} fill="#E51D35" />
      <circle cx={CX} cy={CY} r={R_HUB - 12} fill="none" stroke="#C4142A" strokeWidth="3" opacity="0.85" />
    </svg>
  );
}
