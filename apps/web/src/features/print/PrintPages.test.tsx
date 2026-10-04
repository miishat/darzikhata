import { formatMeasurement, formatTaka, moneySummary, toBanglaDigits } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { receiptModel, receiptShareText } from './receipt';

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'clipboard');
});

const row = (table: HTMLElement, label: RegExp) => within(table).getByRole('row', { name: label });

describe('Receipt page', () => {
  it('prints outside the app shell with garments, totals, payments and the balance', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/receipt/rahman-o40' });
    const order = store.getSnapshot().state.orders['rahman-o40']!;
    const money = moneySummary(order);

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'প্রধান মেনু' })).toBeNull();
    expect(screen.getByText('রহমান টেইলার্স')).toBeTruthy();
    expect(screen.getAllByText(new RegExp(order.number)).length).toBeGreaterThan(0);

    const garments = screen.getByRole('table', { name: 'পোশাক' });
    expect(within(garments).getAllByRole('row')).toHaveLength(order.items.length + 1);
    const totals = screen.getByRole('table', { name: 'হিসাব' });
    expect(within(row(totals, /^মোট/)).getByText(formatTaka(money.total, 'bn'))).toBeTruthy();
    expect(within(row(totals, /^জমা/)).getByText(formatTaka(money.paid, 'bn'))).toBeTruthy();
    expect(within(row(totals, /^বাকি/)).getByText(formatTaka(money.balance, 'bn'))).toBeTruthy();
    if (order.payments.length > 0) {
      expect(within(screen.getByRole('table', { name: 'পেমেন্ট' })).getAllByRole('row')).toHaveLength(order.payments.length + 1);
    }
    expect(screen.getByRole('button', { name: 'প্রিন্ট করুন' }).closest('.no-print')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'অর্ডারে ফিরে যান' }).getAttribute('href')).toBe('/app/orders/rahman-o40');
  });

  it('prints in English without changing the app language', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/receipt/rahman-o40' });
    await userEvent.click(await screen.findByRole('button', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: 'Receipt' })).toBeTruthy();
    expect(screen.getByText('Rahman Tailors')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'প্রিন্ট করুন' })).toBeTruthy();
    expect(window.localStorage.getItem('dk.language')).not.toBe('en');
  });

  it('opens the print dialog', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/receipt/rahman-o40' });
    await userEvent.click(await screen.findByRole('button', { name: 'প্রিন্ট করুন' }));
    expect(print).toHaveBeenCalledOnce();
  });

  it('shares the receipt text, or copies it when sharing is not available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/receipt/rahman-o40' });
    const { config, state } = store.getSnapshot();
    const order = state.orders['rahman-o40']!;
    const text = receiptShareText(receiptModel(order, state.customers[order.customerId]!, config!, 'bn'), 'bn');

    await userEvent.click(await screen.findByRole('button', { name: 'শেয়ার করুন' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text }));

    Reflect.deleteProperty(navigator, 'share');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await userEvent.click(screen.getByRole('button', { name: 'শেয়ার করুন' }));
    expect(writeText).toHaveBeenCalledWith(text);
    expect((await screen.findByRole('status')).textContent).toBe('কপি হয়েছে');
  });

  it('is only for staff who may see money', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/print/receipt/nakshi-o1', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    expect((await screen.findByRole('alert')).textContent).toBe('এই অংশ দেখার অনুমতি আপনার নেই।');
  });
});

describe('Job slip', () => {
  it('shows each garment’s measurements and notes but no money', async () => {
    // Sample data: the first Rahman order with a measured garment (rahman-o40 may be an alteration without measurements).
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman' });
    const { state, config } = store.getSnapshot();
    const order = Object.values(state.orders).find((o) => o.items.some((i) => !i.cancelled && i.measurements))!;
    await router.navigate(`/print/job/${order.id}`);
    expect(await screen.findByRole('heading', { name: 'কাজের স্লিপ' })).toBeTruthy();

    const index = order.items.findIndex((i) => !i.cancelled && i.measurements);
    const item = order.items[index]!;
    const section = screen.getByRole('region', { name: `${item.garmentName.bn} ${toBanglaDigits(String(index + 1))}` });
    const field = config!.templates.find((t) => t.id === item.templateId)!.fields.find((f) => item.measurements!.values[f.key])!;
    const value = item.measurements!.values[field.key]!.value;
    const measurement = within(section).getByRole('row', { name: new RegExp(`^${field.label.bn}`) });
    expect(within(measurement).getByText(`${formatMeasurement(value, 'bn')} ইঞ্চি`)).toBeTruthy();
    expect(document.body.textContent).not.toContain('৳');
  });

  it('hides measurements from staff who may not see them', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/print/job/nakshi-o1', as: { staffId: 'nakshi-counter', pin: '2222' } });
    expect((await screen.findAllByText('মাপ দেখার অনুমতি নেই')).length).toBeGreaterThan(0);
    // Measurement tables are the slip's only tables. (Fitting notes may mention inches, so text is not checked.)
    expect(screen.queryAllByRole('table')).toHaveLength(0);
  });
});

describe('Fabric tags', () => {
  it('prints one tag per garment with the order number, wearer and delivery date', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/print/tags/uniform-o27' });
    const order = store.getSnapshot().state.orders['uniform-o27']!;
    expect(await screen.findByRole('heading', { name: 'কাপড়ের ট্যাগ' })).toBeTruthy();
    const tags = within(screen.getByRole('list', { name: 'কাপড়ের ট্যাগ' })).getAllByRole('listitem');
    expect(tags).toHaveLength(order.items.filter((i) => !i.cancelled).length);
    expect(tags).toHaveLength(24);
    const first = order.items[0]!;
    expect(tags[0]!.textContent).toContain(order.number);
    expect(tags[0]!.textContent).toContain(first.wearer!);
  });
});
