import type { Metadata } from "next";
import BoardIndex from "@/components/BoardIndex";

export const metadata: Metadata = {
  title: "Vibe Check — all boards",
  description: "Every question in the collection.",
};

export default function BoardsPage() {
  return <BoardIndex />;
}
