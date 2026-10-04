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
