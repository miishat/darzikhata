import type { Label } from './label';

/** Groups every stage falls into for reporting, whatever the shop calls its stages. */
export type StageGroup = 'unfinished' | 'ready' | 'delivered';
export type SummaryGroup = StageGroup | 'cancelled';

export interface Stage {
  key: string;
  label: Label;
  /** Optional stages (e.g. Trial, QC) may be skipped when moving forward. */
  optional: boolean;
  group: StageGroup;
}

const GROUP_ORDER: Record<StageGroup, number> = { unfinished: 0, ready: 1, delivered: 2 };

/** Returns a list of problems with a stage list; empty means valid. */
export function validateStages(stages: Stage[]): string[] {
  if (stages.length === 0) return ['no-stages'];
  const errors: string[] = [];

  const keys = new Set<string>();
  for (const stage of stages) {
    if (!stage.key.trim()) errors.push('empty-key');
    if (keys.has(stage.key)) errors.push(`duplicate-key:${stage.key}`);
    keys.add(stage.key);
  }

  const first = stages[0]!;
  if (first.group !== 'unfinished') errors.push('first-not-unfinished');
  if (first.optional) errors.push('first-optional');

  const last = stages[stages.length - 1]!;
  if (last.group !== 'delivered') errors.push('last-not-delivered');
  if (stages.filter((s) => s.group === 'delivered').length > 1) errors.push('multiple-delivered');
  if (!stages.some((s) => s.group === 'ready' && !s.optional)) errors.push('no-required-ready');

  for (let i = 1; i < stages.length; i++) {
    if (GROUP_ORDER[stages[i]!.group] < GROUP_ORDER[stages[i - 1]!.group]) {
      errors.push('groups-out-of-order');
      break;
    }
  }
  return errors;
}

export type TransitionCheck =
  | { ok: true; kind: 'forward' | 'rework'; skipped: string[] }
  | { ok: false; reason: 'unknown-stage' | 'same-stage' | 'skips-required' | 'already-delivered' };

/**
 * Checks a move between stages. Forward moves may skip optional stages only.
 * Backward moves are rework. Nothing moves out of a delivered stage.
 */
export function checkTransition(stages: Stage[], fromKey: string, toKey: string): TransitionCheck {
  const from = stages.findIndex((s) => s.key === fromKey);
  const to = stages.findIndex((s) => s.key === toKey);
  if (from < 0 || to < 0) return { ok: false, reason: 'unknown-stage' };
  if (from === to) return { ok: false, reason: 'same-stage' };
  if (stages[from]!.group === 'delivered') return { ok: false, reason: 'already-delivered' };
  if (to < from) return { ok: true, kind: 'rework', skipped: [] };

  const between = stages.slice(from + 1, to);
  if (between.some((s) => !s.optional)) return { ok: false, reason: 'skips-required' };
  return { ok: true, kind: 'forward', skipped: between.map((s) => s.key) };
}

export function stageByKey(stages: Stage[], key: string): Stage {
  const stage = stages.find((s) => s.key === key);
  if (!stage) throw new Error(`Unknown stage: ${key}`);
  return stage;
}

export function stageGroup(stages: Stage[], key: string): StageGroup {
  return stageByKey(stages, key).group;
}
