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
            <h2 id="info-title">How Vibe Check works</h2>
            <button type="button" className="info-close" onClick={hide} aria-label="Close">
              ×
            </button>
          </div>

          <section>
            <h3>The short version</h3>
            <p>
              Vibe Check is a public-opinion instrument dressed as a game. Place where
              you land on a spectrum, lock it in, then see how the crowd answered and
              keep moving through a shuffled set of questions.
            </p>
            <ol>
              <li>
                Tap or click the blank dial to place your needle. Tap again or drag to
                fine-tune it; arrow keys work too.
              </li>
              <li>Use the separate button to lock in your answer.</li>
              <li>
                Read the reveal, then choose <strong>Next question</strong>, swipe left
                on a phone, or exit to Explore. You can also skip an unanswered board.
              </li>
            </ol>
            <p>
              A shuffled stream is optional and finite: it does not loop back through
              boards you already completed. Explore lets you browse the focused Main Set,
              a wider shelf from Vibe Check, and boards made by visitors.
            </p>
          </section>

          <section>
            <h3>Three kinds of reveal</h3>
            <ul>
              <li>
                <strong>The real figure:</strong> you guess a national statistic, then
                see your answer beside a published representative survey and the Vibe
                Check crowd.
              </li>
              <li>
                <strong>The other side:</strong> after giving your own view, you can guess
                where respondents on the opposite half of that same dial landed.
              </li>
              <li>
                <strong>The whole crowd:</strong> after giving your own view, you can guess
                where other people on this Vibe Check board landed.
              </li>
            </ul>
            <p>
              The second guess is optional. Skipping it reveals the results without
              inventing a prediction; your original opinion is already safely recorded.
              Opposite-side comparisons stay hidden until at least ten people are available
              for that comparison.
            </p>
          </section>

          <section>
            <h3>Why results come second</h3>
            <p>
              Seeing a crowd number first can pull a later answer toward it—an effect called{" "}
              <a
                href="https://thedecisionlab.com/biases/anchoring-bias"
                target="_blank"
                rel="noopener noreferrer"
              >
                anchoring bias
              </a>
              . That is why unanswered boards never preview the average.
            </p>
            <p>
              You may choose <strong>View results without voting</strong>, but it is a
              trade: the board is permanently closed to voting in that browser before any
              result appears. This keeps a revealed number from becoming an anchored vote.
            </p>
            <p>
              Each board accepts one answer from you during its current period. Some are
              one-time questions; others reopen on the cadence printed with their results.
            </p>
            <p>
              Shared board cards are deliberately result-free too, so a friend can arrive
              without seeing the answer they are about to judge.
            </p>
          </section>

          <section>
            <h3>How to read the results</h3>
            <dl className="info-key">
              <dt>AVERAGE 35%</dt>
              <dd>
                The mean position for the window printed beside the result, with repeat
                answers reduced to each person&rsquo;s latest one. The red needle points at it.
              </dd>

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
            <h3>Main, More and community boards</h3>
            <p>
              The <strong>Main Set</strong> is the smaller research-led collection where
              responses are deliberately concentrated. <strong>More from Vibe Check</strong>
              holds good questions outside that focused slate. Both are written by this
              project and are clearly separated from visitor-made boards.
            </p>
            <p>
              Anyone can make a standard board, an &ldquo;other side&rdquo; board, or a
              &ldquo;whole crowd&rdquo; board. Visitor-made boards cannot claim a real-world
              benchmark without editorial source review. They begin unlisted, can be
              reported, and only receive prominent placement after moderation.
            </p>
            <p>
              After voting on a visitor-made board, you may privately mark it useful or
              not for you. That signal is not a public score and is not part of the research
              data. It only nudges discovery; a negative mark also removes that board from
              your future community stream.
            </p>
          </section>

          <section>
            <h3>What&rsquo;s collected</h3>
            <ul>
              <li>
                <strong>Where you placed each mark</strong>, as a number between 0 and 100,
                and <strong>when</strong>. On predict-then-reveal boards, your opinion and
                your prediction are stored as two separate kinds of record.
              </li>
              <li>No account, no email, no name, no cookies, no tracking scripts.</li>
              <li>
                The optional place question records only where you place yourself between
                rural and densely urban. <strong>No address, GPS location, city or ZIP code
                is requested.</strong>
              </li>
              <li>
                <strong>A random ID links your answers to each other.</strong> It&rsquo;s 16
                random bytes generated in your browser — nothing about you feeds into it, and
                it isn&rsquo;t connected to your name, email, IP address or any account. It
                exists so the results can answer questions like &ldquo;do people who call
                something addictive also call it harmful?&rdquo;, which is impossible with
                unlinked answers. Clearing your browser data destroys it.
              </li>
              <li>
                Receipts for your own answers and predictions are kept in your browser&rsquo;s
                local storage so the page can show you what you picked. Clearing browser
                data erases those local receipts; the anonymous research records remain.
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
            <h3>What these results can mean</h3>
            <p>
              Vibe Check visitors are self-selected, not a representative sample of the
              country. Crowd averages describe the people who answered this board; they
              should not be relabeled as &ldquo;what Americans believe.&rdquo; Published
              benchmark boards show their outside source, field date and sample note so
              the two kinds of number stay distinct.
            </p>
            <p>
              The project is strongest at showing distributions, perception gaps, changes
              over time, and relationships among answers from the same anonymous browser.
              Those patterns can be interesting without pretending the sample represents
              everyone.
            </p>
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
              answers and predictions are kept out of the public export and are not sold.
              The site&rsquo;s hosting and storage services process requests and records to
              operate the project, but there is no advertiser or data-broker feed.
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
