import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShellProvider } from '../shell/ShellPreference';
import { Dialog } from './Dialog';
import { Select } from './Select';

const OPTIONS = [
  { value: 'shirt', label: 'শার্ট' },
  { value: 'pant', label: 'প্যান্ট' },
  { value: 'panjabi', label: 'পাঞ্জাবি' },
];

function Picker({ onChange = () => {} }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('shirt');
  return (
    <Select
      label="পোশাক"
      value={value}
      options={OPTIONS}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('Select on a desktop', () => {
  beforeEach(() => window.localStorage.setItem('dk.layout', 'desktop'));

  it('opens a list with the chosen option ticked and picks with a click', async () => {
    const onChange = vi.fn();
    render(
      <ShellProvider>
        <Picker onChange={onChange} />
      </ShellProvider>,
    );
    const box = screen.getByRole('combobox', { name: 'পোশাক' });
    expect(box.textContent).toBe('শার্ট');
    expect(box.getAttribute('aria-expanded')).toBe('false');

    await userEvent.click(box);
    expect(box.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('listbox', { name: 'পোশাক' });
    expect(box.getAttribute('aria-controls')).toBe(list.id);
    expect(screen.getByRole('option', { name: 'শার্ট' }).getAttribute('aria-selected')).toBe('true');

    await userEvent.click(screen.getByRole('option', { name: 'পাঞ্জাবি' }));
    expect(onChange).toHaveBeenCalledWith('panjabi');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box.textContent).toBe('পাঞ্জাবি');
    expect(document.activeElement).toBe(box);
  });

  it('moves with the arrow keys, picks with Enter and jumps by typing', async () => {
    render(
      <ShellProvider>
        <Picker />
      </ShellProvider>,
    );
    const box = screen.getByRole('combobox', { name: 'পোশাক' });
    box.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(box.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'শার্ট' }).id);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(box.textContent).toBe('প্যান্ট');

    await userEvent.keyboard('{End}');
    expect(box.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'পাঞ্জাবি' }).id);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box.textContent).toBe('প্যান্ট');

    await userEvent.keyboard('শ');
    expect(box.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'শার্ট' }).id);
  });

  it('closes only its list on Escape inside a dialog, and picking keeps the dialog open', async () => {
    const onClose = vi.fn();
    render(
      <ShellProvider>
        <Dialog open title="বদলান" onClose={onClose}>
          <Picker />
        </Dialog>
      </ShellProvider>,
    );
    const box = screen.getByRole('combobox', { name: 'পোশাক' });
    await userEvent.click(box);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(box);
    await userEvent.click(screen.getByRole('option', { name: 'প্যান্ট' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(box.textContent).toBe('প্যান্ট');
  });
});

describe('Select on a phone', () => {
  beforeEach(() => window.localStorage.setItem('dk.layout', 'mobile'));

  it('keeps the browser’s own picker', async () => {
    render(
      <ShellProvider>
        <Picker />
      </ShellProvider>,
    );
    const box = screen.getByLabelText('পোশাক');
    expect(box.tagName).toBe('SELECT');
    await userEvent.selectOptions(box, 'প্যান্ট');
    expect((box as HTMLSelectElement).value).toBe('pant');
  });
});
