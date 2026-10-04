import { STARTER_TEMPLATES, type MeasurementField, type MeasurementProfile, type MeasurementValue, type Order } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { changedFromPrevious, compareValues, comparisonColumns, deltaText, fieldGroups, nextFieldKey, valueDeltas } from './measurementView';

const shirt = STARTER_TEMPLATES.find((t) => t.id === 'shirt')!;

describe('fieldGroups', () => {
  it('groups fields in the order groups first appear', () => {
    expect(fieldGroups(shirt.fields).map((g) => [g.group, g.fields.map((f) => f.key)])).toEqual([
      ['body', ['length', 'chest', 'waist', 'hip', 'shoulder']],
      ['sleeve', ['sleeve', 'cuff']],
      ['neck', ['collar']],
    ]);
  });
});

describe('compareValues', () => {
  it('marks fields whose value or unit differs', () => {
    const fields = shirt.fields.slice(0, 3);
    const current = { versionId: 'v2', takenAt: '', source: 'body' as const, values: { length: { value: 29, unit: 'inch' as const }, chest: { value: 39, unit: 'inch' as const } } };
    const older = { versionId: 'v1', takenAt: '', source: 'body' as const, values: { length: { value: 29, unit: 'cm' as const }, chest: { value: 38, unit: 'inch' as const }, waist: { value: 34, unit: 'inch' as const } } };
    expect(compareValues(fields, current, older)).toEqual([
      { key: 'length', current: 29, other: 29, changed: true },
      { key: 'chest', current: 39, other: 38, changed: true },
      { key: 'waist', current: null, other: 34, changed: true },
    ]);
    expect(compareValues(fields, current, current).every((c) => !c.changed)).toBe(true);
    expect(compareValues(fields, null, null).map((c) => c.current)).toEqual([null, null, null]);
  });
});

describe('tile helpers', () => {
  it('flags a value that differs from the previous one', () => {
    expect(changedFromPrevious(38.25, 38)).toBe(true);
    expect(changedFromPrevious(38, 38)).toBe(false);
    expect(changedFromPrevious(null, 38)).toBe(false);
    expect(changedFromPrevious(38, undefined)).toBe(false);
  });

  it('finds the next field in the order the tiles show, and none after the last', () => {
    const f = (key: string, group: string) => ({ key, group }) as MeasurementField;
    const fields = [f('a', 'x'), f('b', 'y'), f('c', 'x')];
    expect(nextFieldKey(fields, 'a')).toBe('c');
    expect(nextFieldKey(fields, 'c')).toBe('b');
    expect(nextFieldKey(fields, 'b')).toBeNull();
  });
});

describe('valueDeltas', () => {
  const v = (value: number, unit: 'inch' | 'cm' = 'inch') => ({ value, unit });
  it('gives the numeric change of each field against the previous version', () => {
    const current = { chest: v(36.75), waist: v(34.5), hip: v(38.25), neck: v(15), sleeve: v(22.75) };
    const previous = { chest: v(36.25), waist: v(33.75), hip: v(38.25), neck: v(15.5) };
    expect(valueDeltas(current, previous)).toEqual({ chest: 0.5, waist: 0.75, neck: -0.5 });
  });
  it('shows nothing without a previous version, a new field or a unit change', () => {
    expect(valueDeltas({ chest: v(36) }, undefined)).toEqual({});
    expect(valueDeltas({ chest: v(36) }, { waist: v(30) })).toEqual({});
    expect(valueDeltas({ chest: v(36, 'cm') }, { chest: v(14, 'inch') })).toEqual({});
  });
  it('writes a signed badge with fractions', () => {
    expect(deltaText(0.5, 'bn')).toBe('+½');
    expect(deltaText(0.75, 'en')).toBe('+¾');
    expect(deltaText(-1.25, 'bn')).toBe('−১¼');
  });
});

describe('comparisonColumns', () => {
  const inch = (value: number): MeasurementValue => ({ value, unit: 'inch' });
  const version = (id: string, takenAt: string, values: Record<string, MeasurementValue>, takenBy = 'staff-a') => ({
    id,
    takenAt,
    takenBy,
    source: 'body' as const,
    notes: '',
    values,
  });
  const profile = (versions: MeasurementProfile['versions']): MeasurementProfile => ({ customerId: 'c1', templateId: 'shirt', versions });
  const order = (id: string, number: string, createdAt: string, versionId: string, values: Record<string, MeasurementValue>, templateId = 'shirt') =>
    ({
      id,
      number,
      createdAt,
      customerId: 'c1',
      items: [{ id: `${id}-i`, templateId, cancelled: null, measurements: { versionId, takenAt: createdAt, source: 'sample', values } }],
    }) as unknown as Order;
  const fields = shirt.fields.slice(0, 3);

  it('has only the current column for a first version and no deltas', () => {
    const result = comparisonColumns(profile([version('v1', '2026-01-01', { length: inch(29), chest: inch(38) })]), [], fields);
    expect(result.columns.map((c) => c.kind)).toEqual(['current']);
    expect(result.columns[0]).toMatchObject({ versionId: 'v1', takenAt: '2026-01-01', source: 'body', takenBy: 'staff-a' });
    expect(result.rows.map((r) => [r.key, r.delta])).toEqual([['length', null], ['chest', null], ['waist', null]]);
    expect(result.rows[0]!.values.current).toEqual(inch(29));
    expect(result.rows[2]!.values.current).toBeNull();
  });

  it('adds the previous version and the delta of current against it', () => {
    const p = profile([
      version('v1', '2026-01-01', { length: inch(29), chest: inch(38) }, 'staff-b'),
      version('v2', '2026-03-01', { length: inch(29), chest: inch(39.25) }),
    ]);
    const result = comparisonColumns(p, [], fields);
    expect(result.columns.map((c) => c.kind)).toEqual(['current', 'previous']);
    expect(result.columns[1]).toMatchObject({ versionId: 'v1', takenBy: 'staff-b' });
    expect(result.rows.map((r) => r.delta)).toEqual([null, 1.25, null]);
    expect(result.rows[1]!.values.previous).toEqual(inch(38));
  });

  it('takes the snapshot from the most recent order using the template, with the version it came from', () => {
    const p = profile([
      version('v1', '2026-01-01', { chest: inch(38) }, 'staff-b'),
      version('v2', '2026-03-01', { chest: inch(39) }),
    ]);
    const orders = [
      order('o1', 'R-0001', '2026-01-02', 'v1', { chest: inch(38) }),
      order('o2', 'R-0002', '2026-02-02', 'v1', { chest: inch(38.5) }),
      order('o3', 'R-0003', '2026-03-05', 'v2', { chest: inch(39) }, 'trouser'),
    ];
    const result = comparisonColumns(p, orders, fields);
    expect(result.columns.map((c) => c.kind)).toEqual(['current', 'previous', 'snapshot']);
    expect(result.columns[2]).toMatchObject({ orderNumber: 'R-0002', versionId: 'v1', takenBy: 'staff-b', source: 'sample' });
    expect(result.rows[1]!.values.snapshot).toEqual(inch(38.5));
  });

  it('treats a field added to the template later as having no earlier value and no delta', () => {
    const p = profile([
      version('v1', '2026-01-01', { length: inch(29) }),
      version('v2', '2026-03-01', { length: inch(30), waist: inch(34) }),
    ]);
    const result = comparisonColumns(p, [], fields);
    const waist = result.rows.find((r) => r.key === 'waist')!;
    expect(waist.values.previous).toBeNull();
    expect(waist.delta).toBeNull();
    expect(result.rows.find((r) => r.key === 'length')!.delta).toBe(1);
  });

  it('shows no difference for a snapshot equal to the current version', () => {
    const values = { length: inch(29), chest: inch(39) };
    const p = profile([version('v1', '2026-01-01', { length: inch(29), chest: inch(38) }), version('v2', '2026-03-01', values)]);
    const result = comparisonColumns(p, [order('o1', 'R-0001', '2026-03-02', 'v2', values)], fields);
    expect(result.rows.every((r) => !r.snapshotDiffers)).toBe(true);
    const other = comparisonColumns(p, [order('o1', 'R-0001', '2026-03-02', 'v1', { length: inch(29), chest: inch(38) })], fields);
    expect(other.rows.map((r) => r.snapshotDiffers)).toEqual([false, true, false]);
  });

  it('does not compare values saved in different units', () => {
    const p = profile([
      version('v1', '2026-01-01', { chest: inch(38) }),
      version('v2', '2026-03-01', { chest: { value: 99, unit: 'cm' } }),
    ]);
    const chest = comparisonColumns(p, [], fields).rows.find((r) => r.key === 'chest')!;
    expect(chest.delta).toBeNull();
    expect(chest.unitsDiffer).toBe(true);
  });
});
