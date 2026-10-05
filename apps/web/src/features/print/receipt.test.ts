import { makeItem, makeOrder, makePayment, spec54Order } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { shopConfig } from '../../seed/shops';
import { receiptModel, receiptShareText } from './receipt';

const config = shopConfig('rahman');
const customer = {
  id: 'c1', name: 'রহিম উদ্দিন', nameAlt: 'Rahim Uddin', phone: '01712345678', householdId: null,
  gender: 'male' as const, notes: '', createdAt: '', version: 1,
};

describe('receiptModel', () => {
  it('shows the spec example: ৳2,400 order, ৳1,000 paid, ৳1,400 due', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 100000 })] });
    const model = receiptModel(order, customer, config, 'bn');
    expect(model.shop).toEqual({ name: 'রহমান টেইলার্স', phone: '01755123456', address: 'মিরপুর ১০, ঢাকা' });
    expect(model.customer).toEqual({ name: 'রহিম উদ্দিন', phone: '01712345678' });
    expect(model.lines.map((l) => [l.garment, l.price, l.stage])).toEqual([
      ['শার্ট', 70000, 'বুকড'],
      ['শার্ট', 70000, 'বুকড'],
      ['পাঞ্জাবি', 100000, 'বুকড'],
    ]);
    expect([model.subtotal, model.total, model.paid, model.balance, model.creditDue]).toEqual([240000, 240000, 100000, 140000, 0]);
  });

  it('uses the chosen language for the shop and garments', () => {
    const model = receiptModel(spec54Order(), customer, config, 'en');
    expect(model.shop.name).toBe('Rahman Tailors');
    expect(model.lines[2]!.garment).toBe('Panjabi');
    expect(model.lines[0]!.stage).toBe('Booked');
  });

  it('keeps cancelled garments on the receipt but out of the total, with discount and adjustments', () => {
    const order = spec54Order({
      discount: { amount: 10000, reason: 'নিয়মিত কাস্টমার' },
      priceAdjustments: [{ id: 'a1', amount: 5000, reason: 'বাড়তি লাইনিং', at: '', by: '' }],
    });
    order.items[1] = { ...order.items[1]!, cancelled: { reason: 'বাদ', at: '', by: '' } };
    const model = receiptModel(order, customer, config, 'bn');
    expect(model.lines.map((l) => l.cancelled)).toEqual([false, true, false]);
    expect(model.subtotal).toBe(170000);
    expect(model.discount).toEqual({ amount: 10000, reason: 'নিয়মিত কাস্টমার' });
    expect(model.adjustments).toEqual([{ amount: 5000, reason: 'বাড়তি লাইনিং' }]);
    expect(model.adjustmentsTotal).toBe(5000);
    expect(model.total).toBe(165000);
  });

  it('lists each payment by what it did to the money held, adding up to the amount paid', () => {
    const order = spec54Order({
      payments: [
        makePayment({ id: 'p1', amount: 150000, kind: 'advance' }),
        makePayment({ id: 'p2', amount: -50000, kind: 'correction', corrects: 'p1', reason: 'ভুল অঙ্ক' }),
        makePayment({ id: 'p3', amount: 20000, kind: 'refund', reason: 'ফেরত' }),
        makePayment({ id: 'p4', amount: -5000, kind: 'correction', corrects: 'p3', reason: 'ফেরত কম ছিল' }),
      ],
    });
    const model = receiptModel(order, customer, config, 'bn');
    expect(model.payments.map((p) => p.effect)).toEqual([150000, -50000, -20000, 5000]);
    expect(model.payments.reduce((sum, p) => sum + p.effect, 0)).toBe(model.paid);
    expect(model.paid).toBe(85000);
  });

  it('shows credit due instead of a balance when payments exceed the total', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 240000 })] });
    order.items[2] = { ...order.items[2]!, cancelled: { reason: 'বাদ', at: '', by: '' } };
    const model = receiptModel(order, customer, config, 'bn');
    expect([model.total, model.balance, model.creditDue]).toEqual([140000, 0, 100000]);
  });

  it('finds the next promised date among garments not yet handed over', () => {
    const order = makeOrder({
      items: [
        makeItem({ id: 'a', deliveryDate: '2026-10-05', stageKey: 'delivered' }),
        makeItem({ id: 'b', deliveryDate: '2026-10-09', stageKey: 'ready' }),
        makeItem({ id: 'c', deliveryDate: '2026-10-07', cancelled: { reason: 'x', at: '', by: '' } }),
        makeItem({ id: 'd', deliveryDate: '2026-10-12' }),
      ],
    });
    const model = receiptModel(order, null, config, 'bn');
    expect(model.nextDelivery).toBe('2026-10-09');
    expect(model.progress).toEqual({ unfinished: 1, ready: 1, delivered: 1, cancelled: 1, total: 4 });
    expect(model.customer).toEqual({ name: '', phone: null });
  });
});

describe('receiptShareText', () => {
  it('writes a short message in Bangla digits', () => {
    const order = spec54Order({
      payments: [makePayment({ amount: 100000 })],
      items: spec54Order().items.map((i) => ({ ...i, deliveryDate: '2026-10-12' })),
    });
    expect(receiptShareText(receiptModel(order, customer, config, 'bn'), 'bn')).toBe(
      ['রহমান টেইলার্স', 'অর্ডার A-0001', 'মোট: ৳২,৪০০', 'জমা: ৳১,০০০', 'বাকি: ৳১,৪০০', 'ডেলিভারি: ১২ অক্টোবর ২০২৬', '01755123456'].join('\n'),
    );
  });

  it('mentions credit due in English when the shop owes the customer', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 300000 })] });
    const text = receiptShareText(receiptModel(order, customer, config, 'en'), 'en');
    expect(text).toContain('Credit Due: ৳600');
    expect(text).not.toContain('Balance Due');
  });
});
