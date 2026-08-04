import type { Metadata } from "next";
import BoardMaker from "@/components/BoardMaker";

export const metadata: Metadata = {
  title: "Vibe Check — make a board",
  description: "Write a question with two ends to it and share it with anyone.",
};

export default function NewBoardPage() {
  return <BoardMaker />;
}
