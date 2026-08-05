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
              <li>
                Tap the spectrum where you land — a dot marks your spot. Nothing
                sits on the dial until you place it, so you start from a blank
                slate, not a default. (Arrow keys work too.)
              </li>
              <li>Adjust if you like, then lock your answer in.</li>
              <li>
                The dial opens up: the red needle swings to the average, and coloured rays
                show how everyone&rsquo;s answers are spread out.
              </li>
            </ol>
            <p>
              Each board is its own question with its own separate results. Answering one
              doesn&rsquo;t affect any of the others.
            </p>
            <p>
              <strong>One answer per board.</strong> Once you&rsquo;ve answered, that
              board shows you its results whenever you come back — but it won&rsquo;t
              take a second answer from you.
            </p>
          </section>

          <section>
            <h3>Why you can&rsquo;t see the results first</h3>
            <p>
              You cannot view the board before voting to reduce{" "}
              <a
                href="https://thedecisionlab.com/biases/anchoring-bias"
                target="_blank"
                rel="noopener noreferrer"
              >
                anchoring bias
              </a>
              . If you do not want to vote and want to see the results, click the
              &ldquo;view results without voting&rdquo; tab. NOTE, you will not be able
              to vote again after clicking this.
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

              <dt>The ring of ten blocks</dt>
              <dd>
                The spectrum split into the ten bands the results are described in — the
                fuller a block, the more people landed in it. Point at one (or tap it on a
                phone) and the line under the dial tells you which band it is and how many
                people chose it. Yours is outlined in teal.
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
                <strong>Where you placed your mark</strong>, as a number between 0 and 100,
                and <strong>when</strong> you answered.
              </li>
              <li>No account, no email, no name, no cookies, no tracking scripts.</li>
              <li>
                <strong>A random ID links your answers to each other.</strong> It&rsquo;s 16
                random bytes generated in your browser — nothing about you feeds into it, and
                it isn&rsquo;t connected to your name, email, IP address or any account. It
                exists so the results can answer questions like &ldquo;do people who call
                something addictive also call it harmful?&rdquo;, which is impossible with
                unlinked answers. Clearing your browser data destroys it.
              </li>
              <li>
                Your own answers are kept in your browser&rsquo;s local storage so the page
                can show you what you picked. That never leaves your device — clearing your
                browser data erases it.
              </li>
              <li>
                To stop one person stuffing a board, your IP address is scrambled into a
                one-way code and used to count how many answers came from you today. The
                address itself is never written down, the code can&rsquo;t be turned back
                into it, only a running count is kept, and it&rsquo;s deleted after a day.
                It is never stored with your answers.
              </li>
              <li>
                As with any website, the server that hosts this keeps ordinary request logs,
                which include IP addresses. Those are the host&rsquo;s standard logs; this
                project doesn&rsquo;t read them, and they&rsquo;re never joined to votes.
              </li>
            </ul>
          </section>

          <section>
            <h3>What this is for</h3>
            <p>
              This is a public snapshot of where people actually land on questions that
              usually get argued about in absolutes. It&rsquo;s here for anyone to
              answer, share, argue with, and use to see how they compare to everyone
              else. The results are open to all — there&rsquo;s no members-only version.
            </p>
            <p>
              Aggregate results — averages, spreads, response counts and how answers
              relate to each other — may also be written about publicly. Individual
              answers say nothing on their own. Nothing is sold or handed to third
              parties.
            </p>
            <p className="info-note">
              Some of these questions are personal. Your answers are grouped together by a
              random ID so they can be compared with each other — but nothing that could
              identify you is stored alongside them, and no name, email, account or IP
              address is ever attached. A set of numbers and a random string is not a person.
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
