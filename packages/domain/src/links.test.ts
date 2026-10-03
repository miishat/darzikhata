import { describe, expect, it } from 'vitest';
import { activeLink, findOrderByToken, linkState, publicOrderView, tokenFromBytes } from './links';
import { makeItem, makeOrder, makePayment } from './testing/fixtures';

const shop = { name: 'রহমান টেইলার্স', phone: '01755123456', address: 'মিরপুর ১০, ঢাকা' };

const deliveredItem = (at: string) =>
  makeItem({
    stageKey: 'delivered',
    stageHistory: [{ from: 'ready', to: 'delivered', at, by: 'x', kind: 'forward', reason: '' }],
  });

describe('tokenFromBytes', () => {
  it('encodes 16 bytes as 22 URL-safe characters', () => {
    const token = tokenFromBytes(new Uint8Array(16).fill(255));
    expect(token).toHaveLength(22);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('encodes known bytes correctly', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0x00, ...new Array(13).fill(0)]);
    expect(tokenFromBytes(bytes).slice(0, 4)).toBe('-_8A');
  });

  it('refuses short input', () => {
    expect(() => tokenFromBytes(new Uint8Array(8))).toThrow();
  });
});

describe('link state', () => {
  const now = '2026-10-10T00:00:00.000Z';

  it('finds the active link and the order it belongs to', () => {
    const order = makeOrder({
      links: [
        { token: 'old', createdAt: 'x', revokedAt: 'y' },
        { token: 'new', createdAt: 'x', revokedAt: null },
      ],
    });
    expect(activeLink(order)?.token).toBe('new');
    expect(findOrderByToken([makeOrder({ id: 'other' }), order], 'new')).toBe(order);
    expect(findOrderByToken([order], 'missing')).toBeNull();
  });

  it('reports unknown and revoked links', () => {
    const order = makeOrder({ links: [{ token: 't', createdAt: 'x', revokedAt: '2026-10-05T00:00:00.000Z' }] });
    expect(linkState(order, 'nope', now, 30)).toBe('unknown');
    expect(linkState(order, 't', now, 30)).toBe('revoked');
  });

  it('keeps links active while the order is open', () => {
    const order = makeOrder({ links: [{ token: 't', createdAt: 'x', revokedAt: null }] });
    expect(linkState(order, 't', '2027-01-01T00:00:00.000Z', 30)).toBe('active');
  });

  it('expires links the given number of days after the order closes', () => {
    const order = makeOrder({
      items: [deliveredItem('2026-10-01T00:00:00.000Z')],
      links: [{ token: 't', createdAt: 'x', revokedAt: null }],
    });
    expect(linkState(order, 't', '2026-10-31T00:00:00.000Z', 30)).toBe('active');
    expect(linkState(order, 't', '2026-10-31T00:00:00.001Z', 30)).toBe('expired');
  });
});

describe('publicOrderView', () => {
  it('shows progress and dates but nothing private', () => {
    const order = makeOrder({
      notes: 'customer is difficult',
      payments: [makePayment()],
      items: [
        makeItem({
          stageKey: 'stitching',
          wearer: 'Rahim',
          trialDate: '2026-10-07',
          deliveryDate: '2026-10-10',
          assignedTo: 'tailor-1',
          designNotes: 'secret',
          measurements: { versionId: 'v1', takenAt: 'x', source: 'body', values: { chest: { value: 38, unit: 'inch' } } },
        }),
      ],
    });
    const view = publicOrderView(order, shop);
    expect(view).toEqual({
      shop,
      orderNumber: 'A-0001',
      lastUpdatedAt: order.updatedAt,
      items: [
        {
          garmentName: { bn: 'শার্ট', en: 'Shirt' },
          wearer: 'Rahim',
          group: 'unfinished',
          stageLabel: { bn: 'সেলাই', en: 'Stitching' },
          trialDate: '2026-10-07',
          deliveryDate: '2026-10-10',
        },
      ],
    });
    const serialized = JSON.stringify(view);
    for (const secret of ['customer is difficult', 'secret', 'tailor-1', 'chest', '70000', '100000']) {
      expect(serialized).not.toContain(secret);
    }
  });
});
