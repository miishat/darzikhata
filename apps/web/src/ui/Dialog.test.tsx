import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('renders under document.body, outside a stacking-context ancestor such as a sticky header', () => {
    render(
      <header data-testid='header' className="sticky top-0 z-10">
        <Dialog open title="সিঙ্ক" onClose={() => {}} />
      </header>,
    );
    const dialog = screen.getByRole('dialog', { name: 'সিঙ্ক' });
    expect(screen.getByTestId('header').contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });
});
