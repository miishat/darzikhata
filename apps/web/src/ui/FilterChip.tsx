import { X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

export interface FilterChipProps {
  label: string;
  onRemove(): void;
}

/** An applied filter, with a button to remove it. */
export function FilterChip({ label, onRemove }: FilterChipProps) {
  const { t } = useI18n();
  return (
    <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-brand-soft pl-3 pr-1 text-sm font-semibold text-brand-strong">
      {label}
      <button
        type="button"
        aria-label={t('desk.chip.remove', { label })}
        onClick={onRemove}
        className="inline-flex size-6 items-center justify-center rounded-full hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
      >
        <X aria-hidden="true" size={14} />
      </button>
    </span>
  );
}
