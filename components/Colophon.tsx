/**
 * The credit line, shown site-wide beneath the standing disclosure. Kept in one
 * place so the four page footers can't drift apart on it.
 *
 * Server component — static markup only.
 */
export default function Colophon() {
  return (
    <p className="colophon">
      Created by Claude Opus 5, with guidance from{" "}
      <a href="https://x.com/_lookcarefully" target="_blank" rel="noopener noreferrer">
        @_lookcarefully
      </a>{" "}
      on X.
    </p>
  );
}
