import type { Metadata } from "next";
import DevPanel from "@/components/DevPanel";

export const metadata: Metadata = {
  title: "Vibe Check — test harness",
  robots: { index: false, follow: false },
};

export default function DevPage() {
  return <DevPanel />;
}
