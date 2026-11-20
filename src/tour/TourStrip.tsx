import type { TourStep } from "./steps";

type Props = {
  steps: TourStep[];
  index: number;
  /** Ids of skipped steps. */
  skipped: string[];
  finished: boolean;
};

/**
 * One segment per tour step: done, skipped, current or still to come, so an ambassador can see at a glance where
 * they are and which stops they skipped. Visual only; the progress bar and the "N skipped" text carry the same
 * information for screen readers, and the map markers are the way to jump to a stop.
 */
export function TourStrip({ steps, index, skipped, finished }: Props) {
  const skippedSet = new Set(skipped);
  return (
    <ol className="tour-strip" aria-hidden="true">
      {steps.map((s, i) => {
        const state = skippedSet.has(s.id) ? "skipped" : i < index || finished ? "done" : i === index ? "current" : "todo";
        return <li key={s.id} className={`tour-strip-seg tour-strip-seg--${state}`} data-state={state} />;
      })}
    </ol>
  );
}
