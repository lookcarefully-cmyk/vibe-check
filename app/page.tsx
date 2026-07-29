import { redirect } from "next/navigation";
import { DEFAULT_TOPIC } from "@/lib/topics";

export default function Home() {
  redirect(`/${DEFAULT_TOPIC.id}`);
}
