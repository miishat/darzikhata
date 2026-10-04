import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';

export interface SelectionBarProps {
  count: number;
  children?: ReactNode;
  onClear(): void;
}

/** A navy bar floating at the bottom centre of the content area while garments are selected. */
export function SelectionBar({ count, children, onClear }: SelectionBarProps) {
  const { t, number } = useI18n();
  if (count <= 0) return null;
  return (
    <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center px-4">
      <section
        role="region"
        aria-label={t('desk.selection.label')}
        className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl bg-navy px-4 py-2 text-on-navy shadow-xl"
      >
        <span className="text-sm font-semibold">{t('desk.selection.count', { n: number(count) })}</span>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-on-navy-muted hover:bg-navy-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-navy"
        >
          <X aria-hidden="true" size={16} />
          {t('desk.selection.clear')}
        </button>
      </section>
    </div>
  );
}
