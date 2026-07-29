/**
 * Shared dial geometry. Everything is expressed in the SVG's user-space units
 * (the viewBox below), so the whole thing scales responsively for free.
 */

export const VIEW = { w: 1000, h: 636 };

/** Hub: the red circle at bottom-centre. Origin for the needle and every ray. */
export const CX = 500;
export const CY = 500;

export const R_SCALLOP = 478; // outer edge of the white zigzag border
export const R_RIM = 442; // outer edge of the navy rim
export const R_FACE = 398; // the light dial face
export const R_HUB = 46;

/**
 * Rays never start at zero length or they look like specks near the hub, and
 * they stop short of the rim to leave a clean band for the margin bracket.
 */
export const R_RAY_MIN = 92;
export const R_RAY_MAX = R_FACE - 96;

/** Radii for the 80%-margin bracket and its label, outside the ray field. */
export const R_BRACKET = R_FACE - 40;
export const R_BRACKET_LABEL = R_BRACKET;

/** Value (0..1) -> angle in radians, measured maths-style (0 = east). */
export function angleOf(value: number): number {
  return Math.PI - value * Math.PI;
}

/** Value (0..1) -> SVG rotation in degrees for something drawn pointing up. */
export function rotationOf(value: number): number {
  return value * 180 - 90;
}

/** Polar -> cartesian in SVG space (y grows downward). */
export function polar(value: number, radius: number): [number, number] {
  const a = angleOf(value);
  return [CX + radius * Math.cos(a), CY - radius * Math.sin(a)];
}

/**
 * A closed path tracing the dome with `bumps` outward semicircular scallops,
 * then squared off along the bottom.
 */
export function scallopedDome(radius: number, bumps: number, base: number): string {
  const pts: [number, number][] = [];
  for (let i = 0; i <= bumps; i += 1) {
    const a = Math.PI - (i / bumps) * Math.PI;
    pts.push([CX + radius * Math.cos(a), CY - radius * Math.sin(a)]);
  }
  // Bump radius must exceed half the chord or the arc is unsatisfiable.
  const chord = 2 * radius * Math.sin(Math.PI / (2 * bumps));
  const r = chord * 0.62;

  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i += 1) {
    // sweep-flag 1: clockwise on screen == bulging away from the centre.
    d += ` A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  }
  d += ` L ${CX + radius} ${CY + base} L ${CX - radius} ${CY + base} Z`;
  return d;
}

/** A plain semicircular dome squared off `base` units below the hub line. */
export function dome(radius: number, base: number): string {
  return [
    `M ${CX - radius} ${CY}`,
    `A ${radius} ${radius} 0 0 1 ${CX + radius} ${CY}`,
    `L ${CX + radius} ${CY + base}`,
    `L ${CX - radius} ${CY + base}`,
    "Z",
  ].join(" ");
}

/** Deterministic PRNG so server and client render identical starfields. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
