import { useState } from "react";
import { InfoCard, type CardTab } from "../components/InfoCard";
import { statusBadge, typeLabel } from "../stops/describe";
import type { TourStep } from "./steps";
import type { TourPhase } from "./useTour";

type Props = { step: TourStep; total: number; phase: TourPhase; sentence: number };

function kickerFor(step: TourStep, total: number): string {
  if (step.kind === "welcome") return "Welcome · FIU Foundation tour";
  if (step.kind === "closing") return "Closing";
  return `Stop ${step.stop!.order} of ${total} · ${typeLabel(step.stop!)}`;
}

/**
 * The current tour step's card. It opens on the Script tab, whose text doubles as captions so the tour works
 * muted; each new step goes back to Script so captions are always in view while narration plays.
 */
export function TourCard({ step, total, phase, sentence }: Props) {
  const content = step.stop ?? step.card!;
  const speaking = phase === "speaking";
  const [tab, setTab] = useState<{ step: string; tab: CardTab }>({ step: step.id, tab: "script" });
  const current = tab.step === step.id ? tab.tab : "script";

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
      guideNotes={step.stop?.guideNotes}
      script={{ text: step.narration, current: sentence, speaking, live: true }}
      tab={current}
      onTabChange={(t) => setTab({ step: step.id, tab: t })}
    />
  );
}
