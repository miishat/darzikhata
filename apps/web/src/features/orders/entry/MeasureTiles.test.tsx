import { STARTER_TEMPLATES } from '@darzikhata/domain';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../i18n/I18nProvider';
import { MeasureTiles } from './MeasureTiles';

const shirt = STARTER_TEMPLATES.find((t) => t.id === 'shirt')!;

function Harness({ previous = {}, onDone = () => {} }: { previous?: Record<string, number>; onDone?: () => void }) {
  const [values, setValues] = useState<Record<string, number>>({});
  return (
    <I18nProvider fallback="bn">
      <MeasureTiles template={shirt} values={values} previous={previous} errors={{}} onChange={setValues} onDone={onDone} />
      <output data-testid="values">{JSON.stringify(values)}</output>
    </I18nProvider>
  );
}

afterEach(() => localStorage.clear());

describe('MeasureTiles', () => {
  it('opens the keypad from a tile, builds the text and parses it in the domain', async () => {
    render(<Harness />);
    expect(screen.queryByRole('group', { name: 'মাপের কিপ্যাড' })).toBeNull();
    const chest = screen.getByLabelText('বুক');
    expect(chest.getAttribute('inputmode')).toBe('none');
    await userEvent.click(chest);
    expect(screen.getByRole('group', { name: 'মাপের কিপ্যাড' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '৩' }));
    await userEvent.click(screen.getByRole('button', { name: '৮' }));
    await userEvent.click(screen.getByRole('button', { name: 'এক চতুর্থাংশ' }));
    expect((chest as HTMLInputElement).value).toBe('৩৮¼');
    expect(screen.getByTestId('values').textContent).toBe('{"chest":38.25}');
  });

  it('still takes typed text', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('বুক'), '38');
    expect(screen.getByTestId('values').textContent).toBe('{"chest":38}');
  });

  it('shows the previous value only when the new one differs', async () => {
    render(<Harness previous={{ chest: 38, waist: 34 }} />);
    expect(screen.queryByText(/^আগে /)).toBeNull();
    await userEvent.type(screen.getByLabelText('বুক'), '38.25');
    await userEvent.type(screen.getByLabelText('পেট'), '34');
    const badge = screen.getByText('আগে ৩৮');
    expect(badge.className).toContain('text-warn-ink');
    expect(screen.getAllByText(/^আগে /)).toHaveLength(1);
  });

  it('moves to the next field, and past the last one to the next step', async () => {
    const onDone = vi.fn();
    render(<Harness onDone={onDone} />);
    await userEvent.click(screen.getByLabelText('ঝুল'));
    const group = () => screen.getByRole('group', { name: 'মাপের কিপ্যাড' });
    expect(group().textContent).toContain('ঝুল');
    await userEvent.click(screen.getByRole('button', { name: 'পরের মাপ' }));
    expect(group().textContent).toContain('বুক');
    expect(document.activeElement).toBe(screen.getByLabelText('বুক'));

    await userEvent.click(screen.getByLabelText('গলা'));
    await userEvent.click(screen.getByRole('button', { name: 'পরের মাপ' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group', { name: 'মাপের কিপ্যাড' })).toBeNull();
  });

  it('uses the system keyboard and no keypad when the setting is off', async () => {
    localStorage.setItem('dk.keypad', 'off');
    render(<Harness />);
    const chest = screen.getByLabelText('বুক');
    expect(chest.getAttribute('inputmode')).toBe('decimal');
    await userEvent.click(chest);
    expect(screen.queryByRole('group', { name: 'মাপের কিপ্যাড' })).toBeNull();
  });
});
