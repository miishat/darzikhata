import { takaToPoisha } from '@darzikhata/domain';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { Bell } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { Avatar, firstCluster, initialsOf } from './Avatar';
import { BottomBar } from './BottomBar';
import { ChipGroup } from './ChipGroup';
import { DueLabel } from './DueLabel';
import { IconButton } from './IconButton';
import { MeasureKeypad } from './MeasureKeypad';
import { PaidBar } from './PaidBar';
import { StagePill } from './StagePill';
import { StageTracker } from './StageTracker';

const state = vi.hoisted(() => ({ money: true, today: '2026-10-04' }));
vi.mock('../features/common/hooks', () => ({
  useToday: () => state.today,
  useCan: () => () => state.money,
}));

const inBangla = (ui: ReactNode) => render(<I18nProvider fallback="bn">{ui}</I18nProvider>);

beforeEach(() => {
  state.money = true;
  state.today = '2026-10-04';
  window.localStorage.clear();
});

describe('StagePill', () => {
  it('shows the label with tone classes', () => {
    inBangla(<StagePill label="সেলাই চলছে" tone="working" />);
    const pill = screen.getByText('সেলাই চলছে');
    expect(pill.className).toContain('bg-tone-working-bg');
    expect(pill.className).toContain('text-tone-working-fg');
  });
});

describe('DueLabel', () => {
  it('flags a late date with the warning style', () => {
    inBangla(<DueLabel date="2026-10-01" />);
    const label = screen.getByText('৩ দিন দেরি');
    expect(label.closest('span[class*="bg-warn-soft"]')?.className).toContain('font-semibold');
  });

  it('shows plain muted text for upcoming dates', () => {
    inBangla(<DueLabel date="2026-10-05" />);
    expect(screen.getByText('কাল').className).toContain('text-muted');
    state.today = '2026-10-04';
    inBangla(<DueLabel date="2026-10-04" />);
    expect(screen.getByText('আজ')).toBeTruthy();
  });
});

describe('Avatar', () => {
  it('shows a Bangla letter with its vowel sign, hidden from assistive tech', () => {
    expect(initialsOf('মোহাম্মদ')).toBe('মো');
    inBangla(<Avatar id="c1" name="মোহাম্মদ" />);
    const avatar = screen.getByText('মো');
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps a conjunct whole, with or without Intl.Segmenter', () => {
    expect(initialsOf('স্বপন')).toBe('স্ব');
    expect(firstCluster('স্বপন', true)).toBe('স্ব');
    expect(firstCluster('স্বপন', false)).toBe('স্ব');
    expect(firstCluster('মোহাম্মদ', false)).toBe('মো');
  });

  it('falls back to the first character when the engine cannot build the lookbehind pattern', () => {
    const real = globalThis.RegExp;
    vi.stubGlobal(
      'RegExp',
      function (pattern: string | RegExp, flags?: string) {
        if (typeof pattern === 'string' && pattern.includes('(?<=')) throw new SyntaxError('Invalid regular expression');
        return new real(pattern, flags);
      },
    );
    try {
      expect(firstCluster('স্বপন', false)).toBe('স');
      expect(firstCluster('Rahim', false)).toBe('R');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses two initials for two Latin words', () => {
    expect(initialsOf('rahim khan')).toBe('RK');
  });
});

describe('PaidBar', () => {
  it('is an image with a readable name', () => {
    inBangla(<PaidBar paid={takaToPoisha(200)} total={takaToPoisha(500)} />);
    expect(screen.getByRole('img', { name: '৳৫০০ এর মধ্যে ৳২০০ জমা' })).toBeTruthy();
  });

  it('is hidden without money.view', () => {
    state.money = false;
    inBangla(<PaidBar paid={takaToPoisha(200)} total={takaToPoisha(500)} />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('ChipGroup', () => {
  const options = [
    { value: 'all', label: 'সব', count: 12 },
    { value: 'ready', label: 'তৈরি' },
  ];

  it('is a named group of pressed-state buttons that report changes', async () => {
    const onChange = vi.fn();
    inBangla(<ChipGroup label="অবস্থা" options={options} value="all" onChange={onChange} />);
    const group = screen.getByRole('group', { name: 'অবস্থা' });
    expect(within(group).getByRole('button', { name: /সব/ }).getAttribute('aria-pressed')).toBe('true');
    const ready = within(group).getByRole('button', { name: 'তৈরি' });
    expect(ready.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(ready);
    expect(onChange).toHaveBeenCalledWith('ready');
  });
});

describe('IconButton', () => {
  it('names the button and hides the icon', () => {
    inBangla(<IconButton label="নোটিফিকেশন" icon={Bell} />);
    const button = screen.getByRole('button', { name: 'নোটিফিকেশন' });
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('BottomBar', () => {
  it('renders its children in a fixed bar', () => {
    inBangla(
      <BottomBar>
        <button type="button">সেভ</button>
      </BottomBar>,
    );
    expect(screen.getByRole('button', { name: 'সেভ' }).parentElement?.className).toContain('fixed');
  });
});

const STAGES = ['booked', 'cutting', 'sewing', 'trial', 'finishing', 'ready', 'delivered', 'closed'].map((key) => ({
  key,
  label: key,
  skipped: key === 'trial',
}));

describe('StageTracker', () => {
  it('marks the current step and the done steps', () => {
    inBangla(<StageTracker stages={STAGES.slice(0, 5)} currentKey="sewing" />);
    const list = screen.getByRole('list', { name: 'ধাপ' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[2]!.getAttribute('aria-current')).toBe('step');
    expect(items.filter((li) => li.getAttribute('aria-current') === 'step')).toHaveLength(1);
    expect(items[0]!.querySelector('svg')).toBeTruthy();
    expect(items[3]!.querySelector('svg')).toBeNull();
  });

  it('draws a skipped step dashed', () => {
    inBangla(<StageTracker stages={STAGES.slice(0, 5)} currentKey="finishing" />);
    const items = screen.getAllByRole('listitem');
    expect(items[3]!.innerHTML).toContain('border-dashed');
  });

  it('collapses done steps of a long list into a count step', () => {
    inBangla(<StageTracker stages={STAGES} currentKey="finishing" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items[0]!.textContent).toContain('+৩');
    expect(items[2]!.getAttribute('aria-current')).toBe('step');
  });
});

describe('MeasureKeypad', () => {
  function Harness({ onNext = () => {} }: { onNext?: () => void }) {
    const [value, setValue] = useState('');
    return <MeasureKeypad value={value} onChange={setValue} onNext={onNext} label="বুক" previous="৩৬¾" />;
  }

  it('builds a measurement and replaces a fraction', async () => {
    inBangla(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: '৩' }));
    await userEvent.click(screen.getByRole('button', { name: '৮' }));
    await userEvent.click(screen.getByRole('button', { name: 'অর্ধেক' }));
    expect(screen.getByTestId('keypad-value').textContent).toBe('৩৮.৫');
    await userEvent.click(screen.getByRole('button', { name: 'তিন চতুর্থাংশ' }));
    expect(screen.getByTestId('keypad-value').textContent).toBe('৩৮.৭৫');
  });

  it('names the value display with the measurement label', async () => {
    inBangla(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: '৩' }));
    expect(screen.getByTestId('keypad-value').getAttribute('aria-label')).toBe('বুক ৩');
  });

  it('deletes one character and moves on', async () => {
    const onNext = vi.fn();
    inBangla(<Harness onNext={onNext} />);
    await userEvent.click(screen.getByRole('button', { name: '৩' }));
    await userEvent.click(screen.getByRole('button', { name: '৮' }));
    await userEvent.click(screen.getByRole('button', { name: 'মুছুন' }));
    expect(screen.getByTestId('keypad-value').textContent).toBe('৩');
    await userEvent.click(screen.getByRole('button', { name: 'পরের মাপ' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('names every special key and gives the 50 px height', () => {
    inBangla(<Harness />);
    for (const name of ['এক চতুর্থাংশ', 'অর্ধেক', 'তিন চতুর্থাংশ', 'দশমিক', 'মুছুন', 'পরের মাপ']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: '৫' }).className).toContain('h-[50px]');
  });
});
