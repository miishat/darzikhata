import type { ItemRef, Stage } from '@darzikhata/domain';
import { itemSummaryGroup } from '@darzikhata/domain';

const GROUP_RANK: Record<Stage['group'], number> = { unfinished: 0, ready: 1, delivered: 2 };

export interface BoardColumn {
  key: string;
  stage: Stage;
  refs: ItemRef[];
}

/**
 * Groups garments into one column per stage. Templates have different stage lists, so the columns
 * are the union of every template's stages merged by key and ordered by their first position
 * within their group, so ready stages always come after the unfinished ones (ties keep the order they were first seen). Delivered stages have no column, and optional stages
 * only get one while a garment is in them. Delivered and cancelled garments are left out.
 * Garments of a template missing from the map use their own stage list.
 */
export function workBoard(rows: ItemRef[], stagesByTemplate: Readonly<Record<string, readonly Stage[]>>): BoardColumn[] {
  const live = rows.filter((r) => {
    const group = itemSummaryGroup(r.item);
    return group !== 'cancelled' && group !== 'delivered';
  });

  const columns = new Map<string, { stage: Stage; position: number; order: number; refs: ItemRef[] }>();
  const add = (stage: Stage, position: number) => {
    if (stage.group === 'delivered') return;
    const known = columns.get(stage.key);
    if (known) known.position = Math.min(known.position, position);
    else columns.set(stage.key, { stage, position, order: columns.size, refs: [] });
  };

  for (const list of Object.values(stagesByTemplate)) list.forEach((stage, index) => add(stage, index));
  for (const { item } of live) {
    if (!stagesByTemplate[item.templateId]) item.stages.forEach((stage, index) => add(stage, index));
    const index = item.stages.findIndex((s) => s.key === item.stageKey);
    if (index >= 0) add(item.stages[index]!, index);
  }

  for (const ref of live) columns.get(ref.item.stageKey)?.refs.push(ref);

  return [...columns.values()]
    .filter((c) => !c.stage.optional || c.refs.length > 0)
    .sort((a, b) => GROUP_RANK[a.stage.group] - GROUP_RANK[b.stage.group] || a.position - b.position || a.order - b.order)
    .map(({ stage, refs }) => ({ key: stage.key, stage, refs }));
}
