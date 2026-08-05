/**
 * The three-step explainer, surfaced on the page itself rather than hidden
 * behind the "?". A first-time visitor should understand the dial before they
 * touch it; the full detail still lives in InfoDialog.
 *
 * Server component — it's static markup with no interactivity.
 */
export default function HowToPlay() {
  const steps = [
    "Tap the dial where you land on the question.",
    "Lock your answer in.",
    "The dial opens up and shows where everyone else landed.",
  ];

  return (
    <ol className="how-to-play" aria-label="How to play">
      {steps.map((text, i) => (
        <li key={i}>
          <span className="htp-num" aria-hidden="true">
            {i + 1}
          </span>
          <span className="htp-text">{text}</span>
        </li>
      ))}
    </ol>
  );
}
