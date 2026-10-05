import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { rovingTabsKeyDown } from './rovingTabs';

export interface ViewTab {
  value: string;
  label: string;
  count?: number | undefined;
  /** Tiles only: an icon beside the count, shown when the tile is wide enough. */
  icon?: LucideIcon;
  /** Tiles only: an amber tile, for views that need attention. */
  warn?: boolean;
  /** Tiles only: a short extra after the label, such as a total. */
  note?: string | undefined;
}

export interface ViewTabsProps {
  /** Accessible name of the tab list. */
  label: string;
  views: ViewTab[];
  value: string;
  onChange(value: string): void;
  /** Id of the region the tabs control. Give that region role="tabpanel", this id and aria-labelledby={viewTabId(panelId, value)}. */
  panelId?: string;
  /** A row of tiles with a large count each, instead of underlined tabs. */
  tiles?: boolean;
}

/** The DOM id of a tab, for a tabpanel's aria-labelledby. */
export function viewTabId(panelId: string, value: string): string {
  return `${panelId}-tab-${value}`;
}

/** A row of view tabs with a count badge each; the selected one has a brand underline. Arrow keys move between tabs. */
export function ViewTabs({ label, views, value, onChange, panelId, tiles = false }: ViewTabsProps) {
  const { number } = useI18n();
  const base = useId();
  const idOf = (key: string) => (panelId ? viewTabId(panelId, key) : `${base}-${key}`);
  const anySelected = views.some((v) => v.value === value);
  const keys = views.map((v) => v.value);
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={rovingTabsKeyDown(keys, anySelected ? value : (keys[0] ?? value), onChange, idOf)}
      className={tiles ? 'grid gap-2' : 'flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line'}
      style={tiles ? { gridTemplateColumns: `repeat(${views.length}, minmax(0, 1fr))` } : undefined}
    >
      {views.map((view) => {
        const selected = view.value === value;
        const tab = {
          id: idOf(view.value),
          type: 'button' as const,
          role: 'tab',
          'aria-selected': selected,
          'aria-controls': panelId,
          tabIndex: selected || (!anySelected && view === views[0]) ? 0 : -1,
          onClick: () => onChange(view.value),
        };
        if (tiles) {
          const Icon = view.icon;
          const tone = selected
            ? view.warn
              ? 'bg-warn-soft text-warn-ink ring-2 ring-warn-line'
              : 'bg-brand-soft text-brand-strong ring-2 ring-brand'
            : 'bg-surface/60 text-ink ring-1 ring-line hover:bg-surface';
          return (
            <button
              key={view.value}
              {...tab}
              className={`@container flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-start ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${tone}`}
            >
              {Icon && (
                <span
                  aria-hidden="true"
                  className={`hidden size-8 shrink-0 place-items-center rounded-lg @min-[8.5rem]:grid ${view.warn ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand-strong'}`}
                >
                  <Icon size={16} />
                </span>
              )}
              {/* The label comes first so it names the tab; the count shows above it. */}
              <span className="flex min-w-0 flex-col-reverse">
                <span className="truncate text-xs">
                  {view.label}
                  {view.note && ` · ${view.note}`}
                </span>
                {view.count !== undefined && <span className="font-display text-lg font-bold leading-tight">{number(view.count)}</span>}
              </span>
            </button>
          );
        }
        return (
          <button
            key={view.value}
            {...tab}
            className={`-mb-px inline-flex min-h-10 shrink-0 items-center gap-2 border-b-[3px] px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
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
