import type { Metadata, Viewport } from "next";
import "./globals.css";

// Where the OG/Twitter image URLs resolve against. Without this, Next warns and
// the preview-card URL is wrong in production. Prefers the explicit site origin,
// falls back to Vercel's deployment host, then localhost for dev.
const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3210");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
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
