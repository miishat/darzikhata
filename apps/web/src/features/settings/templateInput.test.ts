import { STANDARD_STAGES, STARTER_TEMPLATES, type GarmentTemplate } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { slugKey } from './keys';
import { addField, addStage, moveRow, newTemplateForm, readTemplate, removeRow, templateForm, type TemplateForm } from './templateInput';

const shirt = STARTER_TEMPLATES.find((t) => t.id === 'shirt')!;

function read(form: TemplateForm, existing: GarmentTemplate[] = STARTER_TEMPLATES): GarmentTemplate {
  const result = readTemplate(form, existing);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.template;
}

const errorsOf = (form: TemplateForm) => {
  const result = readTemplate(form, STARTER_TEMPLATES);
  return result.ok ? {} : result.errors;
};

const withField = (form: TemplateForm, labelBn: string, labelEn: string): TemplateForm => {
  const next = addField(form);
  const index = next.fields.length - 1;
  return { ...next, fields: next.fields.map((f, i) => (i === index ? { ...f, labelBn, labelEn } : f)) };
};

describe('slugKey', () => {
  it('makes a key from an English name, falls back, and avoids keys in use', () => {
    expect(slugKey('Back neck', [], 'field-1')).toBe('back-neck');
    expect(slugKey('  Chest!! ', ['chest', 'chest-2'], 'x')).toBe('chest-3');
    expect(slugKey('', [], 'field-9')).toBe('field-9');
  });
});

describe('templateForm and readTemplate', () => {
  it('gives back the same template when nothing is changed', () => {
    expect(read(templateForm(shirt))).toEqual(shirt);
  });

  it('keys a new field from its English name, or by position, and fills a missing language', () => {
    let form = withField(templateForm(shirt), 'বুক', 'Chest');
    form = withField(form, 'পিঠ', '');
    const fields = read(form).fields;
    expect(fields.slice(-2)).toEqual([
      { key: 'chest-2', label: { bn: 'বুক', en: 'Chest' }, unit: 'inch', group: 'body', required: true },
      { key: 'field-10', label: { bn: 'পিঠ', en: 'পিঠ' }, unit: 'inch', group: 'body', required: true },
    ]);
  });

  it('keeps saved fields, which earlier measurements use, and lets new ones go', () => {
    const form = templateForm(shirt);
    expect(removeRow(form, 'fields', 0)).toBe(form);
    const added = addField(form);
    expect(removeRow(added, 'fields', added.fields.length - 1).fields).toHaveLength(shirt.fields.length);
  });

  it('reorders fields and stages, ignoring moves past either end', () => {
    const form = templateForm(shirt);
    expect(moveRow(form, 'fields', 1, -1).fields.slice(0, 2).map((f) => f.key)).toEqual(['chest', 'length']);
    expect(moveRow(form, 'fields', 0, -1)).toBe(form);
    expect(moveRow(form, 'stages', 5, 1)).toBe(form);
  });

  it('adds a new stage before the ready stage and keys it from its English name', () => {
    const form = addStage(templateForm(shirt));
    expect(form.stages.map((s) => s.key)).toEqual(['booked', 'cutting', 'stitching', 'trial', '', 'ready', 'delivered']);
    const named = { ...form, stages: form.stages.map((s) => (s.key ? s : { ...s, labelBn: 'বোতাম', labelEn: 'Buttons' })) };
    expect(read(named).stages[4]).toEqual({ key: 'buttons', label: { bn: 'বোতাম', en: 'Buttons' }, optional: false, group: 'unfinished' });
  });

  it('explains stage lists that would break garment tracking', () => {
    const form = templateForm(shirt);
    const without = (key: string) => ({ ...form, stages: form.stages.filter((s) => s.key !== key) });
    expect(errorsOf(without('ready')).stages).toBe('settings.stages.error.ready');
    expect(errorsOf(without('delivered')).stages).toBe('settings.stages.error.delivered');
    expect(errorsOf({ ...form, stages: [] }).stages).toBe('settings.stages.error.none');
    expect(errorsOf({ ...form, stages: form.stages.map((s, i) => (i === 0 ? { ...s, optional: true } : s)) }).stages).toBe(
      'settings.stages.error.first',
    );
    expect(errorsOf(moveRow(form, 'stages', 4, -1)).stages).toBe('settings.stages.error.order');
    expect(errorsOf(removeRow(form, 'stages', 3)).stages).toBeUndefined();
  });

  it('points at missing names and an unreadable price', () => {
    const form = templateForm(shirt);
    const blank = {
      ...form,
      nameBn: ' ',
      nameEn: '',
      price: null,
      fields: form.fields.map((f, i) => (i === 2 ? { ...f, labelBn: '', labelEn: '' } : f)),
      stages: form.stages.map((s, i) => (i === 1 ? { ...s, labelBn: '', labelEn: ' ' } : s)),
    };
    expect(errorsOf(blank)).toEqual({
      nameBn: 'settings.template.error.name',
      price: 'input.invalidMoney',
      'fields.2.label': 'settings.template.error.label',
      'stages.1.label': 'settings.template.error.label',
    });
  });

  it('starts a new garment with the standard stages and gives it an unused id', () => {
    const form = newTemplateForm();
    expect(form.stages.map((s) => s.key)).toEqual(STANDARD_STAGES.map((s) => s.key));
    const coat = read({ ...form, nameBn: 'শার্ট', nameEn: 'Shirt', price: 250000 });
    expect(coat).toMatchObject({ id: 'shirt-2', name: { bn: 'শার্ট', en: 'Shirt' }, defaultPrice: 250000, active: true, fields: [] });
    expect(coat.stages).toEqual(STANDARD_STAGES);
    expect(read({ ...form, nameBn: 'কোট', price: 0 }).id).toBe('template');
  });
});
