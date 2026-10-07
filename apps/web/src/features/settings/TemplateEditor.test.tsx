import { toBanglaDigits } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const bn = (n: number) => toBanglaDigits(String(n));

describe('Template editor on a phone', () => {
  it('changes a garment’s price and adds a measurement field', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/settings/templates' });
    await userEvent.click(await screen.findByRole('link', { name: 'শার্ট' }));
    expect(await screen.findByRole('heading', { name: 'শার্ট বদলান' })).toBeTruthy();
    const price = screen.getByLabelText('দাম');
    await userEvent.clear(price);
    await userEvent.type(price, '৮০০');
    await userEvent.click(screen.getByRole('button', { name: 'ঘর যোগ করুন' }));
    await userEvent.type(screen.getByLabelText('ঘর ৯: বাংলা নাম'), 'পিঠ');
    await userEvent.type(screen.getByLabelText('ঘর ৯: ইংরেজি নাম'), 'Back');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    const list = await screen.findByRole('list', { name: 'পোশাকের ধরন' });
    expect((await screen.findByText('সেভ হয়েছে')).getAttribute('role')).toBe('status');
    expect(within(within(list).getByRole('link', { name: 'শার্ট' }).closest('li')!).getByText('৳৮০০')).toBeTruthy();
    const shirt = store.getSnapshot().config!.templates.find((t) => t.id === 'shirt')!;
    expect(shirt.defaultPrice).toBe(80000);
    expect(shirt.fields.at(-1)).toEqual({ key: 'back', label: { bn: 'পিঠ', en: 'Back' }, unit: 'inch', group: 'body', required: true });
  });

  it('explains a stage list that would break tracking, and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/settings/templates/shirt' });
    const before = store.getSnapshot().config;
    await userEvent.selectOptions(await screen.findByLabelText('ধাপ ৫: ধরন'), 'কাজ চলছে');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    expect(await screen.findByText('অন্তত একটি রেডি ধাপ লাগবে যা বাদ দেওয়া যায় না')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });

  it('keeps saved measurement fields and lets new ones go', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/settings/templates/shirt' });
    await screen.findByRole('heading', { name: 'শার্ট বদলান' });
    expect(screen.queryByRole('button', { name: 'ঘর ১ বাদ দিন' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'ঘর যোগ করুন' }));
    await userEvent.click(screen.getByRole('button', { name: 'ঘর ৯ বাদ দিন' }));
    expect(screen.queryByLabelText('ঘর ৯: বাংলা নাম')).toBeNull();
  });
});
