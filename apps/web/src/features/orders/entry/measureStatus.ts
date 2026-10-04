import type { GarmentTemplate, MeasurementVersion } from '@darzikhata/domain';
import type { DraftErrors, DraftItem } from '../draft';

export interface MeasureStatus {
  /** none: nothing to measure; confirm: saved values wait for a tick; missing: required fields empty; filled: all there. */
  kind: 'none' | 'confirm' | 'missing' | 'filled';
  filled: number;
  missing: number;
}

/** How far one line's measurements are, using the same rule as the draft's validation. */
export function measureStatus(template: GarmentTemplate, item: DraftItem, saved: MeasurementVersion | null): MeasureStatus {
  const m = item.measurements;
  if (template.fields.length === 0 || m.kind === 'none') return { kind: 'none', filled: 0, missing: 0 };
  if (m.kind === 'saved') {
    if (!m.confirmed) return { kind: 'confirm', filled: 0, missing: 0 };
    return { kind: 'filled', filled: Object.keys(saved?.values ?? {}).length, missing: 0 };
  }
  const filled = template.fields.filter((f) => m.values[f.key] !== undefined).length;
  const missing = template.fields.filter((f) => f.required && m.values[f.key] === undefined).length;
  return { kind: missing > 0 ? 'missing' : 'filled', filled, missing };
}

/** How many required measurements the draft's errors flag for each line; lines with none are left out. */
export function missingCounts(errors: DraftErrors, items: DraftItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const prefix = `items.${item.key}.measure.`;
    const n = Object.keys(errors).filter((path) => path.startsWith(prefix)).length;
    if (n > 0) counts[item.key] = n;
  }
  return counts;
}

/** The previous version's numbers for fields whose unit is unchanged; a value in another unit is not comparable. */
export function previousValues(template: GarmentTemplate, version: MeasurementVersion | null): Record<string, number> {
  const previous: Record<string, number> = {};
  for (const field of template.fields) {
    const v = version?.values[field.key];
    if (v && v.unit === field.unit) previous[field.key] = v.value;
  }
  return previous;
}
