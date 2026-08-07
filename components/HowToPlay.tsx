function DemoDial({ state }: { state: "blank" | "answer" | "crowd" }) {
  const reveal = state === "crowd";

  return (
    <svg className={`htp-dial is-${state}`} viewBox="0 0 180 116" aria-hidden="true">
      <path
        className="htp-dial-shell"
        d="M 13 100 A 77 77 0 0 1 167 100 L 167 111 L 13 111 Z"
      />
      <path
        className="htp-dial-face"
        d="M 24 100 A 66 66 0 0 1 156 100 L 156 111 L 24 111 Z"
      />
      <line className="htp-dial-baseline" x1="24" y1="100" x2="156" y2="100" />

      {reveal && (
        <g className="htp-rays">
          <line x1="90" y1="100" x2="45" y2="72" />
          <line x1="90" y1="100" x2="58" y2="54" />
          <line x1="90" y1="100" x2="76" y2="45" />
          <line x1="90" y1="100" x2="101" y2="55" />
          <line x1="90" y1="100" x2="120" y2="67" />
        </g>
      )}

      {state !== "blank" && (
        <g className="htp-needle">
          <line x1="90" y1="100" x2={reveal ? "61" : "126"} y2={reveal ? "49" : "44"} />
          <circle cx="90" cy="100" r="7" />
        </g>
      )}

      {state === "blank" && (
        <g className="htp-tap-cue">
          <circle cx="126" cy="59" r="8" />
          <circle cx="126" cy="59" r="3" />
        </g>
      )}
    </svg>
  );
}

/** A visual preview of the real blank → answer → reveal interaction. */
export default function HowToPlay() {
  const steps = [
    { title: "Tap where you land", detail: "The dial starts blank.", state: "blank" as const },
    { title: "Lock in your answer", detail: "Drag first if you want to adjust.", state: "answer" as const },
    { title: "See the crowd", detail: "Then move to another question.", state: "crowd" as const },
  ];

  return (
    <section className="how-to" aria-labelledby="how-to-title">
      <p className="explore-kicker" id="how-to-title">How it works</p>
      <ol className="how-to-play">
      {steps.map((step, i) => (
        <li key={step.title}>
          <DemoDial state={step.state} />
          <span className="htp-copy">
          <span className="htp-num" aria-hidden="true">
            {i + 1}
          </span>
            <span>
              <strong>{step.title}</strong>
              <small>{step.detail}</small>
            </span>
          </span>
        </li>
      ))}
      </ol>
    </section>
  );
}
