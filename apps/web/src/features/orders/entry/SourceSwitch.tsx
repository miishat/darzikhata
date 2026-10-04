import type { MeasurementSource } from '@darzikhata/domain';
import { useI18n } from '../../../i18n/I18nProvider';

/** Body or sample measurements, as a two-button switch. */
export function SourceSwitch({ value, onChange }: { value: MeasurementSource; onChange(source: MeasurementSource): void }) {
  const { t } = useI18n();
  const options = [
    { value: 'body', label: t('source.body') },
    { value: 'sample', label: t('source.sample') },
  ] as const;
  return (
    <div role="group" aria-label={t('measure.source')} className="flex self-end rounded-lg bg-surface p-[3px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
            value === option.value ? 'bg-panel font-semibold text-ink shadow-sm' : 'text-muted'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
