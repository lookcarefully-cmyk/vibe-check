"use client";

import { useRef } from "react";

/**
 * The "?" button and its panel.
 *
 * Built on the native <dialog> element, which gives focus trapping, Escape to
 * close, inert background content and a styleable ::backdrop for free — all
 * things a hand-rolled overlay tends to get wrong.
 */

export default function InfoDialog() {
  const ref = useRef<HTMLDialogElement>(null);

  const show = () => ref.current?.showModal();
  const hide = () => ref.current?.close();

  // No open/closed state is tracked here on purpose. The only thing it would
  // drive is aria-expanded, which isn't the right attribute for a button that
  // opens a modal — that's for disclosure widgets and comboboxes, whose content
  // sits next to the trigger in the DOM. aria-haspopup is what applies, and the
  // dialog itself reports its own open state to assistive tech.
  return (
    <>
      <button
        type="button"
        className="info-trigger"
        onClick={show}
        aria-haspopup="dialog"
        aria-label="How this works, and what's collected"
        title="How this works"
      >
        ?
      </button>

      <dialog
        ref={ref}
        className="info-dialog"
        aria-labelledby="info-title"
        // A click landing on the dialog itself rather than its contents is a
        // click on the backdrop.
        onClick={(e) => {
          if (e.target === ref.current) hide();
        }}
        // A modal <dialog> is supposed to close on Escape by itself. Handling it
        // explicitly costs two lines and removes the dependency on that being
        // wired up correctly in every browser; preventDefault keeps the native
        // path from also firing, so it closes exactly once.
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            hide();
          }
        }}
      >
        {/*
          tabIndex -1 makes this the deliberate focus target when the dialog
          opens, so arrow keys scroll the panel straight away. Its focus ring is
          suppressed in CSS — it's a scroll container, not a control, and a ring
          around the whole panel reads as if it were clickable.
        */}
        <div className="info-panel" tabIndex={-1}>
          <div className="info-head">
            <h2 id="info-title">About this project</h2>
            <button type="button" className="info-close" onClick={hide} aria-label="Close">
              ×
            </button>
          </div>

          <section>
            <h3>How to play</h3>
            <ol>
              <li>Slide the teal handle along the track — or use the arrow keys.</li>
              <li>Click anywhere on the dial to lock your answer in.</li>
              <li>
                The dial opens up: the red needle swings to the average, and coloured rays
                show how everyone&rsquo;s answers are spread out.
              </li>
            </ol>
            <p>
              Each board is its own question with its own separate results. Answering one
              doesn&rsquo;t affect any of the others.
            </p>
          </section>

          <section>
            <h3>Why you can&rsquo;t see the results first</h3>
            <p>
              A board stays blank until you&rsquo;ve answered it, to reduce anchoring bias.
            </p>
          </section>

          <section>
            <h3>How to read the results</h3>
            <dl className="info-key">
              <dt>AVERAGE 35%</dt>
              <dd>The mean of every answer so far. The red needle points at it.</dd>

              <dt>The coloured rays</dt>
              <dd>
                The shape of the spread. A tall narrow fan means people broadly agree; a
                wide flat one means they don&rsquo;t.
              </dd>

              <dt>The arc and its two numbers</dt>
              <dd>
                Where the middle 80% of answers fall. About one in ten went below the lower
                number, and one in ten above the higher one.
              </dd>
            </dl>
            <p className="info-note">
              Everything drawn on the dial is a <em>position on the spectrum</em>, never a
              percentage of people. The how-many-people figures are always in the sentence
              underneath.
            </p>
          </section>

          <section>
            <h3>What&rsquo;s collected</h3>
            <ul>
              <li>
                <strong>One number per answer</strong>, between 0 and 100 — where you put
                the handle. That is the whole record.
              </li>
              <li>No account, no email, no name, no cookies, no tracking scripts.</li>
              <li>
                <strong>Nothing links your answers to each other.</strong> Answering all
                eight boards stores eight unconnected numbers, with no identifier tying them
                together or to you.
              </li>
              <li>
                Your own answers are kept in your browser&rsquo;s local storage so the page
                can show you what you picked. That never leaves your device — clearing your
                browser data erases it.
              </li>
              <li>
                As with any website, the server that hosts this keeps ordinary request logs,
                which include IP addresses. Those are the host&rsquo;s standard logs; this
                project doesn&rsquo;t read them, and they&rsquo;re never joined to votes.
              </li>
            </ul>
          </section>

          <section>
            <h3>What it&rsquo;s used for</h3>
            <p>
              Aggregate results — averages, spreads and response counts — for writing
              published on Substack. Individual answers say nothing on their own, and there
              is nothing in them that could identify anyone. Nothing is sold or handed to
              third parties.
            </p>
            <p className="info-note">
              Some of these questions are personal. That&rsquo;s exactly why the record is a
              bare number and nothing else: there is no version of this data that can be
              traced back to you, because none of the linking information was ever
              collected.
            </p>
          </section>

          <button type="button" className="info-done" onClick={hide}>
            Got it
          </button>
        </div>
      </dialog>
    </>
  );
}
