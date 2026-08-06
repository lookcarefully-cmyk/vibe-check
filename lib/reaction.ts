export type MyBoardReaction = "like" | "dislike";

const key = (slug: string) => `vibecheck:${slug}:reaction`;

export function readBoardReaction(slug: string): MyBoardReaction | null {
  try {
    const value = window.localStorage.getItem(key(slug));
    return value === "like" || value === "dislike" ? value : null;
  } catch {
    return null;
  }
}

export function recordBoardReaction(slug: string, choice: MyBoardReaction): void {
  try {
    window.localStorage.setItem(key(slug), choice);
  } catch {
    /* the server signal still landed; only this browser's receipt is absent */
  }
}
