"use client";

import { useState } from "react";

/**
 * The moderation panel. Not linked from anywhere — you reach it at /admin and
 * paste the ADMIN_TOKEN, which is never stored anywhere in the page and only
 * held in memory for the session.
 *
 * It exists so there is always a way to remove a board that shouldn't be up, and
 * to decide which boards reach the front page (approve) versus merely sit in the
 * /b library (the creator's own publish choice).
 */

interface Row {
  slug: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
  category: string;
  revealType: "other-side" | "crowd" | null;
  listed: boolean;
  approved: boolean;
  reviewOnly: boolean;
  underReview: boolean;
  reports: number;
  people: number;
  recentAnswers: number;
}

export default function AdminBoards() {
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(action: string, slug?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/boards/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken: token, action, slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Request failed.");
      if (action === "list") setRows(data.boards);
      else await call("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) {
    return (
      <main className="shell">
        <header className="masthead">
          <h1>Moderation</h1>
          <p className="lede">Paste the admin token to load community boards.</p>
        </header>
        <div className="maker" style={{ maxWidth: "22rem" }}>
          <label className="maker-field">
            <span>Admin token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && token && void call("list")}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button
            type="button"
            className="lock-in"
            disabled={!token || busy}
            onClick={() => void call("list")}
          >
            {busy ? "Loading…" : "Load boards"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="masthead">
        <h1>Moderation</h1>
        <p className="lede">
          {rows.length} community {rows.length === 1 ? "board" : "boards"}. Reported and
          under-review boards sort to the top.
        </p>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="board-group" style={{ maxWidth: "52rem" }}>
        {rows.length === 0 && <p className="board-empty">No community boards yet.</p>}
        {rows.map((b) => (
          <div key={b.slug} className="admin-row">
            <span className="admin-q">
              <a href={`/b/${b.slug}`} target="_blank" rel="noopener noreferrer">
                {b.question}
              </a>
              <br />
              <span className="admin-flags">
                {b.leftLabel} → {b.rightLabel} · {b.people} people · {b.recentAnswers} this week
                {b.reports > 0 && (
                  <span className="flag-review"> · {b.reports} reports</span>
                )}
                {b.underReview && <span className="flag-review"> · UNDER REVIEW</span>}
                {b.approved && <span className="flag-live"> · ON HOME PAGE</span>}
                {b.listed && !b.approved && " · in library"}
                {!b.listed && !b.underReview && " · unlisted"}
                {b.reviewOnly && " · flagged at creation"}
                {b.revealType === "other-side" && " · guesses the other side"}
                {b.revealType === "crowd" && " · guesses the crowd"}
              </span>
            </span>
            {b.approved ? (
              <button type="button" onClick={() => void call("unapprove", b.slug)}>
                Remove from home
              </button>
            ) : (
              <button type="button" onClick={() => void call("approve", b.slug)}>
                Feature on home
              </button>
            )}
            {b.underReview ? (
              <button type="button" onClick={() => void call("restore", b.slug)}>
                Restore
              </button>
            ) : (
              <button type="button" onClick={() => void call("hide", b.slug)}>
                Hide
              </button>
            )}
            <button
              type="button"
              className="danger"
              onClick={() =>
                window.confirm(`Permanently delete "${b.question}"?`) &&
                void call("takedown", b.slug)
              }
            >
              Delete
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}
