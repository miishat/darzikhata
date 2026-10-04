import { formatMeasurement, labelIn, type GarmentTemplate, type Language, type MeasurementValue } from '@darzikhata/domain';
import { translate } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { deltaText, fieldGroups, groupLabel, type Comparison, type ComparisonColumn } from './measurementView';

export interface MeasurementTableProps {
  template: GarmentTemplate;
  values: Record<string, MeasurementValue>;
  /** Overrides the app language, for a print-out in the other language. */
  language?: Language;
}

/** A garment's measurements, grouped, one row per field that has a value. */
export function MeasurementTable({ template, values, language: forced }: MeasurementTableProps) {
  const app = useI18n();
  const language = forced ?? app.language;
  const t: typeof app.t = (key, vars) => translate(language, key, vars);
  const label = (l: Parameters<typeof labelIn>[0]) => labelIn(l, language);
  const show = (value: MeasurementValue | undefined) =>
    value ? `${formatMeasurement(value.value, language)} ${t(value.unit === 'cm' ? 'unit.cm' : 'unit.inch')}` : '';

  return (
    <table className="w-full border-collapse text-left">
      {fieldGroups(template.fields).map((group) => {
        const fields = group.fields.filter((f) => values[f.key]);
        if (fields.length === 0) return null;
        return (
          <tbody key={group.group}>
            <tr>
              <th scope="rowgroup" colSpan={2} className="pt-3 text-sm text-muted">
                {groupLabel(group.group, t)}
              </th>
            </tr>
            {fields.map((field) => (
              <tr key={field.key} className="border-t border-line">
                <th scope="row" className="py-2 pr-3 font-normal">
                  {label(field.label)}
                </th>
                <td className="py-2 pr-3 font-semibold">{show(values[field.key])}</td>
              </tr>
            ))}
          </tbody>
        );
      })}
    </table>
  );
}

export interface MeasurementComparisonTableProps {
  template: GarmentTemplate;
  comparison: Comparison;
  /** Staff id to a display name. */
  takerName(id: string): string;
}

/**
 * The current measurements beside the previous version and the copy kept on the latest order.
 * Each column says when, from what and by whom; a small badge with a signed number marks what
 * changed since the previous version, so the change never relies on colour.
 */
export function MeasurementComparisonTable({ template, comparison, takerName }: MeasurementComparisonTableProps) {
  const { t, label: labelOf, language, date } = useI18n();
  const { columns, rows } = comparison;
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const show = (value: MeasurementValue | null) =>
    value ? `${formatMeasurement(value.value, language)} ${t(value.unit === 'cm' ? 'unit.cm' : 'unit.inch')}` : t('measure.noValue');
  const heading = (column: ComparisonColumn) =>
    column.kind === 'current'
      ? t('measure.current')
      : column.kind === 'previous'
        ? t('measure.colPrevious')
        : t('measure.colSnapshot', { number: column.orderNumber ?? '' });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[26rem] border-collapse text-left">
        <caption className="pb-2 text-left text-sm text-muted">{t('measure.compareCaption')}</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              {t('measure.garments')}
            </th>
            {columns.map((column) => (
              <th
                key={column.kind}
                scope="col"
                className={`px-3 py-2 align-top font-normal ${column.kind === 'current' ? 'rounded-t-lg bg-brand-soft' : ''}`}
              >
                <span className="block font-semibold">{heading(column)}</span>
                <span className="block text-xs text-muted">
                  {t('measure.takenOn', { date: date(column.takenAt, { year: true }), source: t(column.source === 'sample' ? 'source.sample' : 'source.body') })}
                </span>
                {column.takenBy && <span className="block text-xs text-muted">{t('measure.takenBy', { name: takerName(column.takenBy) })}</span>}
              </th>
            ))}
          </tr>
        </thead>
        {fieldGroups(template.fields).map((group) => {
          const fields = group.fields.filter((f) => {
            const row = byKey.get(f.key);
            return row && (row.values.current || row.values.previous || row.values.snapshot);
          });
          if (fields.length === 0) return null;
          return (
            <tbody key={group.group}>
              <tr>
                <th scope="rowgroup" colSpan={columns.length + 1} className="pt-3 text-sm text-muted">
                  {groupLabel(group.group, t)}
                </th>
              </tr>
              {fields.map((field) => {
                const row = byKey.get(field.key)!;
                return (
                  <tr key={field.key} className="border-t border-line">
                    <th scope="row" className="py-2 pr-3 font-normal">
                      {labelOf(field.label)}
                    </th>
                    {columns.map((column) => (
                      <td key={column.kind} className={`px-3 py-2 ${column.kind === 'current' ? 'bg-brand-soft font-semibold' : ''}`}>
                        {show(row.values[column.kind])}
                        {column.kind === 'current' && row.delta !== null && (
                          <span className="ml-2 inline-block rounded-md bg-warn-soft px-1.5 py-0.5 text-xs font-semibold text-warn-ink">
                            <span className="sr-only">{t('measure.changeFromPrev')} </span>
                            {deltaText(row.delta, language)}
                          </span>
                        )}
                        {column.kind === 'current' && row.unitsDiffer && (
                          <span className="ml-2 text-xs font-normal text-muted">{t('measure.unitsDiffer')}</span>
                        )}
                        {column.kind === 'snapshot' && row.snapshotDiffers && (
                          <span className="ml-2 text-xs font-semibold text-warn-ink">{t('measure.changed')}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
