import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
