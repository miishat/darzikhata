import { formatMeasurement, type GarmentTemplate, type MeasurementValue } from '@darzikhata/domain';
import { useI18n } from '../../i18n/I18nProvider';
import { compareValues, fieldGroups, groupLabel } from './measurementView';

export interface MeasurementTableProps {
  template: GarmentTemplate;
  values: Record<string, MeasurementValue>;
  /** A second set of values shown in a column beside the first, with changed rows flagged. */
  compare?: { label: string; values: Record<string, MeasurementValue> };
}

/** A garment's measurements, grouped, one row per field that has a value (or any field when comparing). */
export function MeasurementTable({ template, values, compare }: MeasurementTableProps) {
  const { t, label, language } = useI18n();
  const show = (value: MeasurementValue | undefined) =>
    value ? `${formatMeasurement(value.value, language)} ${t(value.unit === 'cm' ? 'unit.cm' : 'unit.inch')}` : '';
  const changes = compare
    ? new Map(
        compareValues(
          template.fields,
          { versionId: '', takenAt: '', source: 'body', values },
          { versionId: '', takenAt: '', source: 'body', values: compare.values },
        ).map((c) => [c.key, c.changed]),
      )
    : null;

  return (
    <table className="w-full border-collapse text-left">
      {compare && (
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              {t('measure.section')}
            </th>
            <th scope="col" className="py-1 text-sm text-muted">
              {t('measure.current')}
            </th>
            <th scope="col" className="py-1 text-sm text-muted">
              {compare.label}
            </th>
            <th scope="col" className="sr-only" />
          </tr>
        </thead>
      )}
      {fieldGroups(template.fields).map((group) => {
        const fields = group.fields.filter((f) => compare || values[f.key]);
        if (fields.length === 0) return null;
        return (
          <tbody key={group.group}>
            <tr>
              <th scope="rowgroup" colSpan={compare ? 4 : 2} className="pt-3 text-sm text-muted">
                {groupLabel(group.group, t)}
              </th>
            </tr>
            {fields.map((field) => (
              <tr key={field.key} className="border-t border-line">
                <th scope="row" className="py-2 pr-3 font-normal">
                  {label(field.label)}
                </th>
                <td className="py-2 pr-3 font-semibold">{show(values[field.key])}</td>
                {compare && <td className="py-2 pr-3">{show(compare.values[field.key])}</td>}
                {compare && (
                  <td className="py-2 text-sm font-semibold text-accent">
                    {changes?.get(field.key) ? t('measure.changed') : ''}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        );
      })}
    </table>
  );
}
