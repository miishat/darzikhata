import { formatMeasurement, type GarmentTemplate } from '@darzikhata/domain';
import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { NumberField } from '../../../ui/NumberField';
import { changedFromPrevious, fieldGroups, groupLabel } from '../../customers/measurementView';

export interface DesktopMeasureFieldsProps {
  template: GarmentTemplate;
  values: Record<string, number>;
  /** The customer's previous values (same unit only). A value that differs is outlined and shows "আগে ৩৬¾". */
  previous: Record<string, number>;
  errors: Record<string, string>;
  onChange(values: Record<string, number>): void;
}

/** One fieldset per measurement group, fields in an auto-fill grid; changes from the last version are marked in words too. */
export function DesktopMeasureFields({ template, values, previous, errors, onChange }: DesktopMeasureFieldsProps) {
  const { t, label, language } = useI18n();
  // NumberField keeps its own text, so the latest values are tracked here and passed up whole.
  const [latest] = useState<{ values: Record<string, number> }>(() => ({ values: { ...values } }));

  const change = (key: string, value: number | null) => {
    const next = { ...latest.values };
    if (value === null) delete next[key];
    else next[key] = value;
    latest.values = next;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {fieldGroups(template.fields).map((group) => (
        <fieldset key={group.group} className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-semibold text-muted">{groupLabel(group.group, t)}</legend>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
            {group.fields.map((field) => {
              const before = previous[field.key];
              const changed = before !== undefined && changedFromPrevious(values[field.key] ?? null, before);
              return (
                <NumberField
                  key={field.key}
                  label={label(field.label)}
                  kind="measurement"
                  initialValue={values[field.key] ?? null}
                  onValueChange={(value) => change(field.key, value)}
                  error={errors[field.key]}
                  tone={changed ? 'warn' : undefined}
                  hint={changed ? t('entry.before', { value: formatMeasurement(before!, language) }) : undefined}
                  suffix={<span className="pr-3 text-sm text-muted">{t(field.unit === 'cm' ? 'unit.cm' : 'unit.inch')}</span>}
                />
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
