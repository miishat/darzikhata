import { spec54Order } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { garmentSummary, itemTitle, progressText } from './orderText';

describe('progressText', () => {
  it('counts garments by group in either language, leaving out empty groups', () => {
    const progress = { unfinished: 2, ready: 1, delivered: 0, cancelled: 0, total: 3 };
    expect(progressText(progress, 'bn')).toBe('মোট ৩টি: ২টি চলছে, ১টি রেডি');
    expect(progressText(progress, 'en')).toBe('3 garments: 2 in progress, 1 ready');
    expect(progressText({ unfinished: 0, ready: 0, delivered: 1, cancelled: 1, total: 2 }, 'bn')).toBe(
      'মোট ২টি: ১টি ডেলিভারি হয়েছে, ১টি বাতিল',
    );
  });
});

describe('garmentSummary', () => {
  it('groups garments by name and leaves out cancelled ones', () => {
    const order = spec54Order();
    expect(garmentSummary(order, 'bn')).toBe('শার্ট ×২, পাঞ্জাবি');
    expect(garmentSummary(order, 'en')).toBe('Shirt ×2, Panjabi');
    order.items[0] = { ...order.items[0]!, cancelled: { reason: 'x', at: '', by: '' } };
    expect(garmentSummary(order, 'bn')).toBe('শার্ট, পাঞ্জাবি');
  });
});

describe('itemTitle', () => {
  it('numbers garments by their place in the order', () => {
    const order = spec54Order();
    expect(itemTitle(order, order.items[2]!, 'bn')).toBe('পাঞ্জাবি ৩');
    expect(itemTitle(order, order.items[1]!, 'en')).toBe('Shirt 2');
  });
});
