// The text Tour Mode speaks for each step, the same way src/tour/steps.ts builds it (a unit test checks they
// match). Plain JS so the build-time audio generator can use it without compiling TypeScript.

/** Spoken text: the narration script if there is one, otherwise the card read top to bottom. */
export function narrationFor(item) {
  if (item.narration) return item.narration;
  return [item.summary, ...item.highlights, item.impact]
    .map((s) => s.trim())
    .map((s) => (/[.!?]$/.test(s) ? s : `${s}.`))
    .join(" ");
}

/** Every narration Tour Mode can play, plus the off-route cards: { id, title, text }. */
export function narrationItems(stops, tour) {
  const route = stops.filter((s) => s.order !== null).sort((a, b) => a.order - b.order);
  const others = stops.filter((s) => s.order === null);
  return [
    { id: "welcome", title: tour.welcome.title, text: narrationFor(tour.welcome) },
    ...route.map((s) => ({ id: s.id, title: s.name, text: narrationFor(s) })),
    { id: "closing", title: tour.closing.title, text: narrationFor(tour.closing) },
    ...others.map((s) => ({ id: s.id, title: s.name, text: narrationFor(s) })),
  ];
}
