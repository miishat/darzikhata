// PROTOTYPE (throwaway): desktop layouts for the job slip, switched with ?variant=. Never merged.
import {
  formatMeasurement,
  labelIn,
  shopContact,
  type Customer,
  type GarmentTemplate,
  type Language,
  type MeasurementValue,
  type Order,
  type OrderItem,
  type ShopConfig,
} from '@darzikhata/domain';
import { Scissors } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate, formatNumber, translate } from '../../i18n/format';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { itemTitle } from '../common/orderText';
import { fieldGroups, groupLabel } from '../customers/measurementView';

export const JOB_SLIP_VARIANTS = {
  A: 'Current slip',
  D: 'Chart: all garments on one page, each with its measurements as a ruler strip and the notes beside',
  E: 'Docket: ruled measurement table with the unit once, a sketch box and a fabric swatch square, fitting changes to tick off',
  F: 'D, with the fabric square, fitting changes to tick off and a sketch box from E in a row under the strip',
  G: 'D, the strip split by group (body, sleeve, neck) under spanning labels, notes and fitting changes side by side',
  H: 'E tighter: no sketch box, the swatch square beside the title, so two garments fit a page',
  I: 'E with the strip from D on top in place of the table, then notes, swatch and a wide sketch box',
  J: 'D as it is, plus a fabric swatch square to the right of the notes',
};

export function useJobSlipVariant() {
  return useVariant(Object.keys(JOB_SLIP_VARIANTS));
}

export function JobSlipSwitcher() {
  return <PrototypeSwitcher variants={JOB_SLIP_VARIANTS} />;
}

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);
const INK = 'bg-ink [print-color-adjust:exact]';

export interface JobSlipPaperProps {
  variant: string;
  language: Language;
  config: ShopConfig;
  order: Order;
  customer: Customer | undefined;
  mayMeasure: boolean;
}

interface Garment {
  item: OrderItem;
  title: string;
  template: GarmentTemplate | undefined;
  /** Measurement groups with only the fields that have a value. */
  groups: Array<{ label: string; fields: Array<{ key: string; label: string; value: MeasurementValue }> }>;
  unit: string;
  worker: string;
}

function useGarments({ language, config, order }: JobSlipPaperProps): Garment[] {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return order.items
    .filter((item) => !item.cancelled)
    .map((item) => {
      const template = config.templates.find((tpl) => tpl.id === item.templateId);
      const values = item.measurements?.values ?? {};
      const groups = template
        ? fieldGroups(template.fields)
            .map((g) => ({
              label: groupLabel(g.group, t),
              fields: g.fields.filter((f) => values[f.key]).map((f) => ({ key: f.key, label: labelIn(f.label, language), value: values[f.key]! })),
            }))
            .filter((g) => g.fields.length > 0)
        : [];
      const first = groups[0]?.fields[0]?.value;
      const unit = t(first?.unit === 'cm' ? 'unit.cm' : 'unit.inch');
      const worker = item.assignedTo ? (config.staff.find((s) => s.id === item.assignedTo)?.name ?? '') : translate(language, 'work.unassigned');
      return { item, title: itemTitle(order, item, language), template, groups, unit, worker };
    });
}

const num = (v: MeasurementValue, language: Language) => formatMeasurement(v.value, language);

function Header({ language, config, order, customer, title }: JobSlipPaperProps & { title: string }) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  return (
    <header className="mb-5">
      <div className="text-center">
        <p className="font-display text-3xl font-bold">{shopContact(config, language).name}</p>
        <h1 className={`mx-auto mt-3 w-fit rounded-full border-2 border-ink px-5 py-0.5 text-sm font-bold ${language === 'en' ? 'uppercase tracking-[0.2em]' : ''}`}>{title}</h1>
      </div>
      <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-6 border-y-4 border-double border-ink py-2">
        <p className="font-display text-2xl font-bold tabular-nums">{order.number}</p>
        <p className="text-sm">
          <b>{customer?.name}</b>
          {customer?.phone && <span className="text-muted"> · {customer.phone}</span>}
        </p>
        <p className="text-right text-sm">
          <span className="text-muted">{t('receipt.date')}: </span>
          <b>{formatDate(order.createdAt, language)}</b>
        </p>
      </div>
    </header>
  );
}

function Dates({ item, language, big = false }: { item: OrderItem; language: Language; big?: boolean }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const block = (label: string, date: string | null, strong: boolean) =>
    date && (
      <div className={`rounded-md border-2 border-ink px-2 text-center leading-tight ${strong ? `${INK} text-panel` : ''} ${big ? 'py-1' : ''}`}>
        <span className="block text-[10px] font-semibold">{label}</span>
        <span className={`block font-display font-bold ${big ? 'text-xl' : 'text-base'}`}>{formatDate(date, language, { year: false })}</span>
      </div>
    );
  return (
    <div className="flex gap-2">
      {block(t('print.trial'), item.trialDate, false)}
      {block(t('receipt.delivery'), item.deliveryDate, true)}
    </div>
  );
}

function Notes({ item, language }: { item: OrderItem; language: Language }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return (
    <dl className="m-0 space-y-2 text-sm">
      {item.designNotes && (
        <div>
          <dt className="text-xs font-semibold text-muted">{t('print.designNotes')}</dt>
          <dd className="m-0 font-semibold">{item.designNotes}</dd>
        </div>
      )}
      {item.fabricNote && (
        <div>
          <dt className="text-xs font-semibold text-muted">{t('print.fabricNote')}</dt>
          <dd className="m-0">{item.fabricNote}</dd>
        </div>
      )}
      {item.adjustments.length > 0 && (
        <div className="rounded-md border-2 border-ink p-2">
          <dt className="text-xs font-bold">{t('print.adjustments')}</dt>
          {item.adjustments.map((a) => (
            <dd key={a.id} className="m-0">
              {a.note}
            </dd>
          ))}
        </div>
      )}
    </dl>
  );
}

function Hidden({ language }: { language: Language }) {
  return <p className="text-sm text-muted">{translate(language, 'print.measurementsHidden')}</p>;
}

function Stages({ item, language }: { item: OrderItem; language: Language }) {
  const at = item.stages.findIndex((s) => s.key === item.stageKey);
  return (
    <ol className="m-0 flex list-none items-start gap-1.5 p-0">
      {item.stages.map((stage, i) => (
        <li key={stage.key} className="flex w-12 flex-col items-center gap-0.5 text-center">
          <span aria-hidden="true" className={`size-4 rounded-full border-ink ${i < at ? `border-2 ${INK}` : i === at ? 'border-[3px]' : 'border'}`} />
          <span className={`text-[9px] leading-tight ${i === at ? 'font-bold' : 'text-muted'}`}>{labelIn(stage.label, language)}</span>
        </li>
      ))}
    </ol>
  );
}

/** B: a bordered card per garment, notes on the left and the measurements as big tiles on the right. */
function BenchCards(props: JobSlipPaperProps) {
  const { language, mayMeasure } = props;
  const garments = useGarments(props);
  return (
    <>
      <Header {...props} title={translate(language, 'print.jobSlip')} />
      {garments.map((g) => (
        <section key={g.item.id} aria-label={g.title} className="print-block mb-5 overflow-hidden rounded-xl border-2 border-ink">
          <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-4 py-2">
            <div>
              <h2 className="font-display text-xl font-bold">{g.title}</h2>
              <p className="text-sm text-muted">{[g.item.wearer, g.worker].filter(Boolean).join(' · ')}</p>
            </div>
            <Dates item={g.item} language={language} />
          </div>
          <div className="grid grid-cols-[1fr_1.4fr] gap-5 p-4">
            <Notes item={g.item} language={language} />
            <div>
              {!mayMeasure ? (
                <Hidden language={language} />
              ) : (
                g.groups.map((group) => (
                  <div key={group.label} className="mb-2">
                    <p className="mb-1 text-xs font-semibold text-muted">
                      {group.label} <span className="font-normal">({g.unit})</span>
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {group.fields.map((f) => (
                        <div key={f.key} className="rounded-md border border-ink px-2 py-1">
                          <span className="block text-[10px] text-muted">{f.label}</span>
                          <span className="block font-display text-lg font-bold tabular-nums">{num(f.value, language)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end border-t border-line px-4 py-2">
            <Stages item={g.item} language={language} />
          </div>
        </section>
      ))}
    </>
  );
}

const SketchBox = ({ language, className = '' }: { language: Language; className?: string }) => (
  <div className={`relative rounded-lg border-2 border-dashed border-muted ${className}`}>
    <span className="absolute left-2 top-1 text-[10px] font-semibold text-muted">{pick(language, 'নকশা আঁকুন', 'Sketch')}</span>
  </div>
);

/** C: each garment on its own page, big boxes for the numbers, a sketch box, and a stub to pin to the fabric. */
function PagePerGarment(props: JobSlipPaperProps) {
  const { language, mayMeasure, order, customer } = props;
  const garments = useGarments(props);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return (
    <>
      {garments.map((g, i) => (
        <section
          key={g.item.id}
          aria-label={g.title}
          className={`flex min-h-[269mm] flex-col print:min-h-0 ${i > 0 ? 'mt-[14mm] border-t-2 border-dashed border-line pt-[14mm] print:mt-0 print:break-before-page print:border-0 print:pt-0' : ''}`}
        >
          <header className="flex items-end justify-between gap-4 border-b-4 border-ink pb-3">
            <div>
              <p className="text-xs font-semibold text-muted">
                {t('print.jobSlip')} · {order.number} · {customer?.name} · {formatNumber(i + 1, language)}/{formatNumber(garments.length, language)}
              </p>
              <h2 className="font-display text-4xl font-bold">{g.title}</h2>
              <p className="text-sm text-muted">{[g.item.wearer, g.worker].filter(Boolean).join(' · ')}</p>
            </div>
            <Dates item={g.item} language={language} big />
          </header>
          <div className="mt-4">
            {!mayMeasure ? (
              <Hidden language={language} />
            ) : (
              g.groups.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="mb-1 text-sm font-semibold text-muted">
                    {group.label} ({g.unit})
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {group.fields.map((f) => (
                      <div key={f.key} className="rounded-lg border-2 border-ink px-3 py-2">
                        <span className="block text-xs text-muted">{f.label}</span>
                        <span className="block font-display text-3xl font-bold tabular-nums">{num(f.value, language)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1.3fr] gap-4">
            <Notes item={g.item} language={language} />
            <SketchBox language={language} className="min-h-48" />
          </div>
          <div className="mt-auto pt-8">
            <div aria-hidden="true" className="flex items-center gap-2 text-muted">
              <Scissors size={16} />
              <span className="flex-1 border-t-2 border-dashed border-muted" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border-2 border-ink px-4 py-2">
              <p className="font-display text-3xl font-bold tabular-nums">{order.number}</p>
              <p className="text-center font-semibold">
                {g.title}
                <span className="block text-sm font-normal text-muted">{g.item.wearer || customer?.name}</span>
              </p>
              <p className="text-right text-sm">
                {t('receipt.delivery')}
                <b className="block text-lg">{g.item.deliveryDate ? formatDate(g.item.deliveryDate, language, { year: false }) : '-'}</b>
              </p>
            </div>
            <p className="mt-1 text-center text-xs text-muted">{pick(language, 'কেটে কাপড়ের সাথে আটকে রাখুন', 'Cut off and pin to the fabric')}</p>
          </div>
        </section>
      ))}
    </>
  );
}

/** D: every garment on one page, its numbers as a strip of cells like a ruler, the notes beside. */
function Chart(props: JobSlipPaperProps & { swatch?: boolean }) {
  const { language, mayMeasure, swatch = false } = props;
  const garments = useGarments(props);
  return (
    <>
      <Header {...props} title={translate(language, 'print.jobSlip')} />
      {garments.map((g) => {
        const fields = g.groups.flatMap((group) => group.fields);
        return (
          <section key={g.item.id} aria-label={g.title} className="print-block mb-5 border-b-2 border-ink pb-4">
            <div className="mb-2 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold">
                {g.title} <span className="font-sans text-sm font-normal text-muted">· {[g.item.wearer, g.worker].filter(Boolean).join(' · ')}</span>
              </h2>
              <Dates item={g.item} language={language} />
            </div>
            {!mayMeasure ? (
              <Hidden language={language} />
            ) : (
              <table className="mb-2 w-full table-fixed border-collapse border-2 border-ink text-center">
                <thead>
                  <tr>
                    {fields.map((f) => (
                      <th key={f.key} scope="col" className="border border-ink px-1 py-0.5 text-[10px] font-semibold text-muted">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {fields.map((f) => (
                      <td key={f.key} className="border border-ink py-1 font-display text-xl font-bold tabular-nums">
                        {num(f.value, language)}
                      </td>
                    ))}
                  </tr>
                </tbody>
                <caption className="caption-bottom pt-0.5 text-end text-[10px] text-muted">{g.unit}</caption>
              </table>
            )}
            {swatch ? (
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <Notes item={g.item} language={language} />
                </div>
                <Swatch language={language} className="w-24" />
              </div>
            ) : (
              <Notes item={g.item} language={language} />
            )}
          </section>
        );
      })}
    </>
  );
}

/** E: a ruled table with the unit once, a sketch box and a fabric swatch square, fitting changes to tick off. */
function Docket(props: JobSlipPaperProps) {
  const { language, mayMeasure } = props;
  const garments = useGarments(props);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return (
    <>
      <Header {...props} title={t('print.jobSlip')} />
      {garments.map((g) => (
        <section key={g.item.id} aria-label={g.title} className="print-block mb-6">
          <div className="mb-2 flex items-end justify-between gap-4 border-b-2 border-ink pb-1">
            <div>
              <h2 className="font-display text-xl font-bold">{g.title}</h2>
              <p className="text-sm text-muted">{[g.item.wearer, g.worker].filter(Boolean).join(' · ')}</p>
            </div>
            <Dates item={g.item} language={language} />
          </div>
          <div className="grid grid-cols-[16rem_1fr] gap-5">
            {!mayMeasure ? (
              <Hidden language={language} />
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-xs text-muted">
                    <th scope="col" className="py-1 text-start font-semibold">
                      {pick(language, 'মাপ', 'Measurement')}
                    </th>
                    <th scope="col" className="py-1 text-end font-semibold">
                      {g.unit}
                    </th>
                  </tr>
                </thead>
                {g.groups.map((group) => (
                  <tbody key={group.label}>
                    <tr>
                      <th scope="rowgroup" colSpan={2} className="pt-2 text-start text-[10px] font-semibold text-muted">
                        {group.label}
                      </th>
                    </tr>
                    {group.fields.map((f) => (
                      <tr key={f.key} className="border-b border-line">
                        <th scope="row" className="py-1 text-start font-normal">
                          {f.label}
                        </th>
                        <td className="py-1 text-end font-display text-lg font-bold tabular-nums">{num(f.value, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            )}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-[1fr_6rem] gap-3">
                <div className="space-y-2 text-sm">
                  {g.item.designNotes && (
                    <p>
                      <span className="text-xs font-semibold text-muted">{t('print.designNotes')}: </span>
                      <b>{g.item.designNotes}</b>
                    </p>
                  )}
                  {g.item.fabricNote && (
                    <p>
                      <span className="text-xs font-semibold text-muted">{t('print.fabricNote')}: </span>
                      {g.item.fabricNote}
                    </p>
                  )}
                </div>
                <div className="flex aspect-square items-center justify-center rounded-md border-2 border-dashed border-muted p-1 text-center text-[10px] text-muted">
                  {pick(language, 'কাপড়ের টুকরো', 'Fabric swatch')}
                </div>
              </div>
              {g.item.adjustments.length > 0 && (
                <div className="rounded-md border-2 border-ink p-2 text-sm">
                  <p className="text-xs font-bold">{t('print.adjustments')}</p>
                  <ul className="m-0 list-none p-0">
                    {g.item.adjustments.map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full border-2 border-ink" />
                        {a.note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <SketchBox language={language} className="min-h-36 flex-1" />
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

function Strip({ g, language, grouped = false }: { g: Garment; language: Language; grouped?: boolean }) {
  const fields = g.groups.flatMap((group) => group.fields);
  return (
    <table className="w-full table-fixed border-collapse border-2 border-ink text-center">
      <thead>
        {grouped && (
          <tr>
            {g.groups.map((group) => (
              <th key={group.label} scope="colgroup" colSpan={group.fields.length} className="border-2 border-ink px-1 py-0.5 text-[10px] font-bold">
                {group.label}
              </th>
            ))}
          </tr>
        )}
        <tr>
          {fields.map((f) => (
            <th key={f.key} scope="col" className="border border-ink px-1 py-0.5 text-[10px] font-semibold text-muted">
              {f.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {fields.map((f) => (
            <td key={f.key} className="border border-ink py-1 font-display text-xl font-bold tabular-nums">
              {num(f.value, language)}
            </td>
          ))}
        </tr>
      </tbody>
      <caption className="caption-bottom pt-0.5 text-end text-[10px] text-muted">{g.unit}</caption>
    </table>
  );
}

function Fittings({ item, language }: { item: OrderItem; language: Language }) {
  if (item.adjustments.length === 0) return null;
  return (
    <div className="rounded-md border-2 border-ink p-2 text-sm">
      <p className="text-xs font-bold">{translate(language, 'print.adjustments')}</p>
      <ul className="m-0 list-none p-0">
        {item.adjustments.map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full border-2 border-ink" />
            {a.note}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DesignFabric({ item, language }: { item: OrderItem; language: Language }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return (
    <div className="space-y-1 text-sm">
      {item.designNotes && (
        <p>
          <span className="text-xs font-semibold text-muted">{t('print.designNotes')}: </span>
          <b>{item.designNotes}</b>
        </p>
      )}
      {item.fabricNote && (
        <p>
          <span className="text-xs font-semibold text-muted">{t('print.fabricNote')}: </span>
          {item.fabricNote}
        </p>
      )}
    </div>
  );
}

const Swatch = ({ language, className = 'w-24' }: { language: Language; className?: string }) => (
  <div className={`flex aspect-square shrink-0 items-center justify-center rounded-md border-2 border-dashed border-muted p-1 text-center text-[10px] text-muted ${className}`}>
    {pick(language, 'কাপড়ের টুকরো', 'Fabric swatch')}
  </div>
);

function GarmentHead({ g, language, children }: { g: Garment; language: Language; children?: ReactNode }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-4 border-b-2 border-ink pb-1">
      <div className="flex items-end gap-3">
        {children}
        <div>
          <h2 className="font-display text-xl font-bold">{g.title}</h2>
          <p className="text-sm text-muted">{[g.item.wearer, g.worker].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <Dates item={g.item} language={language} />
    </div>
  );
}

function MeasureTable({ g, language }: { g: Garment; language: Language }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-ink text-xs text-muted">
          <th scope="col" className="py-1 text-start font-semibold">
            {pick(language, 'মাপ', 'Measurement')}
          </th>
          <th scope="col" className="py-1 text-end font-semibold">
            {g.unit}
          </th>
        </tr>
      </thead>
      {g.groups.map((group) => (
        <tbody key={group.label}>
          <tr>
            <th scope="rowgroup" colSpan={2} className="pt-2 text-start text-[10px] font-semibold text-muted">
              {group.label}
            </th>
          </tr>
          {group.fields.map((f) => (
            <tr key={f.key} className="border-b border-line">
              <th scope="row" className="py-1 text-start font-normal">
                {f.label}
              </th>
              <td className="py-1 text-end font-display text-lg font-bold tabular-nums">{num(f.value, language)}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

/** F: D's strip, then a row of notes and fitting changes, the swatch square and a sketch box. */
function ChartWithBoxes(props: JobSlipPaperProps) {
  const { language, mayMeasure } = props;
  const garments = useGarments(props);
  return (
    <>
      <Header {...props} title={translate(language, 'print.jobSlip')} />
      {garments.map((g) => (
        <section key={g.item.id} aria-label={g.title} className="print-block mb-6">
          <GarmentHead g={g} language={language} />
          {mayMeasure ? <Strip g={g} language={language} /> : <Hidden language={language} />}
          <div className="mt-2 grid grid-cols-[1fr_6rem_1.2fr] gap-3">
            <div className="flex flex-col gap-2">
              <DesignFabric item={g.item} language={language} />
              <Fittings item={g.item} language={language} />
            </div>
            <Swatch language={language} className="w-full self-start" />
            <SketchBox language={language} className="min-h-28" />
          </div>
        </section>
      ))}
    </>
  );
}

/** G: D with the strip grouped under spanning labels; notes and fitting changes side by side. */
function GroupedChart(props: JobSlipPaperProps) {
  const { language, mayMeasure } = props;
  const garments = useGarments(props);
  return (
    <>
      <Header {...props} title={translate(language, 'print.jobSlip')} />
      {garments.map((g) => (
        <section key={g.item.id} aria-label={g.title} className="print-block mb-5 border-b-2 border-ink pb-4">
          <GarmentHead g={g} language={language} />
          {mayMeasure ? <Strip g={g} language={language} grouped /> : <Hidden language={language} />}
          <div className="mt-2 grid grid-cols-2 gap-4">
            <DesignFabric item={g.item} language={language} />
            <Fittings item={g.item} language={language} />
          </div>
        </section>
      ))}
    </>
  );
}

/** H: E without the sketch box; the swatch beside the title, the table and notes side by side. */
function TightDocket(props: JobSlipPaperProps) {
  const { language, mayMeasure } = props;
  const garments = useGarments(props);
  return (
    <>
      <Header {...props} title={translate(language, 'print.jobSlip')} />
      {garments.map((g) => (
        <section key={g.item.id} aria-label={g.title} className="print-block mb-5">
          <GarmentHead g={g} language={language}>
            <Swatch language={language} className="w-14" />
          </GarmentHead>
          <div className="grid grid-cols-[16rem_1fr] gap-5">
            {mayMeasure ? <MeasureTable g={g} language={language} /> : <Hidden language={language} />}
            <div className="flex flex-col gap-2">
              <DesignFabric item={g.item} language={language} />
              <Fittings item={g.item} language={language} />
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

/** I: E with the strip on top in place of the table, then notes, swatch and a wide sketch box. */
function DocketWithStrip(props: JobSlipPaperProps) {
  const { language, mayMeasure } = props;
  const garments = useGarments(props);
  return (
    <>
      <Header {...props} title={translate(language, 'print.jobSlip')} />
      {garments.map((g) => (
        <section key={g.item.id} aria-label={g.title} className="print-block mb-6">
          <GarmentHead g={g} language={language} />
          {mayMeasure ? <Strip g={g} language={language} /> : <Hidden language={language} />}
          <div className="mt-2 grid grid-cols-[16rem_1fr] gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <div className="flex-1">
                  <DesignFabric item={g.item} language={language} />
                </div>
                <Swatch language={language} className="w-20" />
              </div>
              <Fittings item={g.item} language={language} />
            </div>
            <SketchBox language={language} className="min-h-40" />
          </div>
        </section>
      ))}
    </>
  );
}

export function JobSlipPaper(props: JobSlipPaperProps): ReactNode {
  if (props.variant === 'F') return <ChartWithBoxes {...props} />;
  if (props.variant === 'G') return <GroupedChart {...props} />;
  if (props.variant === 'H') return <TightDocket {...props} />;
  if (props.variant === 'I') return <DocketWithStrip {...props} />;
  if (props.variant === 'J') return <Chart {...props} swatch />;

  if (props.variant === 'B') return <BenchCards {...props} />;
  if (props.variant === 'C') return <PagePerGarment {...props} />;
  if (props.variant === 'D') return <Chart {...props} />;
  return <Docket {...props} />;
}
