import { STARTER_TEMPLATES, type MeasurementField } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { changedFromPrevious, compareValues, deltaText, fieldGroups, nextFieldKey, valueDeltas } from './measurementView';

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
