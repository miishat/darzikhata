import { formatMeasurement, type Language, type MeasurementField, type MeasurementSnapshot, type MeasurementSource, type MeasurementProfile, type MeasurementValue, type MeasurementVersion, type Order } from '@darzikhata/domain';
import { bn, type MessageKey } from '../../i18n/bn';

export interface FieldGroup {
  group: string;
  fields: MeasurementField[];
}

/** Fields grouped for display, groups in the order they first appear in the template. */
export function fieldGroups(fields: MeasurementField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  for (const field of fields) {
    const existing = groups.find((g) => g.group === field.group);
    if (existing) existing.fields.push(field);
    else groups.push({ group: field.group, fields: [field] });
  }
  return groups;
}

/** The translated name of a field group; shops may invent their own groups, which show as typed. */
export function groupLabel(group: string, t: (key: MessageKey) => string): string {
  const key = `mgroup.${group}`;
  return key in bn ? t(key as MessageKey) : group;
}

export interface ComparedValue {
  key: string;
  current: number | null;
  other: number | null;
  changed: boolean;
}

/**
 * Lines up two sets of values field by field, for showing the current version beside an older
 * version or an order's frozen snapshot. Values saved in a different unit count as changed.
 */
export function compareValues(
  fields: MeasurementField[],
  current: MeasurementVersion | MeasurementSnapshot | null,
  other: MeasurementVersion | MeasurementSnapshot | null,
): ComparedValue[] {
  return fields.map((field) => {
    const a = current?.values[field.key];
    const b = other?.values[field.key];
    return {
      key: field.key,
      current: a?.value ?? null,
      other: b?.value ?? null,
      changed: (a?.value ?? null) !== (b?.value ?? null) || (a !== undefined && b !== undefined && a.unit !== b.unit),
    };
  });
}

/** True when a typed value differs from the customer's previous one; nothing typed or nothing before is not a change. */
export function changedFromPrevious(current: number | null, previous: number | undefined): boolean {
  return current !== null && previous !== undefined && current !== previous;
}

/** The field after this one in the order the tiles are shown (grouped), or null after the last. */
export function nextFieldKey(fields: MeasurementField[], key: string): string | null {
  const ordered = fieldGroups(fields).flatMap((g) => g.fields);
  const at = ordered.findIndex((field) => field.key === key);
  return ordered[at + 1]?.key ?? null;
}

/**
 * How much each field changed against the previous version, by key. Only fields present in both
 * versions with the same unit and a different value are listed.
 */
export function valueDeltas(
  current: Record<string, MeasurementValue>,
  previous: Record<string, MeasurementValue> | undefined,
): Record<string, number> {
  const deltas: Record<string, number> = {};
  if (!previous) return deltas;
  for (const [key, now] of Object.entries(current)) {
    const before = previous[key];
    if (!before || before.unit !== now.unit) continue;
    const delta = Math.round((now.value - before.value) * 1000) / 1000;
    if (delta !== 0) deltas[key] = delta;
  }
  return deltas;
}

/** A signed change for a badge, such as "+½" or "-1¼" (with a true minus sign). */
export function deltaText(delta: number, language: Language): string {
  return `${delta > 0 ? '+' : '−'}${formatMeasurement(Math.abs(delta), language)}`;
}

export type ComparisonKind = 'current' | 'previous' | 'snapshot';

export interface ComparisonColumn {
  kind: ComparisonKind;
  versionId: string;
  takenAt: string;
  source: MeasurementSource;
  /** Staff id of who took the version; null when the version is no longer on the profile. */
  takenBy: string | null;
  /** Only for the snapshot column: the order it was frozen on. */
  orderNumber?: string;
}

export interface ComparisonRow {
  key: string;
  values: Record<ComparisonKind, MeasurementValue | null>;
  /** Current against previous, in the current value's unit; null when there is no change or no honest comparison. */
  delta: number | null;
  /** The two values were saved in different units, so no delta is given. */
  unitsDiffer: boolean;
  /** The order snapshot differs from the current version (in value or unit). */
  snapshotDiffers: boolean;
}

export interface Comparison {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

/**
 * The current version, the previous one and the frozen copy on the customer's most recent order
 * for this garment, field by field. The delta is current against previous only, and is left out
 * when the two were saved in different units (they are not compared, never converted by guess).
 */
export function comparisonColumns(profile: MeasurementProfile, orders: Order[], fields: MeasurementField[]): Comparison {
  const versions = profile.versions;
  const current = versions.at(-1);
  if (!current) return { columns: [], rows: [] };
  const previous = versions.length > 1 ? versions.at(-2)! : null;

  let snapshot: (MeasurementSnapshot & { orderNumber: string }) | null = null;
  let newest = '';
  for (const order of orders) {
    if (order.createdAt <= newest) continue;
    const item = order.items.find((i) => i.templateId === profile.templateId && i.cancelled === null && i.measurements !== null);
    if (!item) continue;
    newest = order.createdAt;
    snapshot = { ...item.measurements!, orderNumber: order.number };
  }

  const columns: ComparisonColumn[] = [
    { kind: 'current', versionId: current.id, takenAt: current.takenAt, source: current.source, takenBy: current.takenBy },
  ];
  if (previous) columns.push({ kind: 'previous', versionId: previous.id, takenAt: previous.takenAt, source: previous.source, takenBy: previous.takenBy });
  if (snapshot) {
    const from = versions.find((v) => v.id === snapshot!.versionId);
    columns.push({
      kind: 'snapshot',
      versionId: snapshot.versionId,
      takenAt: snapshot.takenAt,
      source: snapshot.source,
      takenBy: from?.takenBy ?? null,
      orderNumber: snapshot.orderNumber,
    });
  }

  const rows = fields.map((field): ComparisonRow => {
    const now = current.values[field.key] ?? null;
    const before = previous?.values[field.key] ?? null;
    const frozen = snapshot?.values[field.key] ?? null;
    const unitsDiffer = now !== null && before !== null && now.unit !== before.unit;
    const delta =
      now !== null && before !== null && !unitsDiffer ? Math.round((now.value - before.value) * 1000) / 1000 : 0;
    return {
      key: field.key,
      values: { current: now, previous: before, snapshot: frozen },
      delta: delta === 0 ? null : delta,
      unitsDiffer,
      snapshotDiffers: snapshot !== null && (now?.value !== frozen?.value || now?.unit !== frozen?.unit),
    };
  });
  return { columns, rows };
}
