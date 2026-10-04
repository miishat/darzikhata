import { STARTER_TEMPLATES, type MeasurementField } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { changedFromPrevious, compareValues, fieldGroups, nextFieldKey } from './measurementView';

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
