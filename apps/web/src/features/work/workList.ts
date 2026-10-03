import {
  can,
  canAccessBranch,
  checkTransition,
  itemSummaryGroup,
  type ApplyOutcome,
  type EventBody,
  type ItemRef,
  type Language,
  type Order,
  type ShopConfig,
  type Stage,
  type Staff,
} from '@darzikhata/domain';
import { problemText } from '../common/problemText';

export type WorkGrouping = 'worker' | 'stage';

export interface WorkQuery {
  by: WorkGrouping;
  /** A staff id, 'none' for garments nobody has yet, or 'all'. */
  worker: string;
  /** A stage key, or 'all'. */
  stage: string;
}

export const DEFAULT_WORK_QUERY: WorkQuery = { by: 'worker', worker: 'all', stage: 'all' };

export interface Viewer {
  staffId: string;
  /** True with 'work.view.all'; otherwise only the viewer's own garments are shown. */
  seesAll: boolean;
}

const UNASSIGNED = 'none';

/** Garments still being made that this person may see, earliest promised first. */
export function workItems(orders: Order[], viewer: Viewer): ItemRef[] {
  const refs: ItemRef[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (itemSummaryGroup(item) !== 'unfinished') continue;
      if (!viewer.seesAll && item.assignedTo !== viewer.staffId) continue;
      refs.push({ order, item });
    }
  }
  return refs.sort(byDue);
}

/** Earliest delivery date first (no date last), then order number, then position in the order. */
function byDue(a: ItemRef, b: ItemRef): number {
  const da = a.item.deliveryDate;
  const db = b.item.deliveryDate;
  if (da !== db) {
    if (da === null) return 1;
    if (db === null) return -1;
    return da.localeCompare(db);
  }
  return a.order.number.localeCompare(b.order.number) || a.order.items.indexOf(a.item) - b.order.items.indexOf(b.item);
}

export function filterWork(refs: ItemRef[], query: WorkQuery): ItemRef[] {
  return refs.filter(
    (r) =>
      (query.worker === 'all' || (r.item.assignedTo ?? UNASSIGNED) === query.worker) &&
      (query.stage === 'all' || r.item.stageKey === query.stage),
  );
}

export interface WorkGroup {
  /** A staff id or 'none' when grouped by worker; a stage key when grouped by stage. */
  key: string;
  /** The worker, when grouped by worker and the garments have one. */
  staff: Staff | null;
  /** The stage, when grouped by stage. */
  stage: Stage | null;
  refs: ItemRef[];
}

const stageIndex = (ref: ItemRef) => ref.item.stages.findIndex((s) => s.key === ref.item.stageKey);

/**
 * Groups garments for the work list, keeping each group's garments in due order.
 * Worker groups follow the staff list with unassigned garments last. Stage groups follow
 * the stage's position in its garment's stage list, then the stage key.
 */
export function groupWork(refs: ItemRef[], by: WorkGrouping, config: ShopConfig): WorkGroup[] {
  const groups = new Map<string, WorkGroup>();
  for (const ref of [...refs].sort(byDue)) {
    const key = by === 'worker' ? (ref.item.assignedTo ?? UNASSIGNED) : ref.item.stageKey;
    let group = groups.get(key);
    if (!group) {
      group =
        by === 'worker'
          ? { key, staff: config.staff.find((s) => s.id === key) ?? null, stage: null, refs: [] }
          : { key, staff: null, stage: ref.item.stages[stageIndex(ref)]!, refs: [] };
      groups.set(key, group);
    }
    group.refs.push(ref);
  }
  const list = [...groups.values()];
  if (by === 'worker') {
    const rank = (g: WorkGroup) => {
      const index = config.staff.findIndex((s) => s.id === g.key);
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return list.sort((a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key));
  }
  return list.sort((a, b) => stageIndex(a.refs[0]!) - stageIndex(b.refs[0]!) || a.key.localeCompare(b.key));
}

/** The stages the garments are at now, for the stage filter, in the same order as stage groups. */
export function stageOptions(refs: ItemRef[], config: ShopConfig): Stage[] {
  return groupWork(refs, 'stage', config).map((g) => g.stage!);
}

const GROUPINGS: readonly WorkGrouping[] = ['worker', 'stage'];

/** Reads the work-list filters from the URL; anything unknown falls back to the default. */
export function readWorkQuery(params: URLSearchParams): WorkQuery {
  const by = params.get('by') as WorkGrouping | null;
  return {
    by: by && GROUPINGS.includes(by) ? by : DEFAULT_WORK_QUERY.by,
    worker: params.get('worker') || DEFAULT_WORK_QUERY.worker,
    stage: params.get('stage') || DEFAULT_WORK_QUERY.stage,
  };
}

/** The URL form of the filters, leaving defaults out. */
export function writeWorkQuery(query: WorkQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.by !== DEFAULT_WORK_QUERY.by) params.set('by', query.by);
  if (query.worker !== DEFAULT_WORK_QUERY.worker) params.set('worker', query.worker);
  if (query.stage !== DEFAULT_WORK_QUERY.stage) params.set('stage', query.stage);
  return params;
}

const GROUP_RANK: Record<Stage['group'], number> = { unfinished: 0, ready: 1, delivered: 2 };

/**
 * Stages offered when moving several garments at once: every stage at least one selected
 * garment can move forward to, except handing over, which is always done one garment at a time.
 */
export function batchStageTargets(refs: ItemRef[]): Stage[] {
  const found = new Map<string, Stage>();
  for (const { item } of refs) {
    for (const stage of item.stages) {
      if (stage.group === 'delivered' || found.has(stage.key)) continue;
      const check = checkTransition(item.stages, item.stageKey, stage.key);
      if (check.ok && check.kind === 'forward') found.set(stage.key, stage);
    }
  }
  return [...found.values()].sort((a, b) => GROUP_RANK[a.group] - GROUP_RANK[b.group]);
}

export type SkipReason = 'not-in-list' | 'hand-over' | 'same-stage' | 'backward' | 'skips-required';

export type StagePlanRow =
  | { ref: ItemRef; ok: true; from: Stage; to: Stage; skipped: string[] }
  | { ref: ItemRef; ok: false; reason: SkipReason };

/**
 * What moving each selected garment to one stage would do. Only forward moves are made
 * in bulk: going back needs a reason per garment, and handing over is done one at a time.
 */
export function planStageMove(refs: ItemRef[], toKey: string): StagePlanRow[] {
  return refs.map((ref): StagePlanRow => {
    const { item } = ref;
    const to = item.stages.find((s) => s.key === toKey);
    if (!to) return { ref, ok: false, reason: 'not-in-list' };
    if (to.group === 'delivered') return { ref, ok: false, reason: 'hand-over' };
    const check = checkTransition(item.stages, item.stageKey, toKey);
    if (!check.ok) return { ref, ok: false, reason: check.reason === 'same-stage' ? 'same-stage' : 'skips-required' };
    if (check.kind === 'rework') return { ref, ok: false, reason: 'backward' };
    const from = item.stages.find((s) => s.key === item.stageKey)!;
    return { ref, ok: true, from, to, skipped: check.skipped };
  });
}

export function stageMoveBody(row: Extract<StagePlanRow, { ok: true }>): EventBody {
  return { type: 'item.stageChanged', orderId: row.ref.order.id, itemId: row.ref.item.id, to: row.to.key, reason: '' };
}

export type AssignPlanRow = { ref: ItemRef; ok: true } | { ref: ItemRef; ok: false; reason: 'already-assigned' };

/** What giving each selected garment to one person (or to nobody, with null) would do. */
export function planAssign(refs: ItemRef[], assigneeId: string | null): AssignPlanRow[] {
  return refs.map((ref) =>
    ref.item.assignedTo === assigneeId ? { ref, ok: false, reason: 'already-assigned' } : { ref, ok: true },
  );
}

/** Carries the garment's version from when the preview was opened, so a change made since is a conflict. */
export function assignBody(ref: ItemRef, assigneeId: string | null): EventBody {
  return {
    type: 'item.assigned',
    orderId: ref.order.id,
    itemId: ref.item.id,
    baseVersion: ref.item.version,
    assigneeId,
  };
}

/** Active people who make garments and work in every one of these branches. */
export function assignees(config: ShopConfig, branchIds: string[]): Staff[] {
  return config.staff.filter((staff) => {
    const role = config.roles.find((r) => r.id === staff.roleId);
    return (
      staff.active &&
      role !== undefined &&
      can(role, 'work.updateStage') &&
      branchIds.every((branchId) => canAccessBranch(staff, branchId))
    );
  });
}

export interface BatchResult {
  ref: ItemRef;
  /** Null when the change was saved. */
  problem: string | null;
}

/**
 * Saves the changes one garment at a time, in order, so one garment's problem does not
 * stop the others, and reports what happened to each.
 */
export async function runBatch(
  dispatch: (body: EventBody) => Promise<ApplyOutcome>,
  steps: Array<{ ref: ItemRef; body: EventBody }>,
  language: Language,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  for (const { ref, body } of steps) {
    const outcome = await dispatch(body);
    results.push({ ref, problem: problemText(outcome, language) });
  }
  return results;
}
