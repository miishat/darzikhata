import { currentVersion, formatMeasurement, staffById, type GarmentTemplate, type MeasurementProfile } from '@darzikhata/domain';
import { useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { ChipGroup } from '../../ui/ChipGroup';
import { useMeasurementAccess } from '../common/hooks';
import { deltaText, fieldGroups, valueDeltas } from './measurementView';

/** The garment whose measurements show: the one asked for in the URL, else the first with a saved version. */
export function pickTemplate(
  templates: GarmentTemplate[],
  requested: string | null,
  profiles: Record<string, MeasurementProfile>,
  customerId: string,
): GarmentTemplate | undefined {
  const hasVersions = (tpl: GarmentTemplate) => (profiles[`${customerId}:${tpl.id}`]?.versions.length ?? 0) > 0;
  return templates.find((tpl) => tpl.id === requested) ?? templates.find(hasVersions) ?? templates[0];
}

/** Garments that can have measurements, in the shop's order. */
export function useMeasurementTemplates(): GarmentTemplate[] {
  const { config } = useSnapshot();
  return (config?.templates ?? []).filter((tpl) => tpl.active && tpl.fields.length > 0);
}

/** Phone measurements: garment chips, then the current version with a badge on each value that changed since the one before. */
export function MobileMeasurements({ customerId }: { customerId: string }) {
  const { t, label, language, date } = useI18n();
  const hasAccess = useMeasurementAccess();
  const { state, config } = useSnapshot();
  const [params, setParams] = useSearchParams();
  const templates = useMeasurementTemplates();
  const customer = state.customers[customerId];

  if (!customer) return null;
  if (!hasAccess(customer)) return <p className="text-muted">{t('measure.hidden')}</p>;
  const selected = pickTemplate(templates, params.get('tab'), state.profiles, customerId);
  if (!selected) return <p className="text-muted">{t('measure.none')}</p>;

  const select = (id: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', id);
        return next;
      },
      { replace: true },
    );

  const profile = state.profiles[`${customerId}:${selected.id}`];
  const current = profile ? currentVersion(profile) : null;
  const previous = profile && profile.versions.length > 1 ? profile.versions[profile.versions.length - 2] : undefined;
  const deltas = current ? valueDeltas(current.values, previous?.values) : {};
  const taker = current && config ? staffById(config, current.takenBy) : null;
  const garment = label(selected.name);

  return (
    <div className="flex flex-col gap-3">
      <ChipGroup
        label={t('measure.garments')}
        value={selected.id}
        onChange={select}
        options={templates.map((tpl) => ({ value: tpl.id, label: label(tpl.name) }))}
      />
      <section aria-label={`${garment} ${t('measure.section')}`} className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5">
        {!current ? (
          <p className="text-muted">{t('measure.none')}</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              {t('measure.takenOn', {
                date: date(current.takenAt, { year: true }),
                source: t(current.source === 'sample' ? 'source.sample' : 'source.body'),
              })}
              {' · '}
              {t('measure.takenBy', { name: taker?.name ?? current.takenBy })}
            </p>
            {fieldGroups(selected.fields).map((group) => {
              const fields = group.fields.filter((f) => current.values[f.key]);
              if (fields.length === 0) return null;
              return (
                <dl key={group.group} className="m-0 grid grid-cols-2 gap-x-4">
                  {fields.map((field) => {
                    const value = current.values[field.key]!;
                    const delta = deltas[field.key];
                    return (
                      <div key={field.key} className="flex items-baseline justify-between gap-2 border-t border-line py-2">
                        <dt className="text-sm text-muted">{label(field.label)}</dt>
                        <dd className="m-0 flex items-baseline gap-1.5">
                          {delta !== undefined && (
                            <span className="rounded-md bg-warn-soft px-1.5 text-xs font-semibold text-warn-ink">
                              <span className="sr-only">{`${t('measure.changeFromPrev')} `}</span>
                              {deltaText(delta, language)}
                            </span>
                          )}
                          <span className="font-display text-lg font-semibold">{formatMeasurement(value.value, language)}</span>
                          <span className="text-xs text-muted">{t(value.unit === 'cm' ? 'unit.cm' : 'unit.inch')}</span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              );
            })}
            {current.notes && <p className="whitespace-pre-line text-sm text-muted">{current.notes}</p>}
          </>
        )}
      </section>
    </div>
  );
}
