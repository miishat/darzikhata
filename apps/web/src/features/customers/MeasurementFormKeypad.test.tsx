import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Measurement form on a phone', () => {
  it('uses the in-app keypad instead of the phone keyboard', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/customers/nakshi-c10/measure/bridal-lehenga' });
    const input = (await screen.findAllByRole('textbox'))[0]!;
    expect(input.getAttribute('inputmode')).toBe('none');
    await userEvent.click(input);
    expect(await screen.findByRole('button', { name: 'পরের মাপ' })).toBeTruthy();
  });
});
