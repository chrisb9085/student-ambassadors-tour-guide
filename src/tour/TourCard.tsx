import { InfoCard } from "../components/InfoCard";
import { statusBadge, typeLabel } from "../stops/describe";
import { splitSentences } from "./speech";
import type { TourStep } from "./steps";
import type { TourPhase } from "./useTour";
import "./TourCard.css";

type Props = { step: TourStep; total: number; phase: TourPhase; sentence: number };

function kickerFor(step: TourStep, total: number): string {
  if (step.kind === "welcome") return "Welcome · FIU Foundation tour";
  if (step.kind === "closing") return "Closing";
  return `Stop ${step.stop!.order} of ${total} · ${typeLabel(step.stop!)}`;
}

/** The current tour step's card, with the narration shown as captions so the tour works muted. */
export function TourCard({ step, total, phase, sentence }: Props) {
  const content = step.stop ?? step.card!;
  const sentences = splitSentences(step.narration);
  const speaking = phase === "speaking";

  return (
    <InfoCard
      role="region"
      autoFocus={false}
      contentKey={step.id}
      kicker={kickerFor(step, total)}
      title={step.title}
      badge={step.stop ? statusBadge(step.stop) : null}
      summary={content.summary}
      stat={content.stat}
      highlights={content.highlights}
      impact={content.impact}
    >
      <figure className="captions" data-speaking={speaking || undefined}>
        <figcaption className="captions-label">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 10v4h4l5 4V6L8 10H4Z" fill="currentColor" stroke="none" />
            {speaking && <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
          </svg>
          {speaking ? "Now speaking" : "Narration"}
        </figcaption>
        <p className="captions-text">
          {sentences.map((s, i) => (
            <span key={i} className={i === sentence ? "is-current" : undefined}>
              {s}{" "}
            </span>
          ))}
        </p>
      </figure>
    </InfoCard>
  );
}
