import { useEffect, useId, useRef, useState } from "react";
import type { Stop } from "../content/types";
import { statusBadge } from "../stops/describe";
import { makeRound, scoreLine, type Question } from "./quiz";
import "./QuizPanel.css";

type Props = {
  /** Buildings the quiz can ask about. */
  pool: readonly Stop[];
  /** Called with the building to highlight on the map, or null once the round is over. */
  onQuestion: (stop: Stop | null) => void;
  /** Opens a building's full card (from the end-of-round review). */
  onOpenStop: (id: string) => void;
  onExit: () => void;
  /** Tests pass a seeded generator so rounds are predictable. */
  rand?: () => number;
};

/**
 * Self-quiz: the map highlights a building with its name hidden, the ambassador picks its name from four
 * nearby buildings, then the card's key facts are revealed. Ten buildings per round.
 */
export function QuizPanel({ pool, onQuestion, onOpenStop, onExit, rand }: Props) {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [round, setRound] = useState<Question[]>(() => makeRound(pool, rand));
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const onExitRef = useRef(onExit);
  const onQuestionRef = useRef(onQuestion);
  useEffect(() => {
    onExitRef.current = onExit;
    onQuestionRef.current = onQuestion;
  }, [onExit, onQuestion]);

  const done = index >= round.length;
  const question = done ? null : round[index];
  const picked = picks[index] ?? null;
  const answered = picked !== null;
  const correct = round.filter((q, i) => picks[i] === q.stop.id).length;

  // Escape leaves the quiz; focus goes back to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onExitRef.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected && opener !== document.body) opener.focus();
    };
  }, []);

  // New question (or the results): move the map and focus the heading.
  useEffect(() => {
    onQuestionRef.current(question?.stop ?? null);
    headingRef.current?.focus();
  }, [question, round]);
  useEffect(() => () => onQuestionRef.current(null), []);

  const restart = () => {
    setRound(makeRound(pool, rand));
    setIndex(0);
    setPicks([]);
  };

  if (!question) {
    const { score, note } = scoreLine(correct, round.length);
    const missed = round.filter((q, i) => picks[i] !== q.stop.id);
    return (
      <section className="panel quiz" role="dialog" aria-labelledby={titleId}>
        <header className="quiz-header">
          <p className="quiz-kicker">Quiz yourself · Round complete</p>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="quiz-title">
            {score}
          </h2>
        </header>
        <div className="quiz-body">
          <p className="quiz-note">{note}</p>
          {missed.length > 0 && (
            <>
              <h3 className="quiz-subhead">Review these</h3>
              <ul className="quiz-missed">
                {missed.map((q) => (
                  <li key={q.stop.id}>
                    <button type="button" className="quiz-missed-link" onClick={() => onOpenStop(q.stop.id)}>
                      {q.stop.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <footer className="quiz-footer">
          <button type="button" className="btn btn-secondary" onClick={onExit}>
            Done
          </button>
          <button type="button" className="btn btn-primary" onClick={restart}>
            New round
          </button>
        </footer>
      </section>
    );
  }

  const { stop } = question;
  const isRight = picked === stop.id;
  const badge = statusBadge(stop);

  return (
    <section className="panel quiz" role="dialog" aria-labelledby={titleId}>
      <header className="quiz-header">
        <p className="quiz-kicker">
          Quiz yourself · Question {index + 1} of {round.length} · {correct} correct
        </p>
        <h2 id={titleId} ref={headingRef} tabIndex={-1} className="quiz-title">
          {answered ? stop.name : "Which building is highlighted on the map?"}
        </h2>
        <button type="button" className="icon-btn quiz-close" onClick={onExit} aria-label="Exit quiz">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="quiz-body">
        <ul className="quiz-choices" aria-label="Choices">
          {question.choices.map((c) => {
            const state = !answered ? "" : c.id === stop.id ? "is-answer" : c.id === picked ? "is-wrong" : "";
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`quiz-choice ${state}`}
                  disabled={answered}
                  aria-pressed={answered ? c.id === picked : undefined}
                  onClick={() => setPicks((p) => Object.assign([...p], { [index]: c.id }))}
                >
                  <span>{c.name}</span>
                  {state === "is-answer" && <span className="quiz-choice-tag">Answer</span>}
                  {state === "is-wrong" && <span className="quiz-choice-tag">Your pick</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div role="status" className="quiz-feedback">
          {answered && <p className={`quiz-verdict ${isRight ? "is-right" : "is-wrong"}`}>{isRight ? "Correct!" : `Not quite. This is ${stop.name}.`}</p>}
        </div>

        {answered && (
          <div className="quiz-reveal">
            {badge && <p className="quiz-badge">{badge}</p>}
            <p>{stop.summary}</p>
            {stop.stat && (
              <p className="quiz-stat">
                <strong>{stop.stat.value}</strong> {stop.stat.label}
              </p>
            )}
            {stop.highlights.length > 0 && (
              <ul className="quiz-highlights">
                {stop.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <footer className="quiz-footer">
        <button type="button" className="btn btn-primary" disabled={!answered} onClick={() => setIndex((i) => i + 1)}>
          {index + 1 < round.length ? "Next question" : "See results"}
        </button>
      </footer>
    </section>
  );
}
