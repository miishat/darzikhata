import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { chooseOption } from '../../test/chooseOption';

describe('Customer form on a phone', () => {
  it('adds a customer with a new household from the header Save', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/customers/new' });
    expect(await screen.findByRole('heading', { name: 'নতুন কাস্টমার' })).toBeTruthy();
    await userEvent.type(screen.getByLabelText('নাম'), 'সুমি আক্তার');
    await userEvent.type(screen.getByLabelText('ফোন'), '০১৮১১০০০০০০');
    await userEvent.click(screen.getByRole('radio', { name: 'মহিলা' }));
    await chooseOption(screen.getByLabelText('পরিবার'), 'নতুন পরিবার');
    await userEvent.type(screen.getByLabelText('পরিবারের নাম'), 'আক্তার পরিবার');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByRole('heading', { name: 'সুমি আক্তার' })).toBeTruthy();
    const { state } = store.getSnapshot();
    const saved = Object.values(state.customers).find((c) => c.name === 'সুমি আক্তার')!;
    expect(saved).toMatchObject({ phone: '01811000000', gender: 'female' });
    expect(state.households[saved.householdId!]!.label).toBe('আক্তার পরিবার');
  });

  it('shows problems under the rows and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/customers/new' });
    const before = Object.keys(store.getSnapshot().state.customers).length;
    await userEvent.type(await screen.findByLabelText('ফোন'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(screen.getByText('নাম লিখুন')).toBeTruthy();
    expect(screen.getByLabelText('ফোন').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('ফোন নম্বর ঠিক নেই, ১১ সংখ্যার মোবাইল নম্বর দিন')).toBeTruthy();
    expect(Object.keys(store.getSnapshot().state.customers)).toHaveLength(before);
  });

  it('edits a customer and Cancel in the header goes back to the profile', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/customers/rahman-c1/edit' });
    const customer = store.getSnapshot().state.customers['rahman-c1']!;
    expect(await screen.findByLabelText('নাম')).toHaveProperty('value', customer.name);

    await userEvent.type(screen.getByLabelText('নোট'), 'ঢিলা ফিটিং');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    expect(await screen.findByText('ঢিলা ফিটিং')).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c1']).toMatchObject({ notes: 'ঢিলা ফিটিং', version: 2 });
  });

  it('Cancel leaves without saving', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/customers/rahman-c1/edit' });
    await userEvent.click(await screen.findByRole('link', { name: 'বাতিল' }));
    expect(await screen.findByRole('heading', { name: store.getSnapshot().state.customers['rahman-c1']!.name })).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c1']!.version).toBe(1);
  });
});
