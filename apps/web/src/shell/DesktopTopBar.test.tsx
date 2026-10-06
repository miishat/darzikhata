import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

const bar = () => within(screen.getByRole('banner'));

afterEach(() => document.documentElement.removeAttribute('data-theme'));

describe('Desktop top bar', () => {
  it('says what the search finds', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const search = await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' });
    expect(search.getAttribute('placeholder')).toBe('অর্ডার নম্বর, কাস্টমারের নাম বা ফোন খুঁজুন');
  });

  it('switches language from either half of the language control', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const group = within(await screen.findByRole('group', { name: 'ভাষা' }));
    expect(group.getByRole('button', { name: 'বাংলা' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(group.getByRole('button', { name: 'English' }));
    const english = within(screen.getByRole('group', { name: 'Language' }));
    expect(english.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('true');
    expect(english.getByRole('button', { name: 'বাংলা' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('steps the theme through light, dark and the device setting', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.click(await screen.findByRole('button', { name: 'রঙের থিম: হালকা' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: 'রঙের থিম: গাঢ়' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(screen.getByRole('button', { name: 'রঙের থিম: ডিভাইস অনুযায়ী' })).toBeTruthy();
  });

  it('offers New Customer and New Order to those who may make them', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('heading', { name: 'হোম' });
    expect(bar().getByRole('link', { name: 'নতুন কাস্টমার' }).getAttribute('href')).toBe('/app/customers/new');
    expect(bar().getByRole('link', { name: /^নতুন অর্ডার/ }).getAttribute('href')).toBe('/app/orders/new');
  });

  it('leaves them out for a tailor', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/work', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    await screen.findByRole('group', { name: 'ভাষা' });
    expect(bar().queryByRole('link', { name: 'নতুন কাস্টমার' })).toBeNull();
    expect(bar().queryByRole('link', { name: /^নতুন অর্ডার/ })).toBeNull();
  });
});
