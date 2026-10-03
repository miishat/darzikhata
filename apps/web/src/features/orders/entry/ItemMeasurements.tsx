import { profileKey, templateById } from '@darzikhata/domain';
import { useSnapshot } from '../../../data/StoreContext';
import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../../ui/Button';
import { Checkbox } from '../../../ui/Checkbox';
import { ChoiceGroup } from '../../../ui/ChoiceGroup';
import { MeasurementInputs } from '../../customers/MeasurementForm';
import { MeasurementTable } from '../../customers/MeasurementTable';
import type { DraftErrors, DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText } from './shared';

/** One line's measurements: the saved ones to confirm, new values to type, or a note that they are hidden. */
export function ItemMeasurements({ entry, item, errors }: { entry: OrderEntry; item: DraftItem; errors: DraftErrors }) {
  const { t, label, date } = useI18n();
  const { config, state } = useSnapshot();
  const errorText = useErrorText(errors);
  const template = config ? templateById(config, item.templateId) : null;
  const customer = entry.draft.customer;
  const m = item.measurements;
  if (!template || template.fields.length === 0) return null;

  const at = `items.${item.key}`;
  const customerId = customer?.kind === 'existing' ? customer.customerId : null;
  const hidden = <p className="text-muted">{t('entry.measurementsHidden')}</p>;

  if (m.kind === 'none') {
    return (
      <>
        {entry.canSeeMeasurements ? null : hidden}
        {errorText(`${at}.measurements`) && <p className="text-sm text-danger">{errorText(`${at}.measurements`)}</p>}
      </>
    );
  }

  if (m.kind === 'saved') {
    const version = customerId
      ? state.profiles[profileKey(customerId, template.id)]?.versions.find((v) => v.id === m.versionId)
      : undefined;
    const confirm = (
      <Checkbox
        label={t('entry.confirmMeasurements')}
        checked={m.confirmed}
        onChange={(confirmed) => entry.updateItem(item.key, { measurements: { ...m, confirmed } })}
        error={errorText(`${at}.measurements`)}
      />
    );
    if (!entry.canSeeMeasurements) {
      return (
        <>
          {hidden}
          {confirm}
        </>
      );
    }
    const takeNew = () => {
      const values: Record<string, number> = {};
      for (const [key, v] of Object.entries(version?.values ?? {})) values[key] = v.value;
      entry.updateItem(item.key, { measurements: { kind: 'new', values, source: 'body', notes: '' } });
    };
    return (
      <div className="flex flex-col gap-3">
        {version && (
          <>
            <h3 className="font-semibold">{t('entry.savedMeasurements', { date: date(version.takenAt) })}</h3>
            <MeasurementTable template={template} values={version.values} />
          </>
        )}
        {confirm}
        <Button variant="secondary" onClick={takeNew}>
          {t('measure.take')}
        </Button>
      </div>
    );
  }

  const fieldErrors: Record<string, string> = {};
  for (const field of template.fields) {
    const text = errorText(`${at}.measure.${field.key}`);
    if (text) fieldErrors[field.key] = text;
  }
  return (
    <div className="flex flex-col gap-3">
      <MeasurementInputs
        template={template}
        values={m.values}
        errors={fieldErrors}
        onChange={(values) => entry.updateItem(item.key, { measurements: { ...m, values } })}
      />
      <ChoiceGroup
        legend={t('measure.source')}
        value={m.source}
        options={[
          { value: 'body', label: t('source.body') },
          { value: 'sample', label: t('source.sample') },
        ]}
        onChange={(source) => entry.updateItem(item.key, { measurements: { ...m, source } })}
      />
    </div>
  );
}
