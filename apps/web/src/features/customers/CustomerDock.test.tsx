import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Customer dock', () => {
  it('starts as a small new-measurement tab, opens, and hides again', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/customers/nakshi-c10' });
    const tab = await screen.findByRole('button', { name: 'বার দেখান' });
    expect(tab.textContent).toBe('নতুন মাপ');
    expect(screen.queryByRole('link', { name: 'আবার অর্ডার' })).toBeNull();
    expect(document.documentElement.dataset.dockOpen).toBeUndefined();

    await userEvent.click(tab);
    expect(screen.getByRole('link', { name: 'আবার অর্ডার' })).toBeTruthy();
    expect(document.documentElement.dataset.dockOpen).toBe('1');

    await userEvent.click(screen.getByRole('button', { name: 'বার লুকান' }));
    expect(screen.queryByRole('link', { name: 'আবার অর্ডার' })).toBeNull();
    expect(screen.getByRole('button', { name: 'বার দেখান' })).toBeTruthy();
  });
});
