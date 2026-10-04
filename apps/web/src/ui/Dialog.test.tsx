import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

describe('Dialog Escape', () => {
  it('closes only the top-most of nested dialogs', async () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <>
        <Dialog open title="বাইরে" onClose={outer} />
        <Dialog open title="ভেতরে" onClose={inner} />
      </>,
    );
    await userEvent.keyboard('{Escape}');
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });
});

describe('Dialog edge', () => {
  it('uses the raised-line token so the hairline shows in dark only', () => {
    render(<Dialog open title="edge" onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'edge' });
    expect(dialog.className).toContain('ring-raised-line');
    expect(dialog.className).not.toMatch(/ring-line/);
  });
});
