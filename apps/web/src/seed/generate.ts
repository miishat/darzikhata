import {
  formatOrderNumber,
  snapshotOf,
  type DomainEvent,
  type EventBody,
  type GarmentTemplate,
  type MeasurementSnapshot,
  type MeasurementValue,
  type MeasurementVersion,
  type NewOrderItem,
  type PaymentMethod,
  type Poisha,
  type ShopConfig,
  type Stage,
} from '@darzikhata/domain';
import { CHILDREN, DESIGN_NOTES, FABRIC_NOTES, FITTING_NOTES, MEN, WOMEN, type SeedPerson } from './people';
import { createRng, type Rng } from './random';
import { shopConfig, type SeedShopKey } from './shops';

export interface SeedData {
  config: ShopConfig;
  events: DomainEvent[];
}

interface Recipe {
  seed: number;
  femaleShare: number;
  /** Template ids to draw garments from; repeats make a garment more common. */
  garments: string[];
  takers: string[];
  measurers: string[];
  workers: string[];
  branchId: string;
}

const RECIPES: Record<SeedShopKey, Recipe> = {
  rahman: {
    seed: 101,
    femaleShare: 0,
    garments: ['shirt', 'shirt', 'pant', 'panjabi', 'panjabi', 'alteration'],
    takers: ['rahman-owner'],
    measurers: ['rahman-owner'],
    workers: [],
    branchId: 'main',
  },
  nakshi: {
    seed: 202,
    femaleShare: 1,
    garments: ['salwar-kameez', 'salwar-kameez', 'blouse', 'blouse', 'bridal-lehenga', 'alteration'],
    takers: ['nakshi-counter', 'nakshi-owner'],
    measurers: ['nakshi-cutting'],
    workers: ['nakshi-tailor'],
    branchId: 'main',
  },
  uniform: {
    seed: 303,
    femaleShare: 0.3,
    garments: ['shirt', 'pant', 'shirt', 'pant', 'school-shirt'],
    takers: ['uniform-counter'],
    measurers: ['uniform-counter'],
    workers: ['uniform-tailor-1', 'uniform-tailor-2'],
    branchId: 'shop',
  },
};

const CUSTOMER_COUNT = 30;
const ORDER_COUNT = 40;

/** Typical measurements in inches; lengths depend on the garment. */
const BASE: Record<string, number> = {
  chest: 38, waist: 34, hip: 38, shoulder: 17, sleeve: 23, cuff: 9, collar: 15.5, thigh: 23, knee: 17,
  bottom: 15, rise: 11, 'kameez-length': 40, armhole: 16, 'neck-front': 7, 'neck-back': 5,
  'salwar-length': 38, 'salwar-bottom': 14, 'under-bust': 30, 'sleeve-round': 11, 'skirt-length': 41,
};
const LENGTH: Record<string, number> = {
  shirt: 29, pant: 40, panjabi: 42, blouse: 15, 'bridal-lehenga': 15, 'school-shirt': 24, 'school-pant': 34,
};

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A Dhaka wall-clock time (UTC+6) on a date, as an ISO timestamp. */
export function dhakaTime(date: string, hour: number, minute = 0): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, hour - 6, minute)).toISOString();
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** `count` dates spread evenly from `start` to `end` inclusive. */
function spreadDates(start: string, end: string, count: number): string[] {
  const span = Math.max(0, daysBetween(start, end));
  return Array.from({ length: count }, (_, i) => addDays(start, count === 1 ? span : Math.round((span * i) / (count - 1))));
}

const roundToTaka100 = (poisha: Poisha) => Math.round(poisha / 10000) * 10000;

function measurementValues(rng: Rng, template: GarmentTemplate, scale = 1): Record<string, MeasurementValue> {
  const values: Record<string, MeasurementValue> = {};
  for (const field of template.fields) {
    if (!field.required && rng.chance(0.5)) continue;
    const base = field.key === 'length' ? (LENGTH[template.id] ?? 30) : (BASE[field.key] ?? 12);
    const quarterSteps = Math.round((base * scale) / 0.25) + rng.int(-8, 8);
    values[field.key] = { value: Math.max(1, quarterSteps) * 0.25, unit: field.unit };
  }
  return values;
}

type Phase = { kind: 'delivered' } | { kind: 'ready' } | { kind: 'working'; fraction: number };

function stagePath(stages: Stage[], includeTrial: boolean, includeQc: boolean): Stage[] {
  return stages.filter((s) => !s.optional || (s.key === 'trial' && includeTrial) || (s.key === 'qc' && includeQc));
}

function targetIndex(path: Stage[], phase: Phase): number {
  const ready = path.findIndex((s) => s.group === 'ready');
  if (phase.kind === 'delivered') return path.length - 1;
  if (phase.kind === 'ready') return ready;
  return Math.min(ready - 1, Math.max(0, Math.floor(phase.fraction * ready)));
}

/** Generates a demo shop's setup and full event history, with dates relative to `today` (YYYY-MM-DD). */
export function generateShop(key: SeedShopKey, today: string): SeedData {
  const config = shopConfig(key);
  const recipe = RECIPES[key];
  const rng = createRng(recipe.seed);
  const owner = config.staff[0]!.id;
  const yesterday = addDays(today, -1);
  const templateById = (id: string) => config.templates.find((t) => t.id === id)!;

  const pending: Array<{ at: string; staffId: string; body: EventBody }> = [];
  const emit = (at: string, staffId: string, body: EventBody) => pending.push({ at, staffId, body });

  // Customers, with two households that share one phone number.
  const men = [...MEN];
  const women = [...WOMEN];
  const customers: Array<{ id: string; person: SeedPerson }> = [];
  const regularCustomers = key === 'uniform' ? CUSTOMER_COUNT - 1 : CUSTOMER_COUNT;
  let sharedPhone = '';
  let householdDay = '';
  for (let i = 0; i < regularCustomers; i++) {
    const pool = rng.chance(recipe.femaleShare) ? women : men;
    const person = pool.length > 0 ? pool.splice(rng.int(0, pool.length - 1), 1)[0]! : rng.pick([...MEN, ...WOMEN]);
    const id = `${key}-c${i + 1}`;
    const inHousehold = i === 1 || i === 2 || i === 5 || i === 6;
    if (i === 1 || i === 5) householdDay = addDays(today, -rng.int(90, 120));
    const createdOn = inHousehold ? householdDay : addDays(today, -rng.int(90, 120));
    const householdId = inHousehold ? `${key}-h${i < 5 ? 1 : 2}` : null;
    if (i === 1 || i === 5) {
      sharedPhone = `017${String(rng.int(10000000, 99999999))}`;
      emit(dhakaTime(createdOn, 9), owner, {
        type: 'household.created',
        household: { id: householdId!, label: `${person.bn.split(' ').at(-1)} পরিবার` },
      });
    }
    const phone = inHousehold ? sharedPhone : rng.chance(0.9) ? `01${rng.int(3, 9)}${String(rng.int(10000000, 99999999))}` : null;
    emit(dhakaTime(createdOn, 10), owner, {
      type: 'customer.created',
      customer: { id, name: person.bn, nameAlt: person.en, phone, householdId, gender: person.gender, notes: '' },
    });
    customers.push({ id, person });
  }

  // Measurements: one version per customer and garment, sometimes re-measured.
  const latest = new Map<string, MeasurementVersion>();
  const measure = (customerId: string, template: GarmentTemplate, at: string): MeasurementSnapshot | null => {
    if (template.fields.length === 0) return null;
    const key2 = `${customerId}:${template.id}`;
    const existing = latest.get(key2);
    if (!existing || rng.chance(0.15)) {
      const versionNo = existing ? Number(existing.id.split('-v').at(-1)) + 1 : 1;
      const version: MeasurementVersion = {
        id: `${customerId}-${template.id}-v${versionNo}`,
        takenAt: at,
        takenBy: rng.pick(recipe.measurers),
        source: rng.chance(0.1) ? 'sample' : 'body',
        notes: versionNo > 1 ? 'আবার মাপ নেওয়া হয়েছে' : '',
        values: measurementValues(rng, template),
      };
      emit(at, version.takenBy, { type: 'measurement.recorded', customerId, templateId: template.id, version });
      latest.set(key2, version);
    }
    return snapshotOf(latest.get(key2)!);
  };

  // Orders, oldest first so numbers follow time. Uniform House also gets one school group order.
  const specs: Array<{ daysAgo: number; group: boolean }> = Array.from({ length: ORDER_COUNT }, (_, i) => ({
    daysAgo: 46 - Math.round((i * 45) / (ORDER_COUNT - 1)),
    group: false,
  }));
  if (key === 'uniform') specs.splice(26, 0, { daysAgo: 20, group: true });

  let correctionDone = false;
  let refundDone = false;
  let cancellations = 0;

  specs.forEach((spec, index) => {
    const n = index + 1;
    const orderId = `${key}-o${n}`;
    const number = formatOrderNumber(config.devices[0]!.series, n);
    const created = addDays(today, -spec.daysAgo);
    const createdAt = dhakaTime(created, 11, index % 50);
    const taker = spec.group ? owner : rng.pick(recipe.takers);

    if (spec.group) {
      emitGroupOrder({ orderId, number, created, createdAt });
      return;
    }

    const customer = rng.pick(customers);
    const first = templateById(rng.pick(recipe.garments));
    const others = recipe.garments.filter((g) => g !== 'alteration');
    const templates = first.id === 'alteration' ? [first] : [first, ...Array.from({ length: rng.int(0, 2) }, () => templateById(rng.pick(others)))];

    const lead = rng.int(7, 12);
    let deliveryDate = addDays(created, lead);
    let trialToday = false;
    if (index % 9 === 4) deliveryDate = today;
    if (index % 11 === 5 && first.stages.some((s) => s.key === 'trial')) {
      trialToday = true;
      deliveryDate = addDays(today, 3);
    }

    const items: NewOrderItem[] = templates.map((template, j) => {
      const hasTrial = template.stages.some((s) => s.key === 'trial');
      const trialDate = trialToday && j === 0 ? today : hasTrial && rng.chance(0.35) ? addDays(created, Math.max(2, lead - 4)) : null;
      return {
        id: `${orderId}-i${j + 1}`,
        templateId: template.id,
        garmentName: template.name,
        price: template.defaultPrice + (rng.chance(0.2) ? 10000 : 0),
        wearer: null,
        measurements: measure(customer.id, template, dhakaTime(created, 10, 50)),
        designNotes: rng.pick(DESIGN_NOTES),
        fabricNote: rng.pick(FABRIC_NOTES),
        photoIds: [],
        stages: template.stages,
        assignedTo: recipe.workers.length > 0 ? rng.pick(recipe.workers) : null,
        trialDate,
        deliveryDate,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price, 0);
    const discount = subtotal >= 50000 && rng.chance(0.15) ? { amount: rng.pick([10000, 20000]), reason: 'নিয়মিত কাস্টমার' } : null;
    emit(createdAt, taker, {
      type: 'order.created',
      order: { id: orderId, number, customerId: customer.id, branchId: recipe.branchId, notes: '', discount, items },
    });

    // Decide how far along the order is.
    const overdueBy = daysBetween(deliveryDate, today);
    let phase: Phase;
    if (overdueBy >= 3) phase = rng.chance(0.8) ? { kind: 'delivered' } : rng.chance(0.5) ? { kind: 'ready' } : { kind: 'working', fraction: 0.9 };
    else if (overdueBy >= -1) phase = rng.chance(0.5) ? { kind: 'ready' } : { kind: 'working', fraction: 0.9 };
    else phase = { kind: 'working', fraction: spec.daysAgo / lead };
    if (trialToday) phase = { kind: 'working', fraction: 0.9 };

    // Money in: an advance, with one mistyped advance corrected afterwards.
    let total = subtotal - (discount?.amount ?? 0);
    let paid = 0;
    let p = 0;
    const pay = (at: string, amount: Poisha, kind: 'advance' | 'payment' | 'refund', reason = '') => {
      p += 1;
      const method: PaymentMethod = rng.pick(['cash', 'cash', 'bkash', 'nagad']);
      emit(at, taker, {
        type: 'payment.recorded',
        orderId,
        payment: {
          id: `${orderId}-p${p}`,
          amount,
          method,
          reference: method === 'cash' ? '' : `TX${rng.int(100000, 999999)}`,
          kind,
          corrects: null,
          reason,
        },
      });
      paid += kind === 'refund' ? -amount : amount;
    };

    const fullPrepay = !refundDone && items.length >= 2 && phase.kind === 'working';
    if (fullPrepay) {
      pay(dhakaTime(created, 11, 55), total, 'advance');
    } else if (rng.chance(0.8)) {
      const advance = roundToTaka100((total * rng.int(30, 60)) / 100);
      if (!correctionDone && advance >= 50000) {
        pay(dhakaTime(created, 11, 55), advance + 50000, 'advance');
        p += 1;
        emit(dhakaTime(created, 12, 5), taker, {
          type: 'payment.recorded',
          orderId,
          payment: {
            id: `${orderId}-p${p}`,
            amount: -50000,
            method: 'cash',
            reference: '',
            kind: 'correction',
            corrects: `${orderId}-p1`,
            reason: 'ভুল অঙ্ক লেখা হয়েছিল',
          },
        });
        paid -= 50000;
        correctionDone = true;
      } else if (advance > 0) {
        pay(dhakaTime(created, 11, 55), advance, 'advance');
      }
    }

    // A few multi-item orders lose one item; one of them was prepaid and gets a refund.
    let activeItems = items;
    if (items.length >= 2 && phase.kind === 'working' && cancellations < 2) {
      const cancelled = items[items.length - 1]!;
      emit(dhakaTime(created, 13), taker, {
        type: 'item.cancelled',
        orderId,
        itemId: cancelled.id,
        reason: 'কাস্টমার এই আইটেমটি বাতিল করেছেন',
      });
      activeItems = items.slice(0, -1);
      cancellations += 1;
      total = Math.max(0, total - cancelled.price);
      if (paid > total) {
        pay(dhakaTime(created, 13, 10), paid - total, 'refund', 'বাতিল আইটেমের টাকা ফেরত');
        refundDone = true;
      }
    }

    // Stage history, with the last garment of some delivered orders still waiting for pickup.
    const lastDay = phase.kind === 'delivered' ? (deliveryDate < yesterday ? deliveryDate : yesterday) : yesterday;
    const holdBackLast = phase.kind === 'delivered' && activeItems.length > 1 && index % 3 === 0;
    activeItems.forEach((item, j) => {
      const itemPhase: Phase = holdBackLast && j === activeItems.length - 1 ? { kind: 'ready' } : phase;
      const trialPassed = item.trialDate !== null && item.trialDate <= yesterday;
      const path = stagePath(item.stages, trialPassed, rng.chance(0.5));
      const target = targetIndex(path, itemPhase);
      if (target === 0) return;
      const dates = spreadDates(created, lastDay < created ? created : lastDay, target);
      for (let s = 1; s <= target; s++) {
        const to = path[s]!;
        const at = dhakaTime(dates[s - 1]!, 14, s);
        emit(at, item.assignedTo ?? owner, { type: 'item.stageChanged', orderId, itemId: item.id, to: to.key, reason: '' });
        if (to.key === 'trial') {
          emit(dhakaTime(dates[s - 1]!, 15), taker, {
            type: 'item.adjustmentAdded',
            orderId,
            itemId: item.id,
            adjustment: { id: `${item.id}-a1`, note: rng.pick(FITTING_NOTES) },
          });
        }
      }
    });

    // Fully delivered orders were settled on the last delivery day.
    if (phase.kind === 'delivered' && !holdBackLast && total - paid > 0) {
      pay(dhakaTime(lastDay, 17), total - paid, 'payment');
    }
  });

  function emitGroupOrder(order: { orderId: string; number: string; created: string; createdAt: string }) {
    const school = `${key}-c${CUSTOMER_COUNT}`;
    emit(dhakaTime(addDays(order.created, -10), 10), owner, {
      type: 'customer.created',
      customer: { id: school, name: 'আইডিয়াল স্কুল', nameAlt: 'Ideal School', phone: '01811456789', householdId: null, gender: null, notes: 'স্কুলের ইউনিফর্ম অর্ডার' },
    });
    const deliveryDate = addDays(order.created, 14);
    const items: NewOrderItem[] = [];
    CHILDREN.forEach((child, k) => {
      for (const templateId of ['school-shirt', 'school-pant']) {
        const template = templateById(templateId);
        items.push({
          id: `${order.orderId}-w${k + 1}-${templateId}`,
          templateId,
          garmentName: template.name,
          price: template.defaultPrice,
          wearer: `ক্লাস ৭ - ${child}`,
          measurements: {
            versionId: `${order.orderId}-w${k + 1}-${templateId}`,
            takenAt: order.createdAt,
            source: 'body',
            values: measurementValues(rng, template, 0.8),
          },
          designNotes: 'স্কুলের লোগো বুক পকেটে',
          fabricNote: 'স্কুলের দেওয়া কাপড়',
          photoIds: [],
          stages: template.stages,
          assignedTo: recipe.workers[k % recipe.workers.length]!,
          trialDate: null,
          deliveryDate,
        });
      }
    });
    emit(order.createdAt, owner, {
      type: 'order.created',
      order: { id: order.orderId, number: order.number, customerId: school, branchId: 'workshop', notes: '১২ জন ছাত্রের ইউনিফর্ম', discount: null, items },
    });
    const total = items.reduce((sum, i) => sum + i.price, 0);
    const paymentBody = (id: string, amount: Poisha, kind: 'advance' | 'payment'): EventBody => ({
      type: 'payment.recorded',
      orderId: order.orderId,
      payment: { id, amount, method: 'bank', reference: `CHQ${id.slice(-1)}`, kind, corrects: null, reason: '' },
    });
    emit(dhakaTime(order.created, 12), owner, paymentBody(`${order.orderId}-p1`, roundToTaka100(total / 2), 'advance'));

    const deliveredOn = addDays(deliveryDate, -1);
    items.forEach((item, idx) => {
      const wearer = Math.floor(idx / 2);
      const phase: Phase = wearer < 5 ? { kind: 'delivered' } : wearer < 9 ? { kind: 'ready' } : { kind: 'working', fraction: 0.6 };
      const path = stagePath(item.stages, false, false);
      const target = targetIndex(path, phase);
      const dates = spreadDates(addDays(order.created, 1), phase.kind === 'working' ? yesterday : deliveredOn, target);
      for (let s = 1; s <= target; s++) {
        emit(dhakaTime(dates[s - 1]!, 14, s), item.assignedTo ?? owner, {
          type: 'item.stageChanged',
          orderId: order.orderId,
          itemId: item.id,
          to: path[s]!.key,
          reason: '',
        });
      }
    });
    emit(dhakaTime(deliveredOn, 17), owner, paymentBody(`${order.orderId}-p2`, roundToTaka100(total / 4), 'payment'));
  }

  const ordered = pending
    .map((entry, order) => ({ ...entry, order }))
    .sort((a, b) => a.at.localeCompare(b.at) || a.order - b.order);
  const deviceId = config.devices[0]!.id;
  const events = ordered.map(
    (entry, i) => ({ id: `${key}-e${i + 1}`, at: entry.at, deviceId, staffId: entry.staffId, ...entry.body }) as DomainEvent,
  );
  return { config, events };
}
