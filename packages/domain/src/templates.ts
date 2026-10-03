import type { Label } from './label';
import type { MeasurementField, Unit } from './measurements';
import { isPoisha, type Poisha } from './money';
import { validateStages, type Stage } from './stages';

export interface GarmentTemplate {
  id: string;
  name: Label;
  defaultPrice: Poisha;
  fields: MeasurementField[];
  stages: Stage[];
  active: boolean;
}

/** Returns a list of problems with a template; empty means valid. */
export function validateTemplate(template: GarmentTemplate): string[] {
  const errors: string[] = [];
  if (!template.id.trim()) errors.push('empty-id');
  if (!template.name.bn.trim() && !template.name.en.trim()) errors.push('empty-name');
  if (!isPoisha(template.defaultPrice) || template.defaultPrice < 0) errors.push('invalid-price');

  const keys = new Set<string>();
  for (const field of template.fields) {
    if (!field.key.trim()) errors.push('empty-field-key');
    if (keys.has(field.key)) errors.push(`duplicate-field:${field.key}`);
    keys.add(field.key);
  }

  return [...errors, ...validateStages(template.stages)];
}

const field = (
  key: string,
  bn: string,
  en: string,
  group: string,
  required = true,
  unit: Unit = 'inch',
): MeasurementField => ({ key, label: { bn, en }, unit, group, required });

const stage = (key: string, bn: string, en: string, group: Stage['group'], optional = false): Stage => ({
  key,
  label: { bn, en },
  optional,
  group,
});

export const STANDARD_STAGES: Stage[] = [
  stage('booked', 'বুকড', 'Booked', 'unfinished'),
  stage('cutting', 'কাটিং', 'Cutting', 'unfinished'),
  stage('stitching', 'সেলাই', 'Stitching', 'unfinished'),
  stage('trial', 'ট্রায়াল', 'Trial', 'unfinished', true),
  stage('ready', 'রেডি', 'Ready', 'ready'),
  stage('delivered', 'ডেলিভারি হয়েছে', 'Delivered', 'delivered'),
];

export const ALTERATION_STAGES: Stage[] = [
  stage('booked', 'বুকড', 'Booked', 'unfinished'),
  stage('working', 'কাজ চলছে', 'Working', 'unfinished'),
  stage('ready', 'রেডি', 'Ready', 'ready'),
  stage('delivered', 'ডেলিভারি হয়েছে', 'Delivered', 'delivered'),
];

/** Example templates a new shop starts with. Shops can edit or replace all of them. */
export const STARTER_TEMPLATES: GarmentTemplate[] = [
  {
    id: 'shirt',
    name: { bn: 'শার্ট', en: 'Shirt' },
    defaultPrice: 70000,
    fields: [
      field('length', 'ঝুল', 'Length', 'body'),
      field('chest', 'বুক', 'Chest', 'body'),
      field('waist', 'পেট', 'Waist', 'body'),
      field('hip', 'হিপ', 'Hip', 'body', false),
      field('shoulder', 'কাঁধ (পুট)', 'Shoulder', 'body'),
      field('sleeve', 'হাতা', 'Sleeve', 'sleeve'),
      field('cuff', 'হাতার মুহুরি', 'Cuff', 'sleeve', false),
      field('collar', 'গলা', 'Collar', 'neck'),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'pant',
    name: { bn: 'প্যান্ট', en: 'Pant' },
    defaultPrice: 70000,
    fields: [
      field('length', 'ঝুল', 'Length', 'body'),
      field('waist', 'কোমর', 'Waist', 'body'),
      field('hip', 'হিপ', 'Hip', 'body'),
      field('thigh', 'থাই (রান)', 'Thigh', 'leg'),
      field('knee', 'হাঁটু', 'Knee', 'leg', false),
      field('bottom', 'মুহুরি', 'Bottom', 'leg'),
      field('rise', 'ফ্লাই', 'Rise', 'body', false),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'panjabi',
    name: { bn: 'পাঞ্জাবি', en: 'Panjabi' },
    defaultPrice: 100000,
    fields: [
      field('length', 'ঝুল', 'Length', 'body'),
      field('chest', 'বুক', 'Chest', 'body'),
      field('waist', 'পেট', 'Waist', 'body'),
      field('shoulder', 'কাঁধ (পুট)', 'Shoulder', 'body'),
      field('sleeve', 'হাতা', 'Sleeve', 'sleeve'),
      field('cuff', 'হাতার মুহুরি', 'Cuff', 'sleeve', false),
      field('collar', 'গলা', 'Collar', 'neck'),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'salwar-kameez',
    name: { bn: 'সালোয়ার কামিজ', en: 'Salwar kameez' },
    defaultPrice: 120000,
    fields: [
      field('kameez-length', 'কামিজের ঝুল', 'Kameez length', 'kameez'),
      field('chest', 'বুক', 'Chest', 'kameez'),
      field('waist', 'কোমর', 'Waist', 'kameez'),
      field('hip', 'হিপ', 'Hip', 'kameez'),
      field('shoulder', 'কাঁধ', 'Shoulder', 'kameez'),
      field('sleeve', 'হাতা', 'Sleeve', 'kameez'),
      field('armhole', 'আর্মহোল', 'Armhole', 'kameez'),
      field('neck-front', 'সামনের গলা', 'Front neck', 'kameez'),
      field('neck-back', 'পিছনের গলা', 'Back neck', 'kameez', false),
      field('salwar-length', 'সালোয়ারের ঝুল', 'Salwar length', 'salwar'),
      field('salwar-bottom', 'মুহুরি', 'Bottom', 'salwar'),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'blouse',
    name: { bn: 'ব্লাউজ', en: 'Blouse' },
    defaultPrice: 80000,
    fields: [
      field('length', 'ঝুল', 'Length', 'body'),
      field('chest', 'বুক', 'Chest', 'body'),
      field('under-bust', 'বুকের নিচে', 'Under bust', 'body'),
      field('waist', 'কোমর', 'Waist', 'body'),
      field('shoulder', 'কাঁধ', 'Shoulder', 'body'),
      field('sleeve', 'হাতা', 'Sleeve', 'sleeve'),
      field('sleeve-round', 'হাতার ঘের', 'Sleeve round', 'sleeve'),
      field('armhole', 'আর্মহোল', 'Armhole', 'sleeve'),
      field('neck-front', 'সামনের গলা', 'Front neck', 'neck'),
      field('neck-back', 'পিছনের গলা', 'Back neck', 'neck'),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'alteration',
    name: { bn: 'অল্টারেশন', en: 'Alteration' },
    defaultPrice: 20000,
    fields: [],
    stages: ALTERATION_STAGES,
    active: true,
  },
];
