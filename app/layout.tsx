import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wavelength — Is shortform social media addictive?",
  description:
    "A live consensus dial. Answer on the spectrum, then see the crowd's distribution.",
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
