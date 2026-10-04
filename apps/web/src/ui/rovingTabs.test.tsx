import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { rovingTabsKeyDown } from './rovingTabs';

const KEYS = ['a', 'b', 'c'] as const;
type Key = (typeof KEYS)[number];

function Tabs() {
  const [current, setCurrent] = useState<Key>('a');
  return (
    <div role="tablist" onKeyDown={rovingTabsKeyDown(KEYS, current, setCurrent, (k) => `tab-${k}`)}>
      {KEYS.map((k) => (
        <button key={k} id={`tab-${k}`} role="tab" aria-selected={k === current} tabIndex={k === current ? 0 : -1} onClick={() => setCurrent(k)}>
          {k}
        </button>
      ))}
    </div>
  );
}

describe('rovingTabsKeyDown', () => {
  it('moves selection and focus with the arrows, wrapping at both ends, and keeps one tab stop', async () => {
    render(<Tabs />);
    screen.getByRole('tab', { name: 'a' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'b' }));
    expect(screen.getByRole('tab', { name: 'b' }).getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('tab', { name: 'a' }).getAttribute('tabindex')).toBe('-1');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'c' }));
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'a' }));
  });

  it('jumps to the first and last tab with Home and End and ignores other keys', async () => {
    render(<Tabs />);
    screen.getByRole('tab', { name: 'a' }).focus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'c' }).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'c' }));
    await userEvent.keyboard('x');
    expect(screen.getByRole('tab', { name: 'c' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'a' }));
    expect(screen.getByRole('tab', { name: 'a' }).getAttribute('aria-selected')).toBe('true');
  });
});
