import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

afterEach(() => document.documentElement.removeAttribute('data-theme'));

describe('Colour theme on More', () => {
  it('lets this device choose light, dark or the device setting', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/more' });
    const light = await screen.findByRole('radio', { name: 'হালকা' });
    expect((light as HTMLInputElement).checked).toBe(true);

    await userEvent.click(screen.getByRole('radio', { name: 'গাঢ়' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('dk.theme')).toBe('dark');

    await userEvent.click(screen.getByRole('radio', { name: 'হালকা' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await userEvent.click(screen.getByRole('radio', { name: 'ডিভাইস অনুযায়ী' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('Measurement keypad setting on More', () => {
  it('is on by default on a phone and can be turned off for this device', async () => {
    window.localStorage.removeItem('dk.keypad');
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/more' });
    const box = (await screen.findByRole('checkbox', { name: 'মাপের কিপ্যাড' })) as HTMLInputElement;
    expect(box.checked).toBe(true);
    await userEvent.click(box);
    expect(box.checked).toBe(false);
    expect(window.localStorage.getItem('dk.keypad')).toBe('off');
  });
});
