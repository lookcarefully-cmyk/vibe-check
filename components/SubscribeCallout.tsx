import Link from "next/link";

interface SubscribeCalloutProps {
  compact?: boolean;
  prominent?: boolean;
  /**
   * Which offer to make. `pulse` is the monthly AI poll reminder; `general` is
   * for the end of anything else, where naming the AI poll would be a
   * non-sequitur to someone who just finished a quiz about loneliness.
   */
  variant?: "pulse" | "general";
}

/**
 * A privacy firewall, not an embedded email form.
 *
 * Vibe Check never receives the address: this link hands the visitor to
 * Substack, where subscription consent and email storage happen separately.
 * Most importantly, no email can be joined to the anonymous browser id used by
 * the research data.
 *
 * This is also the site's ONLY way to bring anyone back. Everything the project
 * wants to claim about measuring the same people over time depends on someone
 * returning, and nothing else here can ask them to.
 */
export default function SubscribeCallout({
  compact = false,
  prominent = false,
  variant = "pulse",
}: SubscribeCalloutProps) {
  const pulse = variant === "pulse";
  return (
    <aside className={`subscribe-callout${compact ? " is-compact" : ""}${prominent ? " is-prominent" : ""}`}>
      <div>
        <p className="subscribe-kicker">
          {pulse ? "One reminder a month" : "One email a month"}
        </p>
        <h2>
          {pulse
            ? "Come back when next month’s AI poll opens."
            : "Get notified when new questions go up."}
        </h2>
        <p>
          {pulse
            ? "One email when each new three-question poll opens. It links to the blank questions, not the current results."
            : "One email when new questions go up. It links to the blank dials, never to the answers."}
          {" "}
          Your email stays with Substack and is never connected to your answers
          here.
        </p>
      </div>
      <Link href="/subscribe" className={prominent ? "lock-in" : "reset"}>
        {pulse ? "Get the monthly reminder" : "Get the monthly email"}
      </Link>
    </aside>
  );
}
