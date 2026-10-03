import {
  currentVersion,
  staffById,
  type GarmentTemplate,
  type MeasurementSource,
  type MeasurementValue,
  type Order,
} from '@darzikhata/domain';
import { useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { MeasurementTable } from './MeasurementTable';

const NOTHING = '';

/** The customer's measurements, one tab per garment. */
export function MeasurementSection({ customerId }: { customerId: string }) {
  const { t, label } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const { state, config } = useSnapshot();
  const [params, setParams] = useSearchParams();
  const customer = state.customers[customerId];

  const body = (() => {
    if (!customer) return null;
    if (!hasAccess(customer)) return <p className="text-muted">{t('measure.hidden')}</p>;
    const templates = (config?.templates ?? []).filter((tpl) => tpl.active && tpl.fields.length > 0);
    if (templates.length === 0) return <p className="text-muted">{t('measure.none')}</p>;

    const hasVersions = (tpl: GarmentTemplate) => (state.profiles[`${customerId}:${tpl.id}`]?.versions.length ?? 0) > 0;
    const requested = params.get('tab');
    const selected =
      templates.find((tpl) => tpl.id === requested) ?? templates.find(hasVersions) ?? templates[0]!;

    const select = (id: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', id);
          return next;
        },
        { replace: true },
      );
    };

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      const index = templates.findIndex((tpl) => tpl.id === selected.id);
      let target = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = (index + 1) % templates.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = (index - 1 + templates.length) % templates.length;
      else if (e.key === 'Home') target = 0;
      else if (e.key === 'End') target = templates.length - 1;
      if (target < 0) return;
      e.preventDefault();
      const next = templates[target]!;
      select(next.id);
      document.getElementById(`measure-tab-${next.id}`)?.focus();
    };

    return (
      <>
        <div role="tablist" aria-label={t('measure.tabs')} className="flex flex-wrap gap-2">
          {templates.map((tpl) => {
            const active = tpl.id === selected.id;
            return (
              <button
                key={tpl.id}
                id={`measure-tab-${tpl.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`measure-panel-${tpl.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => select(tpl.id)}
                onKeyDown={onKeyDown}
                className={`min-h-10 rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand ${
                  active ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-panel'
                }`}
              >
                {label(tpl.name)}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`measure-panel-${selected.id}`}
          aria-labelledby={`measure-tab-${selected.id}`}
          className="flex flex-col gap-3"
        >
          <GarmentPanel key={selected.id} customerId={customerId} template={selected} />
          {can('measurements.edit') && (
            <div>
              <Link to={`/app/customers/${customerId}/measure/${selected.id}`} className={buttonClasses('secondary')}>
                {t('measure.take')}
              </Link>
            </div>
          )}
        </div>
      </>
    );
  })();

  return (
    <section aria-labelledby="customer-measurements" className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
      <h2 id="customer-measurements" className="font-semibold">
        {t('measure.section')}
      </h2>
      {body}
    </section>
  );
}

interface Choice {
  id: string;
  label: string;
  values: Record<string, MeasurementValue>;
}

function GarmentPanel({ customerId, template }: { customerId: string; template: GarmentTemplate }) {
  const { t, date } = useI18n();
  const { state, config } = useSnapshot();
  const [choice, setChoice] = useState(NOTHING);

  const profile = state.profiles[`${customerId}:${template.id}`];
  const current = profile ? currentVersion(profile) : null;
  if (!profile || !current) return <p className="text-muted">{t('measure.none')}</p>;

  const older: Choice[] = profile.versions
    .slice(0, -1)
    .reverse()
    .map((v) => ({ id: `version:${v.id}`, label: t('measure.version', { date: date(v.takenAt) }), values: v.values }));
  const orders: Order[] = Object.values(state.orders)
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const snapshots: Choice[] = orders.flatMap((order) =>
    order.items
      .filter((i) => i.templateId === template.id && i.cancelled === null && i.measurements !== null)
      .map((i) => ({ id: `item:${i.id}`, label: t('measure.snapshot', { number: order.number }), values: i.measurements!.values })),
  );
  const choices = [...older, ...snapshots];
  const chosen = choices.find((c) => c.id === choice);

  const sourceText = (source: MeasurementSource) => t(source === 'sample' ? 'source.sample' : 'source.body');
  const taker = config ? staffById(config, current.takenBy) : null;

  return (
    <>
      <MeasurementTable
        template={template}
        values={current.values}
        {...(chosen ? { compare: { label: chosen.label, values: chosen.values } } : {})}
      />
      <p>{t('measure.takenOn', { date: date(current.takenAt, { year: true }), source: sourceText(current.source) })}</p>
      <p className="text-sm text-muted">{t('measure.takenBy', { name: taker?.name ?? current.takenBy })}</p>
      {current.notes && <p className="whitespace-pre-line text-muted">{current.notes}</p>}
      {choices.length > 0 && (
        <SelectField
          label={t('measure.compare')}
          value={choice}
          onChange={setChoice}
          options={[{ value: NOTHING, label: t('measure.compareNone') }, ...choices.map((c) => ({ value: c.id, label: c.label }))]}
        />
      )}
    </>
  );
}
