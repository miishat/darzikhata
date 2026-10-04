import { formatMeasurement, type Language, type MeasurementField, type MeasurementSnapshot, type MeasurementValue, type MeasurementVersion } from '@darzikhata/domain';
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
