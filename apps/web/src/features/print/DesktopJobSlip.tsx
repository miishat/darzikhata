import { formatMeasurement, labelIn, shopContact, type Customer, type Language, type Order, type OrderItem, type ShopConfig } from '@darzikhata/domain';
import { formatDate, translate } from '../../i18n/format';
import { itemTitle } from '../common/orderText';
import { fieldGroups } from '../customers/measurementView';

export interface DesktopJobSlipProps {
  language: Language;
  config: ShopConfig;
  order: Order;
  customer: Customer | undefined;
  /** Whether the viewer may see this customer's measurements. */
  mayMeasure: boolean;
}

// Filled shapes must print as they look, not be dropped with the background colours.
const INK = 'bg-ink [print-color-adjust:exact]';

/**
 * The desktop job slip as a chart: the shop and the title like the receipt, the order number, customer and order
 * date between double rules, then each garment with its trial and delivery dates as blocks, its measurements as one
 * strip of cells like a ruler (the names above, big numbers below, the unit once), and its notes underneath.
 */
export function DesktopJobSlip({ language, config, order, customer, mayMeasure }: DesktopJobSlipProps) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const staffName = (id: string | null) => (id === null ? t('work.unassigned') : (config.staff.find((s) => s.id === id)?.name ?? ''));

  return (
    <>
      <header className="mb-5">
        <div className="text-center">
          <p className="font-display text-3xl font-bold">{shopContact(config, language).name}</p>
          <h1 className={`mx-auto mt-3 w-fit rounded-full border-2 border-ink px-5 py-0.5 text-sm font-bold ${language === 'en' ? 'uppercase tracking-[0.2em]' : ''}`}>
            {t('print.jobSlip')}
          </h1>
        </div>
        <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-6 border-y-4 border-double border-ink py-2">
          <p className="font-display text-2xl font-bold tabular-nums">
            <span className="sr-only">{t('receipt.orderNumber', { number: '' })}</span>
            {order.number}
          </p>
          <p className="text-sm">
            <b>{customer?.name}</b>
            {customer?.phone && <span className="text-muted"> · {customer.phone}</span>}
          </p>
          <p className="text-end text-sm">
            <span className="text-muted">{t('receipt.date')}: </span>
            <b>{formatDate(order.createdAt, language)}</b>
          </p>
        </div>
      </header>
      {order.items
        .filter((item) => !item.cancelled)
        .map((item) => {
          const title = itemTitle(order, item, language);
          return (
            <section key={item.id} aria-label={title} className="print-block mb-5 border-b-2 border-ink pb-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold">
                  {title}{' '}
                  <span className="font-sans text-sm font-normal text-muted">· {[item.wearer, staffName(item.assignedTo)].filter(Boolean).join(' · ')}</span>
                </h2>
                <Dates item={item} language={language} />
              </div>
              {mayMeasure ? <Strip item={item} config={config} language={language} /> : <p className="text-sm text-muted">{t('print.measurementsHidden')}</p>}
              <Notes item={item} language={language} />
            </section>
          );
        })}
    </>
  );
}

function Dates({ item, language }: { item: OrderItem; language: Language }) {
  const block = (label: string, date: string | null, filled: boolean) =>
    date && (
      <p className={`rounded-md border-2 border-ink px-2 text-center leading-tight ${filled ? `${INK} text-panel` : ''}`}>
        <span className="block text-[10px] font-semibold">{label}</span>
        <span className="block font-display text-base font-bold">{formatDate(date, language, { year: false })}</span>
      </p>
    );
  return (
    <div className="flex shrink-0 gap-2">
      {block(translate(language, 'print.trial'), item.trialDate, false)}
      {block(translate(language, 'receipt.delivery'), item.deliveryDate, true)}
    </div>
  );
}

/** The measurements in the template's order as one row of cells; a value in another unit says its own. */
function Strip({ item, config, language }: { item: OrderItem; config: ShopConfig; language: Language }) {
  const template = config.templates.find((tpl) => tpl.id === item.templateId);
  const values = item.measurements?.values ?? {};
  const fields = template ? fieldGroups(template.fields).flatMap((g) => g.fields.filter((f) => values[f.key])) : [];
  if (fields.length === 0) return null;
  const unit = values[fields[0]!.key]!.unit;
  const unitName = (u: string) => translate(language, u === 'cm' ? 'unit.cm' : 'unit.inch');
  return (
    <table aria-label={translate(language, 'print.measurementsIn', { unit: unitName(unit) })} className="mb-2 w-full table-fixed border-collapse border-2 border-ink text-center">
      <thead>
        <tr>
          {fields.map((f) => (
            <th key={f.key} scope="col" className="border border-ink px-1 py-0.5 text-[10px] font-semibold text-muted">
              {labelIn(f.label, language)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {fields.map((f) => {
            const value = values[f.key]!;
            return (
              <td key={f.key} className="border border-ink py-1 font-display text-xl font-bold tabular-nums">
                {formatMeasurement(value.value, language)}
                {value.unit !== unit && <span className="ms-0.5 font-sans text-[10px] font-normal">{unitName(value.unit)}</span>}
              </td>
            );
          })}
        </tr>
      </tbody>
      <caption className="caption-bottom pt-0.5 text-end text-[10px] text-muted">{unitName(unit)}</caption>
    </table>
  );
}

function Notes({ item, language }: { item: OrderItem; language: Language }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  if (!item.designNotes && !item.fabricNote && item.adjustments.length === 0) return null;
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
