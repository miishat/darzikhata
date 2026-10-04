import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

afterEach(() => document.documentElement.removeAttribute('data-theme'));

describe('Colour theme on More', () => {
  it('lets this device choose light, dark or the device setting', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/more' });
    const auto = await screen.findByRole('radio', { name: 'ডিভাইস অনুযায়ী' });
    expect((auto as HTMLInputElement).checked).toBe(true);

    await userEvent.click(screen.getByRole('radio', { name: 'গাঢ়' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('dk.theme')).toBe('dark');

    await userEvent.click(screen.getByRole('radio', { name: 'হালকা' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await userEvent.click(screen.getByRole('radio', { name: 'ডিভাইস অনুযায়ী' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
