import Link from "next/link";

interface SubscribeCalloutProps {
  compact?: boolean;
  prominent?: boolean;
}

/**
 * A privacy firewall, not an embedded email form.
 *
 * Vibe Check never receives the address: this link hands the visitor to
 * Substack, where subscription consent and email storage happen separately.
 * Most importantly, no email can be joined to the anonymous browser id used by
 * the research data.
 */
export default function SubscribeCallout({
  compact = false,
  prominent = false,
}: SubscribeCalloutProps) {
  return (
    <aside className={`subscribe-callout${compact ? " is-compact" : ""}${prominent ? " is-prominent" : ""}`}>
      <div>
        <p className="subscribe-kicker">One reminder a month</p>
        <h2>Come back when next month&rsquo;s AI poll opens.</h2>
        <p>
          One email when each new three-question poll opens. It links to the blank
          questions, not the current results. Your email stays with Substack and is
          never connected to your answers here.
        </p>
      </div>
      <Link href="/subscribe" className={prominent ? "lock-in" : "reset"}>
        Get the monthly reminder
      </Link>
    </aside>
  );
}
