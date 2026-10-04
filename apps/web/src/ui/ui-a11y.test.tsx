import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { Dialog } from './Dialog';
import { PinPad } from './PinPad';

describe('PinPad focus', () => {
  it('shows a visible focus ring on the focusable group', () => {
    render(
      <I18nProvider>
        <PinPad label="পিন" onComplete={() => {}} />
      </I18nProvider>,
    );
    const group = screen.getByRole('group', { name: 'পিন' });
    expect(group.getAttribute('tabindex')).toBe('0');
    expect(group.className).toContain('focus-visible:outline-2');
    expect(group.className).toContain('focus-visible:outline-focus');
    expect(group.className).not.toContain('outline-none');
  });
});

describe('Dialog keyboard', () => {
  const setup = (onClose = vi.fn()) => {
    render(
      <>
        <button>outside</button>
        <Dialog open title="T" onClose={onClose} actions={<><button>first</button><button>last</button></>} />
      </>,
    );
    return onClose;
  };

  it('closes on Escape even when focus is outside the panel', async () => {
    const onClose = setup();
    screen.getByRole('button', { name: 'outside' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps Tab from the last focusable to the first', async () => {
    setup();
    screen.getByRole('button', { name: 'last' }).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
  });

  it('wraps Shift+Tab from the first focusable to the last', async () => {
    setup();
    screen.getByRole('button', { name: 'first' }).focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'last' }));
  });
});
