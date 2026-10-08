import { formatMeasurement, labelIn, type GarmentTemplate, type MeasurementSnapshot } from '@darzikhata/domain';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { Dialog } from '../../ui/Dialog';
import { fieldGroups, groupLabel } from './measurementView';

export interface MeasurementSheetProps {
  title: string;
  template: GarmentTemplate;
  snapshot: MeasurementSnapshot;
  onClose(): void;
}

/**
 * A garment's measurements on a phone: when and how they were taken, then each value as a tile with a large number,
 * grouped as on the form. It closes with the ✕ beside the title or by tapping outside.
 */
export function MeasurementSheet({ title, template, snapshot, onClose }: MeasurementSheetProps) {
  const { t, language, date } = useI18n();
  return (
    <Dialog open hideTitle title={title} onClose={onClose}>
      <div className="flex items-start gap-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-ink">{title}</p>
          <p className="text-sm text-muted">
            {date(snapshot.takenAt, { year: true })} · {t(snapshot.source === 'sample' ? 'source.sample' : 'source.body')}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="-me-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col gap-3 text-ink">
        {fieldGroups(template.fields).map((group) => {
          const fields = group.fields.filter((f) => snapshot.values[f.key]);
          if (fields.length === 0) return null;
          return (
            <section key={group.group} aria-label={groupLabel(group.group, t)} className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-muted">{groupLabel(group.group, t)}</h3>
              <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
                {fields.map((f) => {
                  const value = snapshot.values[f.key]!;
                  return (
                    <li key={f.key} className="flex flex-col rounded-xl bg-surface px-3 py-2">
                      <span className="text-xs text-muted">{labelIn(f.label, language)}</span>
                      <span className="font-display text-xl font-bold">
                        {formatMeasurement(value.value, language)}
                        <span className="ms-1 text-sm font-normal text-muted">{t(value.unit === 'cm' ? 'unit.cm' : 'unit.inch')}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Dialog>
  );
}
