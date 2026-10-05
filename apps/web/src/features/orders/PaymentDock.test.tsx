import { moneySummary } from '@darzikhata/domain';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

async function openUnpaidOrder() {
  const app = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders' });
  const order = Object.values(app.store.getSnapshot().state.orders).find((o) => moneySummary(o).balance > 0)!;
  await act(() => app.router.navigate(`/app/orders/${order.id}`));
  await userEvent.click(await screen.findByRole('button', { name: 'পেমেন্ট বার দেখান' }));
  await screen.findByRole('button', { name: 'টাকা নিন' });
  return order;
}

describe('PaymentDock', () => {
  it('starts hidden, showing only a balance tab', async () => {
    const app = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders' });
    const order = Object.values(app.store.getSnapshot().state.orders).find((o) => moneySummary(o).balance > 0)!;
    await act(() => app.router.navigate(`/app/orders/${order.id}`));
    expect(await screen.findByRole('button', { name: 'পেমেন্ট বার দেখান' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'টাকা নিন' })).toBeNull();
    expect(document.documentElement.dataset.dockOpen).toBeUndefined();
  });

  it('shows take payment and receipt print, and shrinks New order while open', async () => {
    const order = await openUnpaidOrder();
    expect(screen.getByRole('link', { name: 'রসিদ প্রিন্ট' }).getAttribute('href')).toBe(`/print/receipt/${order.id}`);
    expect(document.documentElement.dataset.dockOpen).toBe('1');
  });

  it('hides the whole bar behind a balance tab and brings it back', async () => {
    await openUnpaidOrder();
    await userEvent.click(screen.getByRole('button', { name: 'পেমেন্ট বার লুকান' }));
    expect(screen.queryByRole('button', { name: 'টাকা নিন' })).toBeNull();
    expect(document.documentElement.dataset.dockOpen).toBeUndefined();
    await userEvent.click(screen.getByRole('button', { name: 'পেমেন্ট বার দেখান' }));
    expect(screen.getByRole('button', { name: 'টাকা নিন' })).toBeTruthy();
  });
});
