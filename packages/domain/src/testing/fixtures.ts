import type { DomainEvent, EventBody, EventMeta, NewCustomer, NewOrder, NewOrderItem } from '../events';
import type { Order, OrderItem, Payment } from '../model';
import { STANDARD_STAGES } from '../templates';

/** A fixed moment used by tests: 3 Oct 2026, 10:00 in Dhaka. */
export const T0 = '2026-10-03T04:00:00.000Z';

export function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'i1',
    templateId: 'shirt',
    garmentName: { bn: 'শার্ট', en: 'Shirt' },
    price: 70000,
    wearer: null,
    measurements: null,
    designNotes: '',
    fabricNote: '',
    photoIds: [],
    stages: STANDARD_STAGES,
    stageKey: 'booked',
    stageHistory: [],
    assignedTo: null,
    trialDate: null,
    deliveryDate: null,
    adjustments: [],
    cancelled: null,
    version: 1,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    number: 'A-0001',
    customerId: 'c1',
    branchId: 'main',
    createdAt: T0,
    createdBy: 'staff-owner',
    updatedAt: T0,
    notes: '',
    discount: null,
    priceAdjustments: [],
    items: [makeItem()],
    payments: [],
    links: [],
    version: 1,
    ...overrides,
  };
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'p1',
    amount: 100000,
    method: 'cash',
    reference: '',
    kind: 'advance',
    corrects: null,
    reason: '',
    at: T0,
    by: 'staff-owner',
    ...overrides,
  };
}

/** The spec example: two shirts (৳700 each) and a panjabi (৳1,000), total ৳2,400. */
export function spec54Order(overrides: Partial<Order> = {}): Order {
  return makeOrder({
    items: [
      makeItem({ id: 'shirt-1' }),
      makeItem({ id: 'shirt-2' }),
      makeItem({ id: 'panjabi-1', templateId: 'panjabi', garmentName: { bn: 'পাঞ্জাবি', en: 'Panjabi' }, price: 100000 }),
    ],
    ...overrides,
  });
}

export function eventFactory(deviceId = 'dev-A', staffId = 'staff-owner') {
  let n = 0;
  return (body: EventBody, overrides: Partial<EventMeta> = {}): DomainEvent => {
    n += 1;
    const at = new Date(Date.parse(T0) + n * 60_000).toISOString();
    return { id: `${deviceId}-e${n}`, at, deviceId, staffId, ...body, ...overrides } as DomainEvent;
  };
}

export function newCustomer(overrides: Partial<NewCustomer> = {}): NewCustomer {
  return {
    id: 'c1',
    name: 'রহিম উদ্দিন',
    nameAlt: 'Rahim Uddin',
    phone: '01712345678',
    householdId: null,
    gender: 'male',
    notes: '',
    ...overrides,
  };
}

export function newOrderItem(overrides: Partial<NewOrderItem> = {}): NewOrderItem {
  return {
    id: 'i1',
    templateId: 'shirt',
    garmentName: { bn: 'শার্ট', en: 'Shirt' },
    price: 70000,
    wearer: null,
    measurements: null,
    designNotes: '',
    fabricNote: '',
    photoIds: [],
    stages: STANDARD_STAGES,
    assignedTo: null,
    trialDate: null,
    deliveryDate: null,
    ...overrides,
  };
}

export function newOrder(overrides: Partial<NewOrder> = {}): NewOrder {
  return {
    id: 'o1',
    number: 'A-0001',
    customerId: 'c1',
    branchId: 'main',
    notes: '',
    discount: null,
    items: [newOrderItem()],
    ...overrides,
  };
}
