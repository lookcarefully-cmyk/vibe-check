import type { Metadata, Viewport } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";

/*
 * Typography carries most of the "this was designed" feeling, so it's a
 * deliberate pairing rather than the system default:
 *
 *   Fraunces      — a warm, slightly wonky editorial serif for the questions and
 *                   result numbers. Gives the opinion instrument a considered,
 *                   magazine-ish voice instead of a generic app one.
 *   Space Grotesk — a geometric sans with a bit of quirk for UI and body, which
 *                   reads as intentional where Inter/system-sans reads as default.
 *
 * next/font self-hosts both at build time: no runtime request to Google, no CSP
 * exception, no layout shift (font-display: swap with a matched fallback).
 */
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const text = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-text",
  display: "swap",
});

/**
 * Where the OG/Twitter image URLs resolve against. Without it, Next warns and
 * the preview-card URL is wrong in production.
 *
 * Resolved defensively because `new URL()` throws, and this runs at module load
 * during the build — so one malformed environment variable fails the entire
 * build with "Invalid URL" and no indication of which variable is at fault.
 * That has already happened once: NEXT_PUBLIC_SITE_ORIGIN was set to a bare
 * hostname with no scheme, which `??` happily passes through because it is
 * neither null nor undefined.
 *
 * So: try the value, retry it with https:// if it has no scheme, and fall back
 * rather than throw. A wrong preview-card URL is a far smaller problem than a
 * deployment that won't build.
 */
function resolveOrigin(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_ORIGIN,
    process.env.VERCEL_URL,
    "http://localhost:3210",
  ];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      return new URL(withScheme);
    } catch {
      /* try the next candidate rather than failing the build */
    }
  }
  return new URL("http://localhost:3210");
}

const siteOrigin = resolveOrigin();

export const metadata: Metadata = {
  metadataBase: siteOrigin,
  title: "Vibe Check — where does everyone actually land?",
  description:
    "A live consensus dial. Answer on the spectrum, then see the crowd's distribution.",
  // The opengraph-image below is picked up automatically; these make the card's
  // title and text right and give Twitter the large-image layout.
  openGraph: {
    title: "Vibe Check — where do you land?",
    description:
      "Answer on the spectrum, then see how everyone else answered.",
    siteName: "Vibe Check",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibe Check — where do you land?",
    description:
      "Answer on the spectrum, then see how everyone else answered.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1238",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
