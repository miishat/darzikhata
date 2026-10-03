import { checkTransition, type OrderItem, type Stage } from '@darzikhata/domain';

export interface StageMove {
  stage: Stage;
  kind: 'forward' | 'rework';
  /** Optional stages passed over by a forward move, e.g. ['trial']. */
  skipped: string[];
}

/**
 * Stages this garment may move to now, in stage order. Forward moves may skip optional
 * stages only; earlier stages are rework and need a reason. Cancelled or delivered garments
 * cannot move.
 */
export function stageMoves(item: OrderItem): StageMove[] {
  if (item.cancelled) return [];
  const moves: StageMove[] = [];
  for (const stage of item.stages) {
    const check = checkTransition(item.stages, item.stageKey, stage.key);
    if (check.ok) moves.push({ stage, kind: check.kind, skipped: check.skipped });
  }
  return moves;
}

/** The first forward stage, offered as the one-tap "move on" action. */
export function nextMove(item: OrderItem): StageMove | null {
  return stageMoves(item).find((m) => m.kind === 'forward') ?? null;
}
