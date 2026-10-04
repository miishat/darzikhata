import type { Stage, SummaryGroup } from '@darzikhata/domain';

export type Tone = 'booked' | 'cutting' | 'working' | 'trial' | 'ready' | 'done' | 'cancelled';

const BY_KEY: Record<string, Tone> = {
  booked: 'booked',
  cutting: 'cutting',
  trial: 'trial',
  qc: 'trial',
};

/** Colour family for a garment's current stage. */
export function stageTone(stage: Stage | undefined, group: SummaryGroup, index: number): Tone {
  if (group === 'cancelled') return 'cancelled';
  if (group === 'delivered') return 'done';
  if (group === 'ready') return 'ready';
  if (stage && BY_KEY[stage.key]) return BY_KEY[stage.key]!;
  return index === 0 ? 'booked' : 'working';
}

/** Full literal class names (so Tailwind can see them) for a tinted band in a stage's colours. */
export const TONE_BAND: Record<Tone, string> = {
  booked: 'bg-tone-booked-bg text-tone-booked-fg',
  cutting: 'bg-tone-cutting-bg text-tone-cutting-fg',
  working: 'bg-tone-working-bg text-tone-working-fg',
  trial: 'bg-tone-trial-bg text-tone-trial-fg',
  ready: 'bg-tone-ready-bg text-tone-ready-fg',
  done: 'bg-tone-done-bg text-tone-done-fg',
  cancelled: 'bg-tone-cancelled-bg text-tone-cancelled-fg',
};
