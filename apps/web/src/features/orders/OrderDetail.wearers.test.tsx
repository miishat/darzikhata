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
    const summary = within(detail).getByRole('table', { name: 'কে পরবেন অনুযায়ী' });
    expect(within(summary).getAllByRole('row')).toHaveLength(13);
    expect(within(summary).getByRole('row', { name: /ক্লাস ৭ - রাফি/ }).textContent).toContain('মোট ২টি: ২টি ডেলিভারি হয়েছে');

    const rafi = within(detail).getByRole('region', { name: 'ক্লাস ৭ - রাফি' });
    expect(within(rafi).getByText('মোট ২টি: ২টি ডেলিভারি হয়েছে')).toBeTruthy();
    expect(within(rafi).getByRole('region', { name: 'স্কুল শার্ট ১' })).toBeTruthy();
    expect(within(rafi).getByRole('region', { name: 'স্কুল প্যান্ট ২' })).toBeTruthy();
    const sadia = within(detail).getByRole('region', { name: 'ক্লাস ৭ - সাদিয়া' });
    expect(within(sadia).getByText('মোট ২টি: ২টি চলছে')).toBeTruthy();
  });

  it('keeps the plain garment list when nobody is named', async () => {
    const detail = await openDetail('rahman', 'rahman-o40');
    expect(within(detail).queryByRole('table', { name: 'কে পরবেন অনুযায়ী' })).toBeNull();
  });
});
