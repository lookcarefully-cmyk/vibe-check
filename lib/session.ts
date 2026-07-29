/**
 * A random per-browser id, sent with each vote so one person's answers can be
 * related across boards.
 *
 * What it is: 16 random bytes from the platform CSPRNG, minted on this device.
 * What it isn't: derived from anything about the person. No name, email, IP,
 * fingerprint or account feeds into it, it is never returned by any public
 * endpoint, and clearing browser data destroys it.
 *
 * It exists so results can answer questions like "do people who call it
 * addictive also call it harmful?", which is impossible with unlinked answers.
 * That capability is the reason the disclosure has to mention it.
 */

const KEY = "vibecheck:session";
const SHAPE = /^[0-9a-f]{32}$/;

export function getSessionId(): string {
  let id: string | null = null;
  try {
    id = window.localStorage.getItem(KEY);
  } catch {
    /* private browsing can throw on access; fall through to a fresh id */
  }
  if (id && SHAPE.test(id)) return id;

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const fresh = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

  try {
    window.localStorage.setItem(KEY, fresh);
  } catch {
    /* not persisted; the vote still records a valid one-off id */
  }
  return fresh;
}
