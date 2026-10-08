// PROTOTYPE (throwaway): other layouts for the desktop customer profile's measurements, behind ?variant=.
import { currentVersion, formatMeasurement, staffById, type GarmentTemplate, type Language, type MeasurementValue, type MeasurementVersion } from '@darzikhata/domain';
import { ChevronDown, Ruler } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan } from '../common/hooks';
import { MeasurementComparisonTable } from './MeasurementTable';
import { comparisonColumns, deltaText, fieldGroups, groupLabel } from './measurementView';

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);

export interface ProtoProps {
  variant: string;
  customerId: string;
  templates: GarmentTemplate[];
  selected: GarmentTemplate;
  select(id: string): void;
}

function useGarment(customerId: string, template: GarmentTemplate) {
  const { state, config } = useSnapshot();
  const scoped = useScopedState();
  const profile = state.profiles[`${customerId}:${template.id}`];
  const versions = profile?.versions ?? [];
  const current = profile ? currentVersion(profile) : null;
  const previous = versions.length > 1 ? versions.at(-2)! : null;
  const orders = Object.values(scoped.orders).filter((o) => o.customerId === customerId);
  const comparison = profile ? comparisonColumns(profile, orders, template.fields) : null;
  // Which orders kept a copy of each version.
  const usedOn = new Map<string, string[]>();
  for (const order of orders)
    for (const item of order.items)
      if (item.templateId === template.id && item.cancelled === null && item.measurements)
        usedOn.set(item.measurements.versionId, [...(usedOn.get(item.measurements.versionId) ?? []), order.number]);
  const takerName = (id: string) => (config ? staffById(config, id)?.name : undefined) ?? id;
  return { profile, versions, current, previous, comparison, usedOn, takerName };
}

function useShow() {
  const { t, language } = useI18n();
  return (value: MeasurementValue | null | undefined) =>
    value ? `${formatMeasurement(value.value, language)} ${t(value.unit === 'cm' ? 'unit.cm' : 'unit.inch')}` : t('measure.noValue');
}

function delta(now: MeasurementValue | undefined, before: MeasurementValue | undefined) {
  if (!now || !before || now.unit !== before.unit) return null;
  const d = Math.round((now.value - before.value) * 1000) / 1000;
  return d === 0 ? null : d;
}

function Badge({ d }: { d: number }) {
  const { t, language } = useI18n();
  return (
    <span className="inline-block rounded-md bg-warn-soft px-1.5 py-0.5 text-xs font-semibold text-warn-ink ring-1 ring-inset ring-warn-line">
      <span className="sr-only">{t('measure.changeFromPrev')} </span>
      {deltaText(d, language)}
    </span>
  );
}

function TakeButton({ customerId, template, small }: { customerId: string; template: GarmentTemplate; small?: boolean }) {
  const { t } = useI18n();
  const can = useCan();
  if (!can('measurements.edit')) return null;
  return (
    <Link to={`/app/customers/${customerId}/measure/${template.id}`} className={`${buttonClasses('secondary')} ${small ? 'gap-1.5' : ''}`}>
      <Ruler size={16} aria-hidden="true" />
      {t('measure.take')}
    </Link>
  );
}

function Tabs({ templates, selected, select }: Pick<ProtoProps, 'templates' | 'selected' | 'select'>) {
  const { t, label } = useI18n();
  return (
    <div role="tablist" aria-label={t('measure.tabs')} className="inline-flex flex-wrap gap-1 rounded-lg bg-surface p-1">
      {templates.map((tpl) => {
        const active = tpl.id === selected.id;
        return (
          <button
            key={tpl.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(tpl.id)}
            className={`min-h-8 rounded-md px-3 text-sm ${active ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {label(tpl.name)}
          </button>
        );
      })}
    </div>
  );
}

function Meta({ version, takerName }: { version: MeasurementVersion; takerName(id: string): string }) {
  const { t, date } = useI18n();
  return (
    <p className="text-sm text-muted">
      {date(version.takenAt, { year: true })} · {t(version.source === 'sample' ? 'source.sample' : 'source.body')} · {takerName(version.takenBy)}
    </p>
  );
}

function Notes({ text }: { text: string }) {
  const { language } = useI18n();
  if (!text) return null;
  return (
    <p className="rounded-lg border-s-4 border-brand bg-brand-soft px-3 py-2 text-sm whitespace-pre-line">
      <span className="font-semibold">{pick(language, 'নোট: ', 'Note: ')}</span>
      {text}
    </p>
  );
}

function Shell({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="customer-measurements" className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="customer-measurements" className="font-semibold">
          {t('measure.section')}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** B: one tile per measurement, the old value and change under it only when it changed. */
function Tiles({ customerId, templates, selected, select }: ProtoProps) {
  const { t, label, language } = useI18n();
  const show = useShow();
  const g = useGarment(customerId, selected);
  const snapshot = g.comparison?.columns.find((c) => c.kind === 'snapshot');
  const snapshotDiffers = g.comparison?.rows.some((r) => r.snapshotDiffers);
  return (
    <Shell action={<TakeButton customerId={customerId} template={selected} />}>
      <Tabs templates={templates} selected={selected} select={select} />
      {!g.current ? (
        <p className="text-muted">{t('measure.none')}</p>
      ) : (
        <>
          <Meta version={g.current} takerName={g.takerName} />
          <Notes text={g.current.notes} />
          {fieldGroups(selected.fields).map((group) => {
            const fields = group.fields.filter((f) => g.current!.values[f.key]);
            if (fields.length === 0) return null;
            return (
              <div key={group.group} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-muted">{groupLabel(group.group, t)}</h3>
                <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
                  {fields.map((f) => {
                    const now = g.current!.values[f.key];
                    const before = g.previous?.values[f.key];
                    const d = delta(now, before);
                    return (
                      <li key={f.key} className="flex flex-col gap-0.5 rounded-lg border border-line px-3 py-2">
                        <span className="text-xs text-muted">{label(f.label)}</span>
                        <span className="text-lg font-semibold">{show(now)}</span>
                        {d !== null && (
                          <span className="flex items-center gap-1.5 text-xs text-muted">
                            {pick(language, 'আগে', 'Was')} {show(before)} <Badge d={d} />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {snapshot && (
            <p className="text-sm text-muted">
              {snapshotDiffers
                ? pick(language, `অর্ডার ${snapshot.orderNumber}-এ আগের মাপ রাখা আছে।`, `Order ${snapshot.orderNumber} kept older measurements.`)
                : pick(language, `অর্ডার ${snapshot.orderNumber}-এ এই মাপই রাখা আছে।`, `Order ${snapshot.orderNumber} kept these same measurements.`)}
            </p>
          )}
        </>
      )}
    </Shell>
  );
}

type Against = 'none' | 'previous' | 'snapshot';

/** C: groups side by side as short lists, with a switch for what to compare against. */
function Compare({ customerId, templates, selected, select }: ProtoProps) {
  const { t, label, language, date } = useI18n();
  const show = useShow();
  const g = useGarment(customerId, selected);
  const [against, setAgainst] = useState<Against>('previous');
  const columns = g.comparison?.columns ?? [];
  const prevCol = columns.find((c) => c.kind === 'previous');
  const snapCol = columns.find((c) => c.kind === 'snapshot');
  const choices: Array<{ id: Against; text: string; off?: boolean }> = [
    { id: 'none', text: pick(language, 'শুধু এখনকার', 'Current Only') },
    { id: 'previous', text: prevCol ? pick(language, `আগের (${date(prevCol.takenAt)})`, `Previous (${date(prevCol.takenAt)})`) : pick(language, 'আগের', 'Previous'), off: !prevCol },
    { id: 'snapshot', text: snapCol ? pick(language, `অর্ডার ${snapCol.orderNumber}`, `Order ${snapCol.orderNumber}`) : pick(language, 'অর্ডার', 'Order'), off: !snapCol },
  ];
  const mode = choices.find((c) => c.id === against)?.off ? 'none' : against;
  const byKey = new Map((g.comparison?.rows ?? []).map((r) => [r.key, r]));
  return (
    <Shell action={<TakeButton customerId={customerId} template={selected} />}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs templates={templates} selected={selected} select={select} />
        {g.current && (
          <div role="group" aria-label={pick(language, 'তুলনা', 'Compare')} className="flex items-center gap-2 text-sm">
            <span className="text-muted">{pick(language, 'তুলনা:', 'Compare:')}</span>
            {choices.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={c.off}
                aria-pressed={mode === c.id}
                onClick={() => setAgainst(c.id)}
                className={`min-h-8 rounded-full border px-3 disabled:opacity-40 ${mode === c.id ? 'border-brand bg-brand-soft font-semibold text-brand-strong' : 'border-line'}`}
              >
                {c.text}
              </button>
            ))}
          </div>
        )}
      </div>
      {!g.current ? (
        <p className="text-muted">{t('measure.none')}</p>
      ) : (
        <>
          <Meta version={g.current} takerName={g.takerName} />
          <Notes text={g.current.notes} />
          <div className="grid grid-cols-2 gap-6">
            {fieldGroups(selected.fields).map((group) => {
              const fields = group.fields.filter((f) => g.current!.values[f.key] || byKey.get(f.key)?.values.previous);
              if (fields.length === 0) return null;
              return (
                <div key={group.group}>
                  <h3 className="mb-1 text-sm font-semibold text-muted">{groupLabel(group.group, t)}</h3>
                  <dl className="m-0">
                    {fields.map((f) => {
                      const row = byKey.get(f.key)!;
                      const other = mode === 'none' ? null : row.values[mode];
                      const d = mode === 'none' ? null : delta(row.values.current ?? undefined, other ?? undefined);
                      const differs = mode !== 'none' && (other?.value !== row.values.current?.value || other?.unit !== row.values.current?.unit);
                      return (
                        <div key={f.key} className="flex items-baseline gap-2 border-b border-line py-2 last:border-0">
                          <dt className="flex-1">{label(f.label)}</dt>
                          {differs && <span className="text-sm text-muted line-through">{show(other)}</span>}
                          <dd className="m-0 w-24 text-end font-semibold">{show(row.values.current)}</dd>
                          <span className="w-14 text-end">{d !== null && <Badge d={d} />}</span>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}

/** D: every version down the side; pick one to see it against the one before. */
function History({ customerId, templates, selected, select }: ProtoProps) {
  const { t, label, language, date } = useI18n();
  const show = useShow();
  const g = useGarment(customerId, selected);
  const newestFirst = [...g.versions].reverse();
  const [picked, setPicked] = useState<string | null>(null);
  const at = Math.max(0, g.versions.findIndex((v) => v.id === picked));
  const index = picked && g.versions.some((v) => v.id === picked) ? at : g.versions.length - 1;
  const version = g.versions[index];
  const before = index > 0 ? g.versions[index - 1] : undefined;
  return (
    <Shell action={<TakeButton customerId={customerId} template={selected} />}>
      <Tabs templates={templates} selected={selected} select={select} />
      {!version ? (
        <p className="text-muted">{t('measure.none')}</p>
      ) : (
        <div className="grid grid-cols-[14rem_1fr] gap-4">
          <ol aria-label={pick(language, 'মাপের ইতিহাস', 'Measurement History')} className="m-0 flex list-none flex-col gap-1 border-e border-line p-0 pe-3">
            {newestFirst.map((v, i) => {
              const active = v.id === version.id;
              const orders = g.usedOn.get(v.id) ?? [];
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    aria-current={active || undefined}
                    onClick={() => setPicked(v.id)}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-start ${active ? 'bg-brand-soft' : 'hover:bg-surface'}`}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      {date(v.takenAt, { year: true })}
                      {i === 0 && <span className="rounded bg-brand px-1.5 text-xs font-semibold text-on-brand">{t('measure.current')}</span>}
                    </span>
                    <span className="text-xs text-muted">
                      {t(v.source === 'sample' ? 'source.sample' : 'source.body')} · {g.takerName(v.takenBy)}
                    </span>
                    {orders.length > 0 && (
                      <span className="text-xs text-muted">{pick(language, `অর্ডারে: ${orders.join(', ')}`, `On orders: ${orders.join(', ')}`)}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              {before
                ? pick(language, `${date(before.takenAt, { year: true })}-এর মাপের সাথে তুলনা`, `Compared with ${date(before.takenAt, { year: true })}`)
                : pick(language, 'প্রথম মাপ', 'First measurements')}
            </p>
            <Notes text={version.notes} />
            <table className="w-full border-collapse text-left">
              {fieldGroups(selected.fields).map((group) => {
                const fields = group.fields.filter((f) => version.values[f.key]);
                if (fields.length === 0) return null;
                return (
                  <tbody key={group.group}>
                    <tr>
                      <th scope="rowgroup" colSpan={3} className="pt-2 text-sm text-muted">
                        {groupLabel(group.group, t)}
                      </th>
                    </tr>
                    {fields.map((f) => {
                      const d = delta(version.values[f.key], before?.values[f.key]);
                      return (
                        <tr key={f.key} className="border-t border-line">
                          <th scope="row" className="py-2 font-normal">
                            {label(f.label)}
                          </th>
                          <td className="py-2 font-semibold">{show(version.values[f.key])}</td>
                          <td className="py-2 text-sm text-muted">
                            {d !== null && (
                              <span className="flex items-center gap-2">
                                <Badge d={d} /> {pick(language, 'আগে', 'was')} {show(before?.values[f.key])}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}

/** E: garments down the side with when each was last measured; plain current values, the full comparison folded away. */
function Folded({ customerId, templates, selected, select }: ProtoProps) {
  const { t, label, language, date } = useI18n();
  const { state } = useSnapshot();
  const show = useShow();
  const g = useGarment(customerId, selected);
  const [open, setOpen] = useState(false);
  const changed = g.comparison?.rows.filter((r) => r.delta !== null).length ?? 0;
  return (
    <Shell>
      <div className="grid grid-cols-[12rem_1fr] gap-4">
        <div role="tablist" aria-orientation="vertical" aria-label={t('measure.tabs')} className="flex flex-col gap-1">
          {templates.map((tpl) => {
            const active = tpl.id === selected.id;
            const latest = state.profiles[`${customerId}:${tpl.id}`]?.versions.at(-1);
            return (
              <button
                key={tpl.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => select(tpl.id)}
                className={`flex flex-col items-start rounded-lg border px-3 py-2 text-start ${active ? 'border-brand bg-brand-soft' : 'border-transparent hover:bg-surface'}`}
              >
                <span className={`font-semibold ${active ? 'text-brand-strong' : ''}`}>{label(tpl.name)}</span>
                <span className="text-xs text-muted">{latest ? date(latest.takenAt) : t('measure.tabNone')}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          {!g.current ? (
            <>
              <p className="text-muted">{t('measure.none')}</p>
              <div>
                <TakeButton customerId={customerId} template={selected} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{label(selected.name)}</h3>
                  <Meta version={g.current} takerName={g.takerName} />
                </div>
                <TakeButton customerId={customerId} template={selected} />
              </div>
              <Notes text={g.current.notes} />
              <div className="grid grid-cols-2 gap-x-6">
                {fieldGroups(selected.fields).map((group) => {
                  const fields = group.fields.filter((f) => g.current!.values[f.key]);
                  if (fields.length === 0) return null;
                  return (
                    <dl key={group.group} className="m-0">
                      <dt className="pb-1 text-sm font-semibold text-muted">{groupLabel(group.group, t)}</dt>
                      {fields.map((f) => (
                        <dd key={f.key} className="m-0 flex justify-between border-t border-line py-1.5">
                          <span>{label(f.label)}</span>
                          <span className="font-semibold">{show(g.current!.values[f.key])}</span>
                        </dd>
                      ))}
                    </dl>
                  );
                })}
              </div>
              {g.comparison && g.comparison.columns.length > 1 && (
                <div className="rounded-lg border border-line">
                  <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm font-semibold">
                    <ChevronDown size={16} aria-hidden="true" className={open ? 'rotate-180' : ''} />
                    {pick(language, 'আগের মাপ ও অর্ডারের সাথে তুলনা', 'Compare with Earlier and Order Measurements')}
                    {changed > 0 && <span className="ms-auto text-xs font-normal text-muted">{pick(language, `${changed}টি মাপ বদলেছে`, `${changed} changed`)}</span>}
                  </button>
                  {open && (
                    <div className="border-t border-line p-3">
                      <MeasurementComparisonTable template={selected} comparison={g.comparison} takerName={g.takerName} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}

export function MeasurementPrototype(props: ProtoProps) {
  if (props.variant === 'B') return <Tiles {...props} />;
  if (props.variant === 'C') return <Compare {...props} />;
  if (props.variant === 'D') return <History {...props} />;
  return <Folded {...props} />;
}
