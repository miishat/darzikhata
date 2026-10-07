import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

async function openDetail(shop: 'rahman' | 'uniform', orderId: string) {
  const app = await renderApp({ layout: 'desktop', shop, path: '/app/orders' });
  await screen.findByRole('table', { name: 'অর্ডার তালিকা' });
  await act(() => app.router.navigate(`/app/orders/${orderId}?full=1`));
  return screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
}

describe('Group order detail', () => {
  it('groups the garments by wearer with each wearer’s progress', async () => {
    const detail = await openDetail('uniform', 'uniform-o27');
    const garments = within(detail).getByRole('tabpanel');
    const rafi = within(garments).getByRole('region', { name: 'ক্লাস ৭ - রাফি' });
    expect(within(rafi).getByText('মোট ২টি: ২টি ডেলিভারি হয়েছে')).toBeTruthy();
    expect(within(rafi).getByRole('region', { name: 'স্কুল শার্ট ১' })).toBeTruthy();
    expect(within(rafi).getByRole('region', { name: 'স্কুল প্যান্ট ২' })).toBeTruthy();
    const sadia = within(garments).getByRole('region', { name: 'ক্লাস ৭ - সাদিয়া' });
    expect(within(sadia).getByText('মোট ২টি: ২টি চলছে')).toBeTruthy();
  });

  it('keeps the plain garment list when nobody is named', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/rahman-o40?full=1' });
    const order = store.getSnapshot().state.orders['rahman-o40']!;
    const garments = await screen.findByRole('tabpanel');
    expect(within(garments).queryByRole('heading', { level: 3, name: 'নাম ছাড়া পোশাক' })).toBeNull();
    expect(within(garments).getAllByRole('region')).toHaveLength(order.items.length);
  });
});
