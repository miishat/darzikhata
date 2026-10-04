import { STARTER_TEMPLATES, type MeasurementVersion } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import type { DraftErrors, DraftItem } from '../draft';
import { missingCounts, measureStatus, previousValues } from './measureStatus';

const shirt = STARTER_TEMPLATES.find((t) => t.id === 'shirt')!;
const alteration = STARTER_TEMPLATES.find((t) => t.fields.length === 0)!;
const required = shirt.fields.filter((f) => f.required);

function item(measurements: DraftItem['measurements'], key = 'k1'): DraftItem {
  return {
    key,
    templateId: shirt.id,
    quantity: 1,
    price: null,
    wearer: '',
    measurements,
    designNotes: '',
    fabricNote: '',
    photoIds: [],
    trialDate: '',
    deliveryDate: '',
  };
}
const fresh = (values: Record<string, number>) => item({ kind: 'new', values, source: 'body', notes: '' });

describe('measureStatus', () => {
  it('counts what is filled and what required fields are still missing', () => {
    const first = required[0]!.key;
    expect(measureStatus(shirt, fresh({ [first]: 38 }), null)).toEqual({
      kind: 'missing',
      filled: 1,
      missing: required.length - 1,
    });
  });

  it('is filled once every required field has a value, counting optional ones too', () => {
    const values = Object.fromEntries(shirt.fields.map((f) => [f.key, 10]));
    expect(measureStatus(shirt, fresh(values), null)).toEqual({ kind: 'filled', filled: shirt.fields.length, missing: 0 });
  });

  it('asks for confirmation of saved values until confirmed, then counts the saved ones', () => {
    const version = { values: { chest: { value: 38, unit: 'inch' }, length: { value: 28, unit: 'inch' } } } as unknown as MeasurementVersion;
    expect(measureStatus(shirt, item({ kind: 'saved', versionId: 'v', confirmed: false }), version).kind).toBe('confirm');
    expect(measureStatus(shirt, item({ kind: 'saved', versionId: 'v', confirmed: true }), version)).toEqual({
      kind: 'filled',
      filled: 2,
      missing: 0,
    });
  });

  it('has no status for garments without measurements', () => {
    expect(measureStatus(alteration, item({ kind: 'none' }), null).kind).toBe('none');
  });
});

describe('missingCounts', () => {
  it('counts per-field measurement errors by item and ignores other errors', () => {
    const errors: DraftErrors = {
      'items.k1.measure.chest': 'required',
      'items.k1.measure.length': 'required',
      'items.k1.price': 'required',
      'items.k2.measurements': 'confirm',
    };
    expect(missingCounts(errors, [item({ kind: 'none' }, 'k1'), item({ kind: 'none' }, 'k2')])).toEqual({ k1: 2 });
  });
});

describe('previousValues', () => {
  it('leaves out values saved in another unit than the field now uses', () => {
    const [a, b] = shirt.fields;
    const other = a!.unit === 'cm' ? 'inch' : 'cm';
    const version = {
      values: { [a!.key]: { value: 38, unit: other }, [b!.key]: { value: 30, unit: b!.unit } },
    } as unknown as MeasurementVersion;
    expect(previousValues(shirt, version)).toEqual({ [b!.key]: 30 });
    expect(previousValues(shirt, null)).toEqual({});
  });
});
