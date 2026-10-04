import { useId } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { rovingTabsKeyDown } from './rovingTabs';

export interface ViewTab {
  value: string;
  label: string;
  count?: number | undefined;
}

export interface ViewTabsProps {
  /** Accessible name of the tab list. */
  label: string;
  views: ViewTab[];
  value: string;
  onChange(value: string): void;
}

/** A row of view tabs with a count badge each; the selected one has a brand underline. Arrow keys move between tabs. */
export function ViewTabs({ label, views, value, onChange }: ViewTabsProps) {
  const { number } = useI18n();
  const base = useId();
  const idOf = (key: string) => `${base}-${key}`;
  const keys = views.map((v) => v.value);
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={rovingTabsKeyDown(keys, value, onChange, idOf)}
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {views.map((view) => {
        const selected = view.value === value;
        return (
          <button
            key={view.value}
            id={idOf(view.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(view.value)}
            className={`-mb-px inline-flex min-h-10 shrink-0 items-center gap-2 border-b-[3px] px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              selected ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {view.label}
            {view.count !== undefined && (
              <span className={`rounded-full px-2 text-xs ${selected ? 'bg-brand-soft text-brand-strong' : 'bg-surface text-muted'}`}>{number(view.count)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
