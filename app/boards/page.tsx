import type { Metadata } from "next";
import BoardIndex from "@/components/BoardIndex";

export const metadata: Metadata = {
  title: "Vibe Check — main set",
  description: "Browse every research-led question in the main set.",
};

export default function BoardsPage() {
  return <BoardIndex />;
}
