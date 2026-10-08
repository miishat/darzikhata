// PROTOTYPE (throwaway): phone layouts for a garment's measurements sheet, behind ?variant=.
import { formatMeasurement, labelIn, type GarmentTemplate, type MeasurementSnapshot } from '@darzikhata/domain';
import { Ruler, X } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { useCan } from '../common/hooks';
import { MeasurementTable } from './MeasurementTable';
import { fieldGroups, groupLabel } from './measurementView';

export const MEASURE_SHEET_VARIANTS = {
  A: 'Current',
  B: 'Close ✕ in the header',
  C: 'Tiles + ✕ + when taken',
  D: 'Light text close',
  E: 'New measurements button + ✕',
};

export interface MeasureSheetProps {
  variant: string;
  title: string;
  template: GarmentTemplate;
  snapshot: MeasurementSnapshot;
  customerId: string;
  onClose(): void;
}

function Header({ title, sub, onClose }: { title: string; sub?: string; onClose(): void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-3 pb-2">
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold text-ink">{title}</p>
        {sub && <p className="text-sm text-muted">{sub}</p>}
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
  );
}

function useSub(snapshot: MeasurementSnapshot) {
  const { t, date } = useI18n();
  return `${date(snapshot.takenAt, { year: true })} · ${t(snapshot.source === 'sample' ? 'source.sample' : 'source.body')}`;
}

function Tiles({ template, snapshot }: { template: GarmentTemplate; snapshot: MeasurementSnapshot }) {
  const { t, language } = useI18n();
  return (
    <div className="flex flex-col gap-3 text-ink">
      {fieldGroups(template.fields).map((group) => {
        const fields = group.fields.filter((f) => snapshot.values[f.key]);
        if (fields.length === 0) return null;
        return (
          <section key={group.group} className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold text-muted">{groupLabel(group.group, t)}</h3>
            <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
              {fields.map((f) => {
                const v = snapshot.values[f.key]!;
                return (
                  <li key={f.key} className="flex flex-col rounded-xl bg-surface px-3 py-2">
                    <span className="text-xs text-muted">{labelIn(f.label, language)}</span>
                    <span className="font-display text-xl font-bold">
                      {formatMeasurement(v.value, language)}
                      <span className="ms-1 text-sm font-normal text-muted">{t(v.unit === 'cm' ? 'unit.cm' : 'unit.inch')}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function MeasureSheetPrototype({ variant, title, template, snapshot, customerId, onClose }: MeasureSheetProps) {
  const { t } = useI18n();
  const can = useCan();
  const sub = useSub(snapshot);
  const table = (
    <div className="text-ink">
      <MeasurementTable template={template} values={snapshot.values} />
    </div>
  );

  if (variant === 'B')
    return (
      <Dialog open hideTitle title={title} onClose={onClose}>
        <Header title={title} onClose={onClose} />
        {table}
      </Dialog>
    );

  if (variant === 'C')
    return (
      <Dialog open hideTitle title={title} onClose={onClose}>
        <Header title={title} sub={sub} onClose={onClose} />
        <Tiles template={template} snapshot={snapshot} />
      </Dialog>
    );

  if (variant === 'D')
    return (
      <Dialog open title={title} onClose={onClose}>
        {table}
        <button type="button" onClick={onClose} className="mt-4 flex min-h-11 w-full items-center justify-center text-sm font-semibold text-muted">
          {t('common.close')}
        </button>
      </Dialog>
    );

  return (
    <Dialog open hideTitle title={title} onClose={onClose}>
      <Header title={title} sub={sub} onClose={onClose} />
      {table}
      {can('measurements.edit') && (
        <Link to={`/app/customers/${customerId}/measure/${template.id}`} className={`${buttonClasses('secondary', 'lg')} mt-4 w-full`}>
          <Ruler size={18} aria-hidden="true" />
          {t('measure.take')}
        </Link>
      )}
    </Dialog>
  );
}
