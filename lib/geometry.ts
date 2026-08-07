/**
 * Shared dial geometry. Everything is expressed in the SVG's user-space units
 * (the viewBox below), so the whole thing scales responsively for free.
 */

export const VIEW = { w: 1000, h: 636 };

/** Hub: the red circle at bottom-centre. Origin for the needle and every ray. */
export const CX = 500;
export const CY = 500;

export const R_BORDER = 478; // outer edge of the clean cream border
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
/** Just outside the bracket, in the clear band between the ticks and the rim. */
export const R_BRACKET_LABEL = R_BRACKET + 26;

/**
 * The ten-band histogram ring: bars grow outward from R_BAND_IN, so the ring
 * reads as a bar chart bent around the arc rather than as a second dial.
 *
 * It has to fit the clear annulus between where the rays stop (R_RAY_MAX, 302)
 * and the inner end of the margin bracket's ticks (R_BRACKET - 22, 336). That
 * leaves a thin band, which is why bar length is doubled up with opacity below
 * — 28 units of length alone is not enough to read ten values apart.
 */
export const R_BAND_IN = R_FACE - 94;
export const R_BAND_OUT = R_FACE - 66;

/**
 * Phone-sized versions of the same three radii.
 *
 * The dial is ~340px wide on a phone, where a 28-unit ring renders about 9px
 * thick — technically drawn, practically unreadable. So on small screens the
 * rays give up some length and the ring takes it: roughly double the thickness,
 * still clear of the bracket ticks at R_BRACKET - 22.
 */
export const R_RAY_MAX_COMPACT = 262;
export const R_BAND_IN_COMPACT = 272;
export const R_BAND_OUT_COMPACT = 330;

/**
 * The invisible pointer target for a band. Far taller than the ring itself so a
 * fingertip can hit it — the visible bar is only ever a few millimetres tall.
 */
export const R_BAND_HIT_IN = 150;
export const R_BAND_HIT_OUT = R_FACE;

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
 * A closed annular sector spanning `from`..`to` on the 0..1 spectrum, between
 * two radii. Used for the band ring: one sector per Likert band.
 *
 * Values increase clockwise on screen (angleOf runs PI -> 0), so the outer edge
 * sweeps positive and the inner edge sweeps back negative to close the shape.
 */
export function annularSector(
  from: number,
  to: number,
  rInner: number,
  rOuter: number,
): string {
  const [ix, iy] = polar(from, rInner);
  const [ox, oy] = polar(from, rOuter);
  const [ox2, oy2] = polar(to, rOuter);
  const [ix2, iy2] = polar(to, rInner);
  // Bands are a tenth of the semicircle (18 degrees), so never a large arc.
  const large = Math.abs(to - from) > 0.5 ? 1 : 0;
  return [
    `M ${ix.toFixed(2)} ${iy.toFixed(2)}`,
    `L ${ox.toFixed(2)} ${oy.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)}`,
    `L ${ix2.toFixed(2)} ${iy2.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${ix.toFixed(2)} ${iy.toFixed(2)}`,
    "Z",
  ].join(" ");
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
