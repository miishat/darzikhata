import {
  DEFAULT_ROLES,
  STANDARD_STAGES,
  STARTER_TEMPLATES,
  type GarmentTemplate,
  type Label,
  type MeasurementField,
  type Role,
  type ShopConfig,
  type Stage,
} from '@darzikhata/domain';

export type SeedShopKey = 'rahman' | 'nakshi' | 'uniform';

export interface SeedShopInfo {
  key: SeedShopKey;
  name: Label;
  summary: Label;
}

export const SEED_SHOPS: SeedShopInfo[] = [
  {
    key: 'rahman',
    name: { bn: 'রহমান টেইলার্স', en: 'Rahman Tailors' },
    summary: { bn: 'একা দর্জি, ছেলেদের শার্ট-প্যান্ট-পাঞ্জাবি', en: 'Solo men’s tailor: shirt, pant, panjabi' },
  },
  {
    key: 'nakshi',
    name: { bn: 'নকশী বুটিক', en: 'Nakshi Boutique' },
    summary: { bn: 'মেয়েদের পোশাক, ৪ জন স্টাফ, ট্রায়াল ও মান যাচাই', en: 'Women’s wear, 4 staff, trial and quality check' },
  },
  {
    key: 'uniform',
    name: { bn: 'ইউনিফর্ম হাউস', en: 'Uniform House' },
    summary: { bn: 'দোকান আর কারখানা, স্কুলের গ্রুপ অর্ডার', en: 'Shop and workshop, school group order' },
  },
];

const starter = (id: string): GarmentTemplate => STARTER_TEMPLATES.find((t) => t.id === id)!;

const field = (key: string, bn: string, en: string, group: string, required = true): MeasurementField => ({
  key,
  label: { bn, en },
  unit: 'inch',
  group,
  required,
});

const stage = (key: string, bn: string, en: string, group: Stage['group'], optional = false): Stage => ({
  key,
  label: { bn, en },
  optional,
  group,
});

const BRIDAL_STAGES: Stage[] = [
  stage('booked', 'বুকড', 'Booked', 'unfinished'),
  stage('cutting', 'কাটিং', 'Cutting', 'unfinished'),
  stage('embroidery', 'এমব্রয়ডারি', 'Embroidery', 'unfinished'),
  stage('stitching', 'সেলাই', 'Stitching', 'unfinished'),
  stage('trial', 'ট্রায়াল', 'Trial', 'unfinished', true),
  stage('qc', 'মান যাচাই', 'Quality check', 'unfinished', true),
  stage('ready', 'রেডি', 'Ready', 'ready'),
  stage('delivered', 'ডেলিভারি হয়েছে', 'Delivered', 'delivered'),
];

const BRIDAL_LEHENGA: GarmentTemplate = {
  id: 'bridal-lehenga',
  name: { bn: 'ব্রাইডাল লেহেঙ্গা', en: 'Bridal lehenga' },
  defaultPrice: 1500000,
  fields: [
    field('length', 'ব্লাউজের ঝুল', 'Blouse length', 'blouse'),
    field('chest', 'বুক', 'Chest', 'blouse'),
    field('waist', 'কোমর', 'Waist', 'skirt'),
    field('hip', 'হিপ', 'Hip', 'skirt'),
    field('skirt-length', 'লেহেঙ্গার ঝুল', 'Skirt length', 'skirt'),
    field('shoulder', 'কাঁধ', 'Shoulder', 'blouse'),
    field('sleeve', 'হাতা', 'Sleeve', 'blouse'),
  ],
  stages: BRIDAL_STAGES,
  active: true,
};

const SCHOOL_SHIRT: GarmentTemplate = {
  id: 'school-shirt',
  name: { bn: 'স্কুল শার্ট', en: 'School shirt' },
  defaultPrice: 45000,
  fields: [
    field('length', 'ঝুল', 'Length', 'body'),
    field('chest', 'বুক', 'Chest', 'body'),
    field('shoulder', 'কাঁধ', 'Shoulder', 'body'),
    field('sleeve', 'হাতা', 'Sleeve', 'sleeve'),
    field('collar', 'গলা', 'Collar', 'neck'),
  ],
  stages: STANDARD_STAGES,
  active: true,
};

const SCHOOL_PANT: GarmentTemplate = {
  id: 'school-pant',
  name: { bn: 'স্কুল প্যান্ট', en: 'School pant' },
  defaultPrice: 50000,
  fields: [
    field('length', 'ঝুল', 'Length', 'body'),
    field('waist', 'কোমর', 'Waist', 'body'),
    field('hip', 'হিপ', 'Hip', 'body'),
    field('bottom', 'মুহুরি', 'Bottom', 'leg'),
  ],
  stages: STANDARD_STAGES,
  active: true,
};

/** Boutique cutters and tailors need women's measurements; counter staff do not. */
const BOUTIQUE_ROLES: Role[] = DEFAULT_ROLES.map((role) =>
  role.id === 'cutting' || role.id === 'tailor'
    ? { ...role, capabilities: [...role.capabilities, 'measurements.view.female'] }
    : role,
);

const pin = (n: number) => String(n).repeat(4);

export function shopConfig(key: SeedShopKey): ShopConfig {
  switch (key) {
    case 'rahman':
      return {
        id: 'rahman',
        profile: { name: SEED_SHOPS[0]!.name, phone: '01755123456', address: 'মিরপুর ১০, ঢাকা' },
        branches: [{ id: 'main', name: { bn: 'প্রধান দোকান', en: 'Main shop' }, kind: 'shop', address: 'মিরপুর ১০, ঢাকা' }],
        devices: [{ id: 'device-a', name: 'দোকানের ফোন', series: 'A', branchId: 'main' }],
        roles: DEFAULT_ROLES,
        staff: [{ id: 'rahman-owner', name: 'আব্দুর রহমান', roleId: 'owner', branchIds: 'all', pin: pin(1), active: true }],
        templates: [starter('shirt'), starter('pant'), starter('panjabi'), starter('alteration')],
        settings: { restrictFemaleMeasurements: false, linkExpiryDays: 30, defaultLanguage: 'bn' },
      };
    case 'nakshi':
      return {
        id: 'nakshi',
        profile: { name: SEED_SHOPS[1]!.name, phone: '01866234567', address: 'ধানমন্ডি ২৭, ঢাকা' },
        branches: [{ id: 'main', name: { bn: 'বুটিক', en: 'Boutique' }, kind: 'shop', address: 'ধানমন্ডি ২৭, ঢাকা' }],
        devices: [{ id: 'device-a', name: 'কাউন্টার ল্যাপটপ', series: 'A', branchId: 'main' }],
        roles: BOUTIQUE_ROLES,
        staff: [
          { id: 'nakshi-owner', name: 'নাসরিন সুলতানা', roleId: 'owner', branchIds: 'all', pin: pin(1), active: true },
          { id: 'nakshi-counter', name: 'মিতু আক্তার', roleId: 'counter', branchIds: 'all', pin: pin(2), active: true },
          { id: 'nakshi-cutting', name: 'রোকেয়া বেগম', roleId: 'cutting', branchIds: 'all', pin: pin(3), active: true },
          { id: 'nakshi-tailor', name: 'জামাল উদ্দিন', roleId: 'tailor', branchIds: 'all', pin: pin(4), active: true },
        ],
        templates: [starter('salwar-kameez'), starter('blouse'), BRIDAL_LEHENGA, starter('alteration')],
        settings: { restrictFemaleMeasurements: true, linkExpiryDays: 30, defaultLanguage: 'bn' },
      };
    case 'uniform':
      return {
        id: 'uniform',
        profile: { name: SEED_SHOPS[2]!.name, phone: '01977345678', address: 'আগ্রাবাদ, চট্টগ্রাম' },
        branches: [
          { id: 'shop', name: { bn: 'দোকান', en: 'Shop' }, kind: 'shop', address: 'আগ্রাবাদ, চট্টগ্রাম' },
          { id: 'workshop', name: { bn: 'কারখানা', en: 'Workshop' }, kind: 'workshop', address: 'হালিশহর, চট্টগ্রাম' },
        ],
        devices: [{ id: 'device-a', name: 'দোকানের কম্পিউটার', series: 'A', branchId: 'shop' }],
        roles: DEFAULT_ROLES,
        staff: [
          { id: 'uniform-owner', name: 'কামাল হোসেন', roleId: 'owner', branchIds: 'all', pin: pin(1), active: true },
          { id: 'uniform-counter', name: 'শাপলা রায়', roleId: 'counter', branchIds: ['shop'], pin: pin(2), active: true },
          { id: 'uniform-supervisor', name: 'হাবিব উল্লাহ', roleId: 'supervisor', branchIds: ['workshop'], pin: pin(3), active: true },
          { id: 'uniform-tailor-1', name: 'রফিক মিয়া', roleId: 'tailor', branchIds: 'all', pin: pin(4), active: true },
          { id: 'uniform-tailor-2', name: 'সেলিম শেখ', roleId: 'tailor', branchIds: 'all', pin: pin(5), active: true },
        ],
        templates: [SCHOOL_SHIRT, SCHOOL_PANT, starter('shirt'), starter('pant')],
        settings: { restrictFemaleMeasurements: false, linkExpiryDays: 30, defaultLanguage: 'bn' },
      };
  }
}
