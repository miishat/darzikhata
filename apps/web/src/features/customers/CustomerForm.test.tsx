import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Customer form', () => {
  it('adds a customer with a new household and opens their profile', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/new' });
    expect(await screen.findByRole('heading', { name: 'নতুন কাস্টমার' })).toBeTruthy();
    await userEvent.type(screen.getByLabelText('নাম'), 'সুমি আক্তার');
    await userEvent.type(screen.getByLabelText('ফোন'), '০১৮১১০০০০০০');
    await userEvent.click(screen.getByRole('radio', { name: 'মহিলা' }));
    await userEvent.selectOptions(screen.getByLabelText('পরিবার'), 'নতুন পরিবার');
    await userEvent.type(screen.getByLabelText('পরিবারের নাম'), 'আক্তার পরিবার');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByRole('heading', { name: 'সুমি আক্তার' })).toBeTruthy();
    const { state } = store.getSnapshot();
    const saved = Object.values(state.customers).find((c) => c.name === 'সুমি আক্তার')!;
    expect(saved).toMatchObject({ phone: '01811000000', gender: 'female' });
    expect(state.households[saved.householdId!]!.label).toBe('আক্তার পরিবার');
  });

  it('shows problems beside the fields and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/new' });
    const before = Object.keys(store.getSnapshot().state.customers).length;
    await userEvent.type(await screen.findByLabelText('ফোন'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(screen.getByText('নাম লিখুন')).toBeTruthy();
    expect(screen.getByLabelText('ফোন').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('ফোন নম্বর ঠিক নেই, ১১ সংখ্যার মোবাইল নম্বর দিন')).toBeTruthy();
    expect(Object.keys(store.getSnapshot().state.customers)).toHaveLength(before);
  });

  it('edits details and returns to the profile', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c1/edit' });
    const customer = store.getSnapshot().state.customers['rahman-c1']!;
    expect(await screen.findByRole('heading', { name: 'কাস্টমারের তথ্য বদলান' })).toBeTruthy();
    expect(screen.getByLabelText('নাম')).toHaveProperty('value', customer.name);

    await userEvent.type(screen.getByLabelText('নোট'), 'ঢিলা ফিটিং পছন্দ করেন');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByText('ঢিলা ফিটিং পছন্দ করেন')).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c1']).toMatchObject({ notes: 'ঢিলা ফিটিং পছন্দ করেন', version: 2 });
  });

  it('does not overwrite a change made elsewhere after the form opened', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c1/edit' });
    const phone = store.getSnapshot().state.customers['rahman-c1']!.phone;
    await screen.findByRole('heading', { name: 'কাস্টমারের তথ্য বদলান' });
    await act(() =>
      store.dispatch({ type: 'customer.updated', customerId: 'rahman-c1', baseVersion: 1, changes: { notes: 'অন্য ডিভাইস থেকে' } }),
    );

    await userEvent.clear(screen.getByLabelText('ফোন'));
    await userEvent.type(screen.getByLabelText('ফোন'), '01799999999');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'এর মধ্যে অন্য কেউ এটি বদলেছেন। নতুন তথ্য দেখে আবার চেষ্টা করুন।',
    );
    expect(store.getSnapshot().state.customers['rahman-c1']).toMatchObject({ phone, notes: 'অন্য ডিভাইস থেকে' });
    expect(screen.getByLabelText('ফোন')).toHaveProperty('value', '01799999999');
  });

  it('asks before leaving with unsaved changes', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/new' });
    await userEvent.type(await screen.findByLabelText('নাম'), 'ক');
    await userEvent.click(screen.getByRole('link', { name: 'অর্ডার' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
  });

  it('shows the other customer’s values, not what was typed, when the route target changes', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/new' });
    await userEvent.type(await screen.findByLabelText('নাম'), 'টাইপ করা নাম');
    await act(() => router.navigate('/app/customers/rahman-c1/edit'));
    await userEvent.click(await screen.findByRole('button', { name: 'সেভ না করে যান' }));

    expect(await screen.findByRole('heading', { name: 'কাস্টমারের তথ্য বদলান' })).toBeTruthy();
    const customer = store.getSnapshot().state.customers['rahman-c1']!;
    expect(screen.getByLabelText('নাম')).toHaveProperty('value', customer.name);
  });

  it('is only for staff who may edit customers', async () => {
    await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/customers/new',
      as: { staffId: 'nakshi-cutting', pin: '3333' },
    });
    expect((await screen.findByRole('alert')).textContent).toBe('এই অংশ দেখার অনুমতি আপনার নেই।');
  });
});
