import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';
import { ChoiceGroup } from './ChoiceGroup';
import { SelectField } from './SelectField';
import { TextAreaField } from './TextAreaField';
import { chooseOption } from '../test/chooseOption';

describe('SelectField', () => {
  it('links its label and reports the chosen value', async () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="পোশাক"
        value="shirt"
        options={[
          { value: 'shirt', label: 'শার্ট' },
          { value: 'pant', label: 'প্যান্ট' },
        ]}
        onChange={onChange}
      />,
    );
    await chooseOption(screen.getByLabelText('পোশাক'), 'প্যান্ট');
    expect(onChange).toHaveBeenCalledWith('pant');
  });

  it('shows an error next to the field', () => {
    render(<SelectField label="পোশাক" value="" options={[]} onChange={() => {}} error="পোশাক বেছে নিন" />);
    const select = screen.getByLabelText('পোশাক');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe(screen.getByText('পোশাক বেছে নিন').id);
  });
});

describe('TextAreaField', () => {
  it('links its label and error', async () => {
    const onChange = vi.fn();
    render(<TextAreaField label="নোট" error="নোট লিখুন" onChange={(e) => onChange(e.target.value)} />);
    await userEvent.type(screen.getByLabelText('নোট'), 'ক');
    expect(onChange).toHaveBeenLastCalledWith('ক');
    expect(screen.getByLabelText('নোট').getAttribute('aria-describedby')).toBe(screen.getByText('নোট লিখুন').id);
  });
});

describe('ChoiceGroup', () => {
  function Harness() {
    const [value, setValue] = useState<'male' | 'female' | null>(null);
    return (
      <ChoiceGroup
        legend="লিঙ্গ"
        value={value}
        onChange={setValue}
        options={[
          { value: 'male', label: 'পুরুষ' },
          { value: 'female', label: 'মহিলা' },
        ]}
      />
    );
  }

  it('is a named group of radios with one choice', async () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'লিঙ্গ' })).toBeTruthy();
    await userEvent.click(screen.getByRole('radio', { name: 'মহিলা' }));
    expect(screen.getByRole('radio', { name: 'মহিলা' })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: 'পুরুষ' })).toHaveProperty('checked', false);
  });
});

describe('Checkbox', () => {
  it('toggles and shows its error', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="মাপ ঠিক আছে" checked={false} onChange={onChange} error="টিক দিন" />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'মাপ ঠিক আছে' }));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('checkbox').getAttribute('aria-describedby')).toBe(screen.getByText('টিক দিন').id);
  });
});
