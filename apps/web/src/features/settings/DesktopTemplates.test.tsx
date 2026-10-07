import { toBanglaDigits } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const bn = (n: number) => toBanglaDigits(String(n));

describe('Desktop garment editor', () => {
  it('opens a garment from the table in a side panel and saves a new price and field', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates' });
    const table = await screen.findByRole('table', { name: 'পোশাকের ধরন' });
    await userEvent.click(within(table).getByRole('link', { name: 'শার্ট' }));
    const panel = await screen.findByRole('dialog', { name: 'শার্ট বদলান' });
    const price = within(panel).getByLabelText('দাম');
    await userEvent.clear(price);
    await userEvent.type(price, '৮০০');
    await userEvent.click(within(panel).getByRole('tab', { name: /^মাপের ঘর/ }));
    await userEvent.click(within(panel).getByRole('button', { name: 'ঘর যোগ করুন' }));
    await userEvent.type(within(panel).getByLabelText('ঘর ৯: বাংলা নাম'), 'পিঠ');
    await userEvent.type(within(panel).getByLabelText('ঘর ৯: ইংরেজি নাম'), 'Back');
    await userEvent.click(within(within(panel).getByRole('radiogroup', { name: 'ঘর ৯: একক' })).getByRole('radio', { name: 'সেমি' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'সেভ করুন' }));

    expect((await screen.findByText('সেভ হয়েছে')).getAttribute('role')).toBe('status');
    expect(screen.queryByRole('dialog')).toBeNull();
    const row = within(screen.getByRole('table', { name: 'পোশাকের ধরন' })).getByRole('link', { name: 'শার্ট' }).closest('tr')!;
    expect(within(row).getByText('৳৮০০')).toBeTruthy();
    const shirt = store.getSnapshot().config!.templates.find((t) => t.id === 'shirt')!;
    expect(shirt.defaultPrice).toBe(80000);
    expect(shirt.fields.at(-1)).toEqual({ key: 'back', label: { bn: 'পিঠ', en: 'Back' }, unit: 'cm', group: 'body', required: true });
  });

  it('removes a stage for new orders only', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates' });
    const { state, config } = store.getSnapshot();
    const order = Object.values(state.orders).find((o) => o.items.some((i) => i.stageKey === 'trial'))!;
    const item = order.items.find((i) => i.stageKey === 'trial')!;
    const template = config!.templates.find((t) => t.id === item.templateId)!;

    await userEvent.click(await screen.findByRole('link', { name: template.name.bn }));
    const panel = await screen.findByRole('dialog');
    await userEvent.click(within(panel).getByRole('tab', { name: /^ধাপ/ }));
    const n = template.stages.findIndex((s) => s.key === 'trial') + 1;
    await userEvent.click(within(panel).getByRole('button', { name: `ধাপ ${bn(n)} বাদ দিন` }));
    await userEvent.click(within(panel).getByRole('button', { name: 'সেভ করুন' }));
    await screen.findByText('সেভ হয়েছে');
    expect(store.getSnapshot().config!.templates.find((t) => t.id === template.id)!.stages.map((s) => s.key)).not.toContain('trial');

    await act(() => router.navigate(`/app/orders/${order.id}?full=1`));
    const card = await screen.findByRole('region', { name: `${item.garmentName.bn} ${bn(order.items.indexOf(item) + 1)}` });
    expect(within(card).getByText('ধাপ: ট্রায়াল')).toBeTruthy();
  });

  it('keeps stages in their kind’s box and adds a stage to the box it is added from', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates/shirt' });
    const panel = await screen.findByRole('dialog', { name: 'শার্ট বদলান' });
    await userEvent.click(within(panel).getByRole('tab', { name: /^ধাপ/ }));
    const ready = within(panel).getByRole('region', { name: 'রেডি' });
    expect(within(ready).queryByRole('button', { name: /যোগ করুন/ })).toBeTruthy();
    expect(within(within(panel).getByRole('region', { name: 'ডেলিভারি' })).queryByRole('button', { name: /যোগ করুন/ })).toBeNull();
    await userEvent.click(within(ready).getByRole('button', { name: /যোগ করুন/ }));
    const inputs = within(within(panel).getByRole('region', { name: 'রেডি' })).getAllByRole('textbox');
    await userEvent.type(inputs.at(-2)!, 'প্যাকিং');
    await userEvent.type(inputs.at(-1)!, 'Packing');
    await userEvent.click(within(panel).getByRole('button', { name: 'সেভ করুন' }));
    await screen.findByText('সেভ হয়েছে');
    const stages = store.getSnapshot().config!.templates.find((t) => t.id === 'shirt')!.stages;
    expect(stages.at(-2)).toMatchObject({ key: 'packing', group: 'ready' });
    expect(stages.at(-1)!.group).toBe('delivered');
  });

  it('opens the tab with the problem when a save is refused, and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates/shirt' });
    const before = store.getSnapshot().config;
    const panel = await screen.findByRole('dialog', { name: 'শার্ট বদলান' });
    await userEvent.click(within(panel).getByRole('tab', { name: /^মাপের ঘর/ }));
    await userEvent.click(within(panel).getByRole('button', { name: 'ঘর যোগ করুন' }));
    await userEvent.click(within(panel).getByRole('tab', { name: 'নাম ও দাম' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'সেভ করুন' }));
    expect(within(panel).getByRole('tab', { name: /^মাপের ঘর/ }).getAttribute('aria-selected')).toBe('true');
    expect(within(panel).getByLabelText('ঘর ৯: বাংলা নাম').getAttribute('aria-invalid')).toBe('true');
    expect(store.getSnapshot().config).toBe(before);
  });

  it('adds a new garment and retires another, as order entry shows', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates' });
    await userEvent.click(await screen.findByRole('link', { name: 'নতুন পোশাক' }));
    let panel = await screen.findByRole('dialog', { name: 'নতুন পোশাক' });
    await userEvent.type(within(panel).getByLabelText('নাম (বাংলা)'), 'কোট');
    await userEvent.type(within(panel).getByLabelText('নাম (ইংরেজি)'), 'Coat');
    await userEvent.type(within(panel).getByLabelText('দাম'), '২৫০০');
    await userEvent.click(within(panel).getByRole('button', { name: 'সেভ করুন' }));
    await screen.findByText('সেভ হয়েছে');

    await userEvent.click(screen.getByRole('link', { name: 'প্যান্ট' }));
    panel = await screen.findByRole('dialog', { name: 'প্যান্ট বদলান' });
    await userEvent.click(within(panel).getByRole('switch', { name: 'নতুন অর্ডারে দেখান' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'সেভ করুন' }));
    await screen.findByText('সেভ হয়েছে');
    expect(store.getSnapshot().config!.templates.find((t) => t.id === 'coat')).toMatchObject({ defaultPrice: 250000, active: true });

    await act(() => router.navigate('/app/orders/new'));
    const card = await screen.findByRole('region', { name: 'পোশাক ও মাপ' });
    const garments = within(within(card).getByRole('group', { name: 'পোশাক যোগ করুন' })).getAllByRole('button').map((b) => b.textContent);
    expect(garments).toContain('+ কোট');
    expect(garments).not.toContain('+ প্যান্ট');
  });

  it('asks before closing with unsaved changes', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates/shirt' });
    const panel = await screen.findByRole('dialog', { name: 'শার্ট বদলান' });
    await userEvent.type(within(panel).getByLabelText('নাম (ইংরেজি)'), 's');
    await userEvent.click(within(panel).getByRole('button', { name: 'বাতিল' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'শার্ট বদলান' })).toBeTruthy();
  });

  it('reads in English when the app is in English', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates/shirt', language: 'en' });
    const panel = await screen.findByRole('dialog', { name: 'Edit Shirt' });
    for (const tab of ['Name and Price', /^Measurement Fields/, /^Stages/] as const) {
      await userEvent.click(within(panel).getByRole('tab', { name: tab }));
      // Saved Bangla names sit in the Bangla inputs; every label and heading is English.
      const tabpanel = within(panel).getByRole('tabpanel');
      const labels = [...tabpanel.querySelectorAll('h3, legend, label, button, option, p')].map((e) => e.textContent ?? '');
      for (const text of labels) expect(text).not.toMatch(/[ঀ-৲৴-৿]/);
    }
  });
});
