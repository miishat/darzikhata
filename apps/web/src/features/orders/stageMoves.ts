import { checkTransition, type OrderItem, type Stage } from '@darzikhata/domain';
import type { MessageKey } from '../../i18n/bn';
import type { I18n } from '../../i18n/I18nProvider';

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

/** What to do to reach each stage shops start with, as a button would say it. */
const START: Record<string, MessageKey> = {
  cutting: 'item.start.cutting',
  stitching: 'item.start.stitching',
  embroidery: 'item.start.embroidery',
  working: 'item.start.working',
  trial: 'item.start.trial',
  qc: 'item.start.qc',
};

/**
 * The words for the button that moves a garment on to `stage`: an action for a known stage, "mark ready" for any
 * ready stage, or null for a stage a shop named itself, which then reads "Next: <name>".
 */
export function moveOnKey(stage: Stage): MessageKey | null {
  if (stage.group === 'ready') return 'item.markReady';
  return START[stage.key] ?? null;
}

/** The move-on button's text for `stage`, in the current language: see moveOnKey. */
export function moveOnText(stage: Stage, { t, label }: Pick<I18n, 't' | 'label'>): string {
  const key = moveOnKey(stage);
  return key ? t(key) : t('item.nextStage', { stage: label(stage.label) });
}
