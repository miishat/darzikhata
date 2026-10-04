import { currentVersion, staffById, type GarmentTemplate } from '@darzikhata/domain';
import { type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { MeasurementComparisonTable } from './MeasurementTable';
import { comparisonColumns } from './measurementView';

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

function GarmentPanel({ customerId, template }: { customerId: string; template: GarmentTemplate }) {
  const { t } = useI18n();
  const { state, config } = useSnapshot();
  const scoped = useScopedState();

  const profile = state.profiles[`${customerId}:${template.id}`];
  const current = profile ? currentVersion(profile) : null;
  const orders = Object.values(scoped.orders).filter((o) => o.customerId === customerId);
  const comparison = profile ? comparisonColumns(profile, orders, template.fields) : null;
  if (!profile || !current || !comparison) return <p className="text-muted">{t('measure.none')}</p>;

  const takerName = (id: string) => (config ? staffById(config, id)?.name : undefined) ?? id;

  return (
    <>
      <MeasurementComparisonTable template={template} comparison={comparison} takerName={takerName} />
      {current.notes && <p className="whitespace-pre-line text-muted">{current.notes}</p>}
    </>
  );
}
