import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';

export interface SelectionBarProps {
  count: number;
  children?: ReactNode;
  onClear(): void;
  /** Sits as the bottom strip of a card instead of floating over the page. */
  docked?: boolean;
}

/** A navy bar floating at the bottom centre of the content area while garments are selected, or docked in a card. */
export function SelectionBar({ count, children, onClear, docked = false }: SelectionBarProps) {
  const { t, number } = useI18n();
  if (count <= 0) return null;
  const clear = (
    <button
      type="button"
      onClick={onClear}
      className={`${docked ? 'ms-auto ' : ''}inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-on-navy-muted hover:bg-navy-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-navy`}
    >
      <X aria-hidden="true" size={16} />
      {t('work.clearSelection')}
    </button>
  );
  if (docked) {
    return (
      <section aria-label={t('desk.selection.label')} className="flex flex-wrap items-center gap-3 bg-navy px-4 py-2 text-on-navy">
        <span role="status" className="text-sm font-semibold">
          {t('desk.selection.count', { n: number(count) })}
        </span>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
        {clear}
      </section>
    );
  }
  return (
    <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center px-4">
      <section
        aria-label={t('desk.selection.label')}
        className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl ring-1 ring-inset ring-navy-line bg-navy px-4 py-2 text-on-navy shadow-xl"
      >
        <span role="status" className="text-sm font-semibold">
          {t('desk.selection.count', { n: number(count) })}
        </span>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
        {clear}
      </section>
    </div>
  );
}
