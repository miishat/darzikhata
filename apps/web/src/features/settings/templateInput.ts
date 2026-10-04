import {
  STANDARD_STAGES,
  validateStages,
  type GarmentTemplate,
  type Label,
  type MeasurementField,
  type Poisha,
  type Stage,
  type StageGroup,
  type Unit,
} from '@darzikhata/domain';
import type { MessageKey } from '../../i18n/bn';
import { slugKey } from './keys';

export interface FieldRow {
  /** Stable id for the screen's list keys. */
  rowId: string;
  /** Empty for a field added in this editor; it gets a key when saved. Saved keys never change. */
  key: string;
  /** Saved fields cannot be removed: earlier measurements keep their values under this key. */
  saved: boolean;
  labelBn: string;
  labelEn: string;
  unit: Unit;
  group: string;
  required: boolean;
}

export interface StageRow {
  rowId: string;
  /** Empty for a stage added in this editor. */
  key: string;
  labelBn: string;
  labelEn: string;
  group: StageGroup;
  optional: boolean;
}

export interface TemplateForm {
  /** Empty for a new template. */
  id: string;
  nameBn: string;
  nameEn: string;
  /** Null when empty or unreadable. */
  price: Poisha | null;
  active: boolean;
  fields: FieldRow[];
  stages: StageRow[];
  /** Counter for row ids of rows added in this editor. */
  nextRow: number;
}

/** Field groups offered in the editor; their names come from the mgroup.* messages. */
export const FIELD_GROUPS = ['body', 'sleeve', 'neck', 'leg', 'kameez', 'salwar', 'blouse', 'skirt'] as const;

const stageRow = (stage: Stage): StageRow => ({
  rowId: stage.key,
  key: stage.key,
  labelBn: stage.label.bn,
  labelEn: stage.label.en,
  group: stage.group,
  optional: stage.optional,
});

export function templateForm(template: GarmentTemplate): TemplateForm {
  return {
    id: template.id,
    nameBn: template.name.bn,
    nameEn: template.name.en,
    price: template.defaultPrice,
    active: template.active,
    fields: template.fields.map((f) => ({
      rowId: f.key,
      key: f.key,
      saved: true,
      labelBn: f.label.bn,
      labelEn: f.label.en,
      unit: f.unit,
      group: f.group,
      required: f.required,
    })),
    stages: template.stages.map(stageRow),
    nextRow: 1,
  };
}

/** A new garment starts with the standard stages and no measurement fields. */
export function newTemplateForm(): TemplateForm {
  return { id: '', nameBn: '', nameEn: '', price: null, active: true, fields: [], stages: STANDARD_STAGES.map(stageRow), nextRow: 1 };
}

export function addField(form: TemplateForm): TemplateForm {
  const row: FieldRow = {
    rowId: `new-${form.nextRow}`,
    key: '',
    saved: false,
    labelBn: '',
    labelEn: '',
    unit: 'inch',
    group: 'body',
    required: true,
  };
  return { ...form, fields: [...form.fields, row], nextRow: form.nextRow + 1 };
}

/** Adds a required in-progress stage just before the first ready stage. */
export function addStage(form: TemplateForm): TemplateForm {
  const row: StageRow = { rowId: `new-${form.nextRow}`, key: '', labelBn: '', labelEn: '', group: 'unfinished', optional: false };
  const ready = form.stages.findIndex((s) => s.group !== 'unfinished');
  const at = ready < 0 ? form.stages.length : ready;
  return { ...form, stages: [...form.stages.slice(0, at), row, ...form.stages.slice(at)], nextRow: form.nextRow + 1 };
}

type ListName = 'fields' | 'stages';

/**
 * Removes a row. Saved fields stay (return the same form); stages can always go, because
 * every garment already ordered keeps its own copy of its stages.
 */
export function removeRow(form: TemplateForm, list: ListName, index: number): TemplateForm {
  if (list === 'fields') {
    if (form.fields[index]?.saved !== false) return form;
    return { ...form, fields: form.fields.filter((_, i) => i !== index) };
  }
  if (!form.stages[index]) return form;
  return { ...form, stages: form.stages.filter((_, i) => i !== index) };
}

function swap<T>(rows: T[], index: number, direction: -1 | 1): T[] | null {
  const other = index + direction;
  if (index < 0 || index >= rows.length || other < 0 || other >= rows.length) return null;
  const next = [...rows];
  [next[index], next[other]] = [next[other]!, next[index]!];
  return next;
}

export function moveRow(form: TemplateForm, list: ListName, index: number, direction: -1 | 1): TemplateForm {
  if (list === 'fields') {
    const fields = swap(form.fields, index, direction);
    return fields ? { ...form, fields } : form;
  }
  const stages = swap(form.stages, index, direction);
  return stages ? { ...form, stages } : form;
}

/** Keyed by the form path, e.g. 'nameBn', 'price', 'fields.2.label', 'stages', 'stages.1.label'. */
export type TemplateErrors = Record<string, MessageKey>;

export type TemplateResult = { ok: true; template: GarmentTemplate } | { ok: false; errors: TemplateErrors };

/** Fills a missing language from the other, so a name always shows in both. */
const label = (bn: string, en: string): Label => {
  const b = bn.trim();
  const e = en.trim();
  return { bn: b || e, en: e || b };
};

const STAGE_RULES: Array<[codes: string[], message: MessageKey]> = [
  [['no-stages'], 'settings.stages.error.none'],
  [['first-not-unfinished', 'first-optional'], 'settings.stages.error.first'],
  [['last-not-delivered', 'multiple-delivered'], 'settings.stages.error.delivered'],
  [['no-required-ready'], 'settings.stages.error.ready'],
  [['groups-out-of-order'], 'settings.stages.error.order'],
];

/**
 * Checks the editor and builds the template. Saved keys are kept; new fields and stages get
 * keys from their English names (or field-N / stage-N), never clashing with keys in use.
 */
export function readTemplate(form: TemplateForm, existing: GarmentTemplate[]): TemplateResult {
  const errors: TemplateErrors = {};
  if (!form.nameBn.trim() && !form.nameEn.trim()) errors.nameBn = 'settings.template.error.name';
  if (form.price === null || form.price < 0) errors.price = 'input.invalidMoney';

  const fieldKeys = form.fields.filter((f) => f.key).map((f) => f.key);
  const fields: MeasurementField[] = form.fields.map((row, i) => {
    if (!row.labelBn.trim() && !row.labelEn.trim()) errors[`fields.${i}.label`] = 'settings.template.error.label';
    let key = row.key;
    if (!key) {
      key = slugKey(row.labelEn, fieldKeys, `field-${i + 1}`);
      fieldKeys.push(key);
    }
    return { key, label: label(row.labelBn, row.labelEn), unit: row.unit, group: row.group, required: row.required };
  });

  const stageKeys = form.stages.filter((s) => s.key).map((s) => s.key);
  const stages: Stage[] = form.stages.map((row, i) => {
    if (!row.labelBn.trim() && !row.labelEn.trim()) errors[`stages.${i}.label`] = 'settings.template.error.label';
    let key = row.key;
    if (!key) {
      key = slugKey(row.labelEn, stageKeys, `stage-${i + 1}`);
      stageKeys.push(key);
    }
    return { key, label: label(row.labelBn, row.labelEn), optional: row.optional, group: row.group };
  });
  const problems = validateStages(stages);
  const rule = STAGE_RULES.find(([codes]) => codes.some((code) => problems.includes(code)));
  if (rule) errors.stages = rule[1];

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const id = form.id || slugKey(form.nameEn, existing.map((t) => t.id), 'template');
  return {
    ok: true,
    template: { id, name: label(form.nameBn, form.nameEn), defaultPrice: form.price!, fields, stages, active: form.active },
  };
}
