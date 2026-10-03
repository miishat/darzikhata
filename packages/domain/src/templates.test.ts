import { describe, expect, it } from 'vitest';
import { STARTER_TEMPLATES, validateTemplate, type GarmentTemplate } from './templates';

const shirt = STARTER_TEMPLATES.find((t) => t.id === 'shirt')!;

describe('starter templates', () => {
  it('are all valid', () => {
    for (const template of STARTER_TEMPLATES) {
      expect(validateTemplate(template), template.id).toEqual([]);
    }
  });

  it('price two shirts and a panjabi at ৳2,400, matching the spec example', () => {
    const panjabi = STARTER_TEMPLATES.find((t) => t.id === 'panjabi')!;
    expect(shirt.defaultPrice * 2 + panjabi.defaultPrice).toBe(240000);
  });
});

describe('validateTemplate', () => {
  it('reports template problems', () => {
    const broken: GarmentTemplate = {
      ...shirt,
      id: ' ',
      name: { bn: '', en: '' },
      defaultPrice: 10.5,
      fields: [shirt.fields[0]!, shirt.fields[0]!],
    };
    expect(validateTemplate(broken)).toEqual(['empty-id', 'empty-name', 'invalid-price', 'duplicate-field:length']);
  });

  it('includes stage problems', () => {
    expect(validateTemplate({ ...shirt, stages: [] })).toEqual(['no-stages']);
  });
});
