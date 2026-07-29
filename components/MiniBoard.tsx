"use client";

import Link from "next/link";
import type { Topic } from "@/lib/topics";

/**
 * A pocket-sized version of the dial used as a nav tile. If the board has
 * votes, the needle sits at its current average, so the whole collection reads
 * at a glance.
 */

const W = 120;
const H = 78;
const CX = W / 2;
const CY = 66;
const R_SCALLOP = 54;
const R_RIM = 48;
const R_FACE = 40;
const BUMPS = 11;

function scalloped(radius: number, base: number): string {
  const pts: [number, number][] = [];
  for (let i = 0; i <= BUMPS; i += 1) {
    const a = Math.PI - (i / BUMPS) * Math.PI;
    pts.push([CX + radius * Math.cos(a), CY - radius * Math.sin(a)]);
  }
  const chord = 2 * radius * Math.sin(Math.PI / (2 * BUMPS));
  const r = chord * 0.62;
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += ` A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  }
  return `${d} L ${CX + radius} ${CY + base} L ${CX - radius} ${CY + base} Z`;
}

function dome(radius: number, base: number): string {
  return `M ${CX - radius} ${CY} A ${radius} ${radius} 0 0 1 ${CX + radius} ${CY} L ${CX + radius} ${CY + base} L ${CX - radius} ${CY + base} Z`;
}

interface MiniBoardProps {
  topic: Topic;
  active: boolean;
  /** The board's current average, 0..1, or null if nobody has answered. */
  mean: number | null;
  count: number;
}

export default function MiniBoard({ topic, active, mean, count }: MiniBoardProps) {
  return (
    <Link
      href={`/${topic.id}`}
      className={`mini ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <path d={scalloped(R_SCALLOP, 12)} className="mini-scallop" />
        <path d={dome(R_RIM, 12)} className="mini-body" />
        <path d={dome(R_FACE, 0)} className="mini-face" />
        {mean !== null && (
          <g
            className="mini-needle"
            style={{ transform: `rotate(${mean * 180 - 90}deg)`, transformOrigin: `${CX}px ${CY}px` }}
          >
            <line x1={CX} y1={CY} x2={CX} y2={CY - (R_FACE - 8)} strokeWidth="3.5" strokeLinecap="round" />
          </g>
        )}
        <circle cx={CX} cy={CY} r="7" className="mini-hub" />
      </svg>
      <span className="mini-subject">{topic.subject}</span>
      <span className="mini-axis">{topic.axis}</span>
      <span className="mini-stat">
        {count > 0 ? `${Math.round(mean! * 100)}% · ${count}` : "no answers yet"}
      </span>
    </Link>
  );
}
