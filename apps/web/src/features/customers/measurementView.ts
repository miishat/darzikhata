import type { MeasurementField, MeasurementSnapshot, MeasurementVersion } from '@darzikhata/domain';
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
