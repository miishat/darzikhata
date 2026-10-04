import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { FilterButton } from './FilterButton';
import { FilterChip } from './FilterChip';
import { Kbd } from './Kbd';
import { SelectionBar } from './SelectionBar';
import { ViewTabs, viewTabId } from './ViewTabs';

const inBangla = (ui: ReactNode) => render(<I18nProvider fallback="bn">{ui}</I18nProvider>);

const VIEWS = [
  { value: 'all', label: 'সব', count: 12 },
  { value: 'late', label: 'দেরি', count: 3 },
  { value: 'done', label: 'তৈরি', count: 5 },
];

function Tabs() {
  const [value, setValue] = useState('all');
  return <ViewTabs label="ভিউ" views={VIEWS} value={value} onChange={setValue} />;
}

describe('ViewTabs', () => {
  it('marks the selected tab and moves selection and focus with the arrows', async () => {
    inBangla(<Tabs />);
    expect(screen.getByRole('tablist', { name: 'ভিউ' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /সব/ }).getAttribute('aria-selected')).toBe('true');
    screen.getByRole('tab', { name: /সব/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /দেরি/ }).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /দেরি/ }));
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /তৈরি/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('links its tabs to the panel they control', () => {
    inBangla(
      <>
        <ViewTabs label="ভিউ" views={VIEWS} value="late" onChange={() => {}} panelId="rows" />
        <div role="tabpanel" id="rows" aria-labelledby={viewTabId('rows', 'late')} />
      </>,
    );
    const tab = screen.getByRole('tab', { name: /দেরি/ });
    expect(tab.getAttribute('aria-controls')).toBe('rows');
    expect(screen.getByRole('tabpanel', { name: /দেরি/ })).toBeTruthy();
  });

  it('keeps one tab stop when no tab is selected', () => {
    inBangla(<ViewTabs label="ভিউ" views={VIEWS} value="" onChange={() => {}} />);
    expect(screen.getAllByRole('tab').map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it('moves to the second tab on ArrowRight when no tab is selected', async () => {
    const onChange = vi.fn();
    inBangla(<ViewTabs label="ভিউ" views={VIEWS} value="" onChange={onChange} />);
    screen.getAllByRole('tab')[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('late');
  });

  it('shows a count badge in each tab', () => {
    inBangla(<Tabs />);
    expect(screen.getByRole('tab', { name: /দেরি/ }).textContent).toContain('৩');
  });
});

describe('FilterChip', () => {
  it('names its remove button after the label and calls onRemove', async () => {
    const onRemove = vi.fn();
    inBangla(<FilterChip label="দেরি" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'দেরি সরান' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});

describe('FilterButton', () => {
  it('opens a popover holding the options and closes on Escape', async () => {
    inBangla(
      <FilterButton label="কারিগর">
        <button type="button">রহিম</button>
      </FilterButton>,
    );
    const trigger = screen.getByRole('button', { name: 'কারিগর' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('রহিম')).toBeNull();
    await userEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('group', { name: 'কারিগর বাছাই' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'রহিম' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('রহিম')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('FilterButton focus', () => {
  it('closes when focus leaves it, and stays open on focus moves inside', async () => {
    inBangla(
      <>
        <FilterButton label="কারিগর">
          <button type="button">রহিম</button>
        </FilterButton>
        <button type="button">বাইরে</button>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'কারিগর' }));
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'রহিম' })).toBeTruthy();
    await userEvent.tab();
    expect(screen.queryByRole('button', { name: 'রহিম' })).toBeNull();
  });
});

describe('Kbd', () => {
  it('renders the key and hides from assistive tech', () => {
    render(<Kbd>N</Kbd>);
    const el = screen.getByText('N');
    expect(el.tagName).toBe('KBD');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('SelectionBar', () => {
  it('renders nothing at zero', () => {
    inBangla(<SelectionBar count={0} onClear={() => {}} />);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('announces the count, holds actions and clears', async () => {
    const onClear = vi.fn();
    inBangla(
      <SelectionBar count={3} onClear={onClear}>
        <button type="button">ধাপ বদলান</button>
      </SelectionBar>,
    );
    const region = screen.getByRole('region', { name: 'বাছাই করা পোশাক' });
    expect(region.textContent).toContain('৩টি পোশাক বাছাই করা');
    expect(screen.getByRole('button', { name: 'ধাপ বদলান' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'বাছাই মুছুন' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
