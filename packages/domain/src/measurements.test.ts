import { describe, expect, it } from 'vitest';
import {
  currentVersion,
  formatMeasurement,
  missingRequiredFields,
  parseMeasurement,
  profileKey,
  snapshotOf,
  type MeasurementField,
  type MeasurementVersion,
} from './measurements';

const version = (id: string, chest: number): MeasurementVersion => ({
  id,
  takenAt: '2026-10-03T04:00:00.000Z',
  takenBy: 'staff-owner',
  source: 'body',
  notes: '',
  values: { chest: { value: chest, unit: 'inch' } },
});

describe('parseMeasurement', () => {
  it('parses whole numbers and decimals in either script', () => {
    expect(parseMeasurement('38')).toBe(38);
    expect(parseMeasurement('৩৮')).toBe(38);
    expect(parseMeasurement('38.5')).toBe(38.5);
    expect(parseMeasurement('৩৮.৫')).toBe(38.5);
  });

  it('parses unicode fractions', () => {
    expect(parseMeasurement('৩৮½')).toBe(38.5);
    expect(parseMeasurement('15¼')).toBe(15.25);
    expect(parseMeasurement('15 ¾')).toBe(15.75);
    expect(parseMeasurement('½')).toBe(0.5);
  });

  it('parses typed fractions', () => {
    expect(parseMeasurement('38 1/2')).toBe(38.5);
    expect(parseMeasurement('38-1/4')).toBe(38.25);
    expect(parseMeasurement('৩৮ ১/২')).toBe(38.5);
    expect(parseMeasurement('3/8')).toBe(0.375);
  });

  it('rejects invalid, zero and negative input', () => {
    expect(parseMeasurement('')).toBeNull();
    expect(parseMeasurement('abc')).toBeNull();
    expect(parseMeasurement('0')).toBeNull();
    expect(parseMeasurement('-3')).toBeNull();
    expect(parseMeasurement('1/0')).toBeNull();
    expect(parseMeasurement('1/2½')).toBeNull();
  });
});

describe('formatMeasurement', () => {
  it('writes Bangla as a decimal, since Bangla fonts have no fraction glyphs', () => {
    expect(formatMeasurement(38.5)).toBe('৩৮.৫');
    expect(formatMeasurement(0.75, 'bn')).toBe('০.৭৫');
    expect(formatMeasurement(15.125, 'bn')).toBe('১৫.১২৫');
    expect(formatMeasurement(40, 'bn')).toBe('৪০');
    expect(formatMeasurement(10.333, 'bn')).toBe('১০.৩৩');
  });

  it('uses unicode fractions for eighths in English', () => {
    expect(formatMeasurement(15.25, 'en')).toBe('15¼');
    expect(formatMeasurement(0.375, 'en')).toBe('⅜');
    expect(formatMeasurement(40, 'en')).toBe('40');
  });

  it('falls back to two decimals otherwise', () => {
    expect(formatMeasurement(96.52, 'en')).toBe('96.52');
    expect(formatMeasurement(10.333, 'en')).toBe('10.33');
  });
});

describe('profiles and snapshots', () => {
  it('builds a stable profile key', () => {
    expect(profileKey('c1', 'shirt')).toBe('c1:shirt');
  });

  it('returns the latest version as current', () => {
    const profile = { customerId: 'c1', templateId: 'shirt', versions: [version('v1', 38), version('v2', 40)] };
    expect(currentVersion(profile)?.id).toBe('v2');
    expect(currentVersion({ ...profile, versions: [] })).toBeNull();
  });

  it('lists missing required fields', () => {
    const fields: MeasurementField[] = [
      { key: 'chest', label: { bn: 'বুক', en: 'Chest' }, unit: 'inch', group: 'body', required: true },
      { key: 'length', label: { bn: 'ঝুল', en: 'Length' }, unit: 'inch', group: 'body', required: true },
      { key: 'cuff', label: { bn: 'মুহুরি', en: 'Cuff' }, unit: 'inch', group: 'sleeve', required: false },
    ];
    expect(missingRequiredFields(fields, { chest: { value: 38, unit: 'inch' } })).toEqual(['length']);
  });

  it('snapshots are independent copies of the version', () => {
    const v = version('v1', 38);
    const snap = snapshotOf(v);
    v.values.chest!.value = 44;
    expect(snap.values.chest).toEqual({ value: 38, unit: 'inch' });
    expect(snap.versionId).toBe('v1');
    expect(snap.source).toBe('body');
  });
});
