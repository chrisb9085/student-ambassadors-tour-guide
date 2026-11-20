// Types for narration.mjs, so TypeScript tests can import it.
type Card = { narration: string | null; summary: string; highlights: string[]; impact: string };
type StopLike = Card & { id: string; name: string; order: number | null };
type TourLike = { welcome: Card & { title: string }; closing: Card & { title: string } };

export function narrationFor(item: Card): string;
export function narrationItems(stops: StopLike[], tour: TourLike): { id: string; title: string; text: string }[];
