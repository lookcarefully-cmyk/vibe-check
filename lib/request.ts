import { createHash } from "node:crypto";

/**
 * Request-level checks shared by the write endpoints.
 */

/**
 * Same-origin check for state-changing requests.
 *
 * Browsers always send Origin on cross-origin POSTs, so a request whose Origin
 * isn't ours is either another site posting on its own pages' behalf, or a tool.
 * A missing Origin is allowed through: curl and server-to-server callers omit it
 * entirely, and blocking those buys nothing while breaking legitimate scripts.
 * This is a cheap filter, not a security boundary — rate limiting is what
 * actually bounds abuse.
 */
export function originIsAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  const allowed = new Set<string>();

  const host = req.headers.get("host");
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  // Vercel sets this to the canonical deployment host.
  const vercel = process.env.VERCEL_URL;
  if (vercel) allowed.add(`https://${vercel}`);
  const site = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (site) allowed.add(site);
  for (const extra of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const trimmed = extra.trim();
    if (trimmed) allowed.add(trimmed);
  }

  return allowed.has(origin);
}

/**
 * A stable, non-reversible token for the caller, used only as a rate-limit
 * bucket.
 *
 * The raw IP is hashed with a server-side salt and never stored, so the
 * rate-limit keys can't be turned back into a list of visitors' addresses. Set
 * RATE_LIMIT_SALT in the environment; without it the hash is still one-way but
 * would be reproducible by anyone who knows the code, so the salt is what makes
 * it meaningfully private.
 */
export function callerToken(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip =
    forwarded.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.RATE_LIMIT_SALT ?? "vibecheck-unsalted";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}

/** A 32-char lowercase hex id, as minted by lib/session.ts on the client. */
export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{32}$/.test(value);
}
