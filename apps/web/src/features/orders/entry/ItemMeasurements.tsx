import { profileKey, templateById } from '@darzikhata/domain';
import { useSnapshot } from '../../../data/StoreContext';
import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../../ui/Button';
import { Checkbox } from '../../../ui/Checkbox';
import { ChoiceGroup } from '../../../ui/ChoiceGroup';
import { MeasureTiles } from './MeasureTiles';
import { MeasurementInputs } from '../../customers/MeasurementForm';
import { MeasurementTable } from '../../customers/MeasurementTable';
import { latestVersion, type DraftErrors, type DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText } from './shared';

/** One line's measurements: the saved ones to confirm, new values to type, or a note that they are hidden. */
export interface ItemMeasurementsProps {
  entry: OrderEntry;
  item: DraftItem;
  errors: DraftErrors;
  /** The phone's tile grid with a keypad, instead of plain fields. */
  tiles?: boolean;
  /** With tiles: called when "next" is pressed on the last field. */
  onDone?(): void;
  /** With tiles: told how much room the page must keep free for the open keypad. */
  onKeypadSpace?(height: number): void;
}

export function ItemMeasurements({ entry, item, errors, tiles = false, onDone, onKeypadSpace }: ItemMeasurementsProps) {
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
      <div data-tour="confirm-measurements">
        <Checkbox
          label={t('entry.confirmMeasurements')}
          checked={m.confirmed}
          onChange={(confirmed) => entry.updateItem(item.key, { measurements: { ...m, confirmed } })}
          error={errorText(`${at}.measurements`)}
        />
      </div>
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
  if (tiles) {
    const previous: Record<string, number> = {};
    const version = customerId ? latestVersion(state, customerId, template.id) : null;
    for (const [key, v] of Object.entries(version?.values ?? {})) previous[key] = v.value;
    const sources = [
      { value: 'body', label: t('source.body') },
      { value: 'sample', label: t('source.sample') },
    ] as const;
    return (
      <div className="flex flex-col gap-3">
        <div role="group" aria-label={t('measure.source')} className="flex self-start rounded-xl bg-surface p-[3px]">
          {sources.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={m.source === option.value}
              onClick={() => entry.updateItem(item.key, { measurements: { ...m, source: option.value } })}
              className={`min-h-11 rounded-[9px] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                m.source === option.value ? 'bg-panel font-semibold text-ink shadow-sm' : 'text-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <MeasureTiles
          template={template}
          values={m.values}
          previous={previous}
          errors={fieldErrors}
          onChange={(values) => entry.updateItem(item.key, { measurements: { ...m, values } })}
          onDone={() => onDone?.()}
          onKeypadSpace={onKeypadSpace}
        />
      </div>
    );
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
