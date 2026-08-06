"use client";

import { useRouter } from "next/navigation";
import { EXTRA_TOPICS } from "@/lib/experiment";
import { canAnswerNow } from "@/lib/mine";

export default function StartMainSet({ label = "Start the main set" }: { label?: string }) {
  const router = useRouter();

  const start = () => {
    const available = EXTRA_TOPICS.filter((topic) => canAnswerNow(topic, Date.now()));
    if (available.length === 0) {
      router.push("/explore");
      return;
    }
    const topic = available[Math.floor(Math.random() * available.length)];
    router.push(`/${topic.id}?stream=start`);
  };

  return (
    <button type="button" className="lock-in start-main-set" onClick={start}>
      {label}
    </button>
  );
}
