import { toBanglaDigits } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const bn = (n: number) => toBanglaDigits(String(n));

describe('Template editor', () => {
  it('changes a garment’s price and adds a measurement field', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates' });
    await userEvent.click(await screen.findByRole('link', { name: 'শার্ট' }));
    expect(await screen.findByRole('heading', { name: 'শার্ট বদলান' })).toBeTruthy();
    const price = screen.getByLabelText('দাম');
    await userEvent.clear(price);
    await userEvent.type(price, '৮০০');
    await userEvent.click(screen.getByRole('button', { name: 'ঘর যোগ করুন' }));
    await userEvent.type(screen.getByLabelText('ঘর ৯: বাংলা নাম'), 'পিঠ');
    await userEvent.type(screen.getByLabelText('ঘর ৯: ইংরেজি নাম'), 'Back');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    const list = await screen.findByRole('table', { name: 'পোশাকের ধরন' });
    expect((await screen.findByText('সেভ হয়েছে')).getAttribute('role')).toBe('status');
    expect(within(within(list).getByRole('row', { name: /শার্ট/ })).getByText('৳৮০০')).toBeTruthy();
    const shirt = store.getSnapshot().config!.templates.find((t) => t.id === 'shirt')!;
    expect(shirt.defaultPrice).toBe(80000);
    expect(shirt.fields.at(-1)).toEqual({ key: 'back', label: { bn: 'পিঠ', en: 'Back' }, unit: 'inch', group: 'body', required: true });
  });

  it('changes stages for new orders only', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates' });
    const { state, config } = store.getSnapshot();
    const order = Object.values(state.orders).find((o) => o.items.some((i) => i.stageKey === 'trial'))!;
    const item = order.items.find((i) => i.stageKey === 'trial')!;
    const template = config!.templates.find((t) => t.id === item.templateId)!;

    await userEvent.click(await screen.findByRole('link', { name: template.name.bn }));
    const n = template.stages.findIndex((s) => s.key === 'trial') + 1;
    await userEvent.click(await screen.findByRole('button', { name: `ধাপ ${bn(n)} বাদ দিন` }));
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    await screen.findByRole('table', { name: 'পোশাকের ধরন' });
    const saved = store.getSnapshot().config!.templates.find((t) => t.id === template.id)!;
    expect(saved.stages.map((s) => s.key)).not.toContain('trial');

    await act(() => router.navigate(`/app/orders/${order.id}?full=1`));
    const card = await screen.findByRole('region', { name: `${item.garmentName.bn} ${bn(order.items.indexOf(item) + 1)}` });
    expect(within(card).getByText('ধাপ: ট্রায়াল')).toBeTruthy();
  });

  it('explains a stage list that would break tracking, and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates/shirt' });
    const before = store.getSnapshot().config;
    await userEvent.selectOptions(await screen.findByLabelText('ধাপ ৫: ধরন'), 'কাজ চলছে');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    expect(await screen.findByText('অন্তত একটি রেডি ধাপ লাগবে যা বাদ দেওয়া যায় না')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });

  it('keeps saved measurement fields and lets new ones go', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates/shirt' });
    await screen.findByRole('heading', { name: 'শার্ট বদলান' });
    expect(screen.queryByRole('button', { name: 'ঘর ১ বাদ দিন' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'ঘর যোগ করুন' }));
    await userEvent.click(screen.getByRole('button', { name: 'ঘর ৯ বাদ দিন' }));
    expect(screen.queryByLabelText('ঘর ৯: বাংলা নাম')).toBeNull();
  });

  it('adds a new garment and retires another, as order entry shows', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates' });
    await userEvent.click(await screen.findByRole('link', { name: 'নতুন পোশাক' }));
    await userEvent.type(await screen.findByLabelText('নাম (বাংলা)'), 'কোট');
    await userEvent.type(screen.getByLabelText('নাম (ইংরেজি)'), 'Coat');
    await userEvent.type(screen.getByLabelText('দাম'), '২৫০০');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    await userEvent.click(await screen.findByRole('link', { name: 'প্যান্ট' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'নতুন অর্ডারে দেখান' }));
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    await screen.findByRole('table', { name: 'পোশাকের ধরন' });
    expect(store.getSnapshot().config!.templates.find((t) => t.id === 'coat')).toMatchObject({ defaultPrice: 250000, active: true });

    await act(() => router.navigate('/app/orders/new'));
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    const garments = within(within(left).getByLabelText('পোশাক')).getAllByRole('option').map((o) => o.textContent);
    expect(garments).toContain('কোট');
    expect(garments).not.toContain('প্যান্ট');
  });
});
