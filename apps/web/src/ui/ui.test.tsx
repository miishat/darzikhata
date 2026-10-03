import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { NumberField } from './NumberField';
import { PinPad } from './PinPad';
import { TextField } from './TextField';

const inBangla = (ui: ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

describe('Button', () => {
  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('type')).toBe('button');
  });
});

describe('TextField', () => {
  it('links the label, error and input', () => {
    render(<TextField label="নাম" error="নাম লাগবে" />);
    const input = screen.getByLabelText('নাম');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByText('নাম লাগবে').id);
  });
});

describe('NumberField', () => {
  it('reads Bangla fractions as measurements', async () => {
    const onValueChange = vi.fn();
    inBangla(<NumberField label="বুক" kind="measurement" onValueChange={onValueChange} suffix="ইঞ্চি" />);
    await userEvent.type(screen.getByLabelText('বুক'), '৩৮½');
    expect(onValueChange).toHaveBeenLastCalledWith(38.5);
    expect(screen.getByText('ইঞ্চি')).toBeTruthy();
  });

  it('reformats on blur and reports empty as null', async () => {
    const onValueChange = vi.fn();
    inBangla(<NumberField label="হাতা" kind="measurement" onValueChange={onValueChange} />);
    const input = screen.getByLabelText('হাতা') as HTMLInputElement;
    await userEvent.type(input, '23 1/4');
    await userEvent.tab();
    expect(input.value).toBe('২৩¼');
    await userEvent.clear(input);
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it('shows an error for unreadable text and reports null so no stale value survives', async () => {
    const onValueChange = vi.fn();
    inBangla(<NumberField label="বুক" kind="measurement" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByLabelText('বুক'), 'abc');
    expect(screen.getByText('মাপ বোঝা যায়নি। যেমন ৩৮½ বা 38.5 লিখুন')).toBeTruthy();
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it('drops a valid money value to null once it turns unreadable', async () => {
    const onValueChange = vi.fn();
    inBangla(<NumberField label="অগ্রিম" kind="money" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByLabelText('অগ্রিম'), '1000');
    expect(onValueChange).toHaveBeenLastCalledWith(100000);
    await userEvent.type(screen.getByLabelText('অগ্রিম'), 'x');
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it('reports money in poisha and shows the initial value in taka', async () => {
    const onValueChange = vi.fn();
    inBangla(<NumberField label="অগ্রিম" kind="money" initialValue={100000} onValueChange={onValueChange} />);
    const input = screen.getByLabelText('অগ্রিম') as HTMLInputElement;
    expect(input.value).toBe('১০০০');
    await userEvent.clear(input);
    await userEvent.type(input, '১,৫০০');
    expect(onValueChange).toHaveBeenLastCalledWith(150000);
  });
});

describe('PinPad', () => {
  it('shows Bangla digits and completes after four presses', async () => {
    const onComplete = vi.fn();
    inBangla(<PinPad label="পিন" onComplete={onComplete} />);
    for (const digit of ['৪', '৪', '৪']) await userEvent.click(screen.getByRole('button', { name: digit }));
    expect(onComplete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '৪' }));
    expect(onComplete).toHaveBeenCalledWith('4444');
  });

  it('deletes the last digit and accepts typed digits', async () => {
    const onComplete = vi.fn();
    inBangla(<PinPad label="পিন" onComplete={onComplete} />);
    await userEvent.click(screen.getByRole('button', { name: '৯' }));
    await userEvent.click(screen.getByRole('button', { name: 'শেষ সংখ্যা মুছুন' }));
    screen.getByRole('group', { name: 'পিন' }).focus();
    await userEvent.keyboard('12৩4');
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('announces errors', () => {
    inBangla(<PinPad label="পিন" error="পিন মেলেনি" onComplete={() => {}} />);
    expect(screen.getByText('পিন মেলেনি')).toBeTruthy();
  });
});

describe('Dialog', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>open</button>
        <Dialog open={open} title="নিশ্চিত?" onClose={() => setOpen(false)} actions={<button>ok</button>}>
          body
        </Dialog>
      </>
    );
  }

  it('opens with focus inside, closes on Escape and restores focus', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'open' });
    await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'নিশ্চিত?' });
    expect(document.activeElement).toBe(dialog);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
