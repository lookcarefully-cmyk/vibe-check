"use client";

import { useRouter } from "next/navigation";
import { EXTRA_TOPICS } from "@/lib/experiment";

export default function StartMainSet({ label = "Start the main set" }: { label?: string }) {
  const router = useRouter();

  const start = () => {
    if (EXTRA_TOPICS.length === 0) return;
    const topic = EXTRA_TOPICS[Math.floor(Math.random() * EXTRA_TOPICS.length)];
    router.push(`/${topic.id}?stream=start`);
  };

  return (
    <button type="button" className="lock-in start-main-set" onClick={start}>
      {label}
    </button>
  );
}
