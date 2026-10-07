import type { Language } from '@darzikhata/domain';
import { Scissors } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate, formatMoney, formatNumber, translate } from '../../i18n/format';
import type { ReceiptModel } from './receipt';

/** A dotted line from a label out to its amount. Hidden from screen readers. */
function Leader({ top = false }: { top?: boolean }) {
  return (
    <td aria-hidden="true" className={`w-full px-2 ${top ? 'align-top' : 'align-bottom'}`}>
      <span className={`block border-b border-dotted border-muted ${top ? 'mt-[1.1em]' : 'mb-[0.4em]'}`} />
    </td>
  );
}

function MoneyRow({ label, note, amount, strong = false }: { label: string; note?: string; amount: string; strong?: boolean }) {
  return (
    <tr className={strong ? 'font-semibold' : ''}>
      <th scope="row" className="whitespace-nowrap py-0.5 text-start align-bottom font-[inherit]">
        {label}
        {note && <span className="ml-1 text-xs font-normal text-muted">({note})</span>}
      </th>
      <Leader />
      <td className="whitespace-nowrap py-0.5 text-right align-bottom tabular-nums">{amount}</td>
    </tr>
  );
}

function Fact({ label, children, end = false }: { label: string; children: ReactNode; end?: boolean }) {
  return (
    <p className={end ? 'text-right' : ''}>
      <span className="text-muted">{label}: </span>
      <b>{children}</b>
    </p>
  );
}

/**
 * The desktop receipt as a cash memo: the shop centred at the top, the order and customer, each garment with a dotted
 * line out to its price, the totals with the amount owed boxed, the payments, and a tear-off slip for the customer.
 */
export function ReceiptMemo({ model, language }: { model: ReceiptModel; language: Language }) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const money = (amount: number) => formatMoney(amount, language);
  const owed = model.creditDue > 0 ? { label: t('money.creditDue'), amount: model.creditDue } : { label: t('money.balance'), amount: model.balance };
  const orderLabel = t('receipt.orderNumber', { number: '' }).trim();
  const live = model.lines.filter((line) => !line.cancelled).length;
  const boxed = 'border-y-2 border-ink py-2';

  return (
    <div className="mx-auto flex min-h-[269mm] max-w-[150mm] flex-col print:min-h-0">
      <header className="text-center">
        <p className="font-display text-4xl font-bold">{model.shop.name}</p>
        {model.shop.address && <p className="mt-1 text-muted">{model.shop.address}</p>}
        {model.shop.phone && <p className="text-muted">{model.shop.phone}</p>}
        <h1 className="mx-auto mt-4 w-fit rounded-full border-2 border-ink px-5 py-0.5 text-sm font-bold uppercase tracking-[0.2em]">{t('receipt.title')}</h1>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 border-y-4 border-double border-ink py-3 text-sm">
        <Fact label={orderLabel}>{model.orderNumber}</Fact>
        <Fact label={t('receipt.date')} end>
          {formatDate(model.createdAt, language)}
        </Fact>
        <Fact label={t('receipt.name')}>{model.customer.name}</Fact>
        <p className="text-right">{model.customer.phone}</p>
      </div>

      <table aria-label={t('receipt.garments')} className="mt-4 w-full border-collapse">
        <thead className="sr-only">
          <tr>
            <th scope="col">{t('receipt.garment')}</th>
            <td />
            <th scope="col">{t('receipt.price')}</th>
          </tr>
        </thead>
        <tbody>
          {model.lines.map((line) => (
            <tr key={line.itemId} className="print-block">
              <td className="whitespace-nowrap py-1.5 align-top">
                <span className={`font-semibold ${line.cancelled ? 'line-through' : ''}`}>{line.garment}</span>
                {line.cancelled && <span className="ml-1 text-xs font-semibold">({t('receipt.cancelled')})</span>}
                <span className="block text-sm text-muted">
                  {[line.wearer, line.deliveryDate && `${t('receipt.delivery')}: ${formatDate(line.deliveryDate, language)}`].filter(Boolean).join(' · ')}
                </span>
              </td>
              <Leader top />
              <td className={`whitespace-nowrap py-1.5 text-right align-top tabular-nums ${line.cancelled ? 'line-through' : ''}`}>{money(line.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table aria-label={t('receipt.money')} className="print-block mt-4 w-full border-collapse border-t-2 border-ink">
        <tbody>
          <tr aria-hidden="true">
            <td colSpan={3} className="h-2" />
          </tr>
          <MoneyRow label={t('money.subtotal')} amount={money(model.subtotal)} />
          {model.discount && <MoneyRow label={t('money.discount')} note={model.discount.reason} amount={money(-model.discount.amount)} />}
          {model.adjustments.length > 0 && (
            <MoneyRow label={t('money.adjustments')} note={model.adjustments.map((a) => a.reason).join(', ')} amount={money(model.adjustmentsTotal)} />
          )}
          <MoneyRow label={t('money.total')} amount={money(model.total)} strong />
          <MoneyRow label={t('money.paid')} amount={money(model.paid)} />
          <tr aria-hidden="true">
            <td colSpan={3} className="h-3" />
          </tr>
          <tr data-tour="receipt-balance" className="text-lg font-bold">
            <th scope="row" className={`${boxed} whitespace-nowrap border-l-2 px-3 text-start`}>
              {owed.label}
            </th>
            <td className={boxed} />
            <td className={`${boxed} whitespace-nowrap border-r-2 px-3 text-right tabular-nums`}>{money(owed.amount)}</td>
          </tr>
        </tbody>
      </table>

      {model.payments.length > 0 && (
        <table aria-label={t('receipt.payments')} className="mt-6 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th scope="col" className="py-1 pr-3 font-semibold">{t('receipt.date')}</th>
              <th scope="col" className="py-1 pr-3 font-semibold">{t('receipt.kind')}</th>
              <th scope="col" className="py-1 pr-3 font-semibold">{t('receipt.method')}</th>
              <th scope="col" className="py-1 pr-3 font-semibold">{t('receipt.reference')}</th>
              <th scope="col" className="py-1 text-right font-semibold">{t('receipt.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {model.payments.map((payment) => (
              <tr key={payment.id} className="border-t border-line">
                <td className="py-1.5 pr-3">{formatDate(payment.at, language)}</td>
                <td className="py-1.5 pr-3">{t(`receipt.kind.${payment.kind}`)}</td>
                <td className="py-1.5 pr-3">{t(`method.${payment.method}`)}</td>
                <td className="py-1.5 pr-3 text-muted">{payment.reference}</td>
                <td className="py-1.5 text-right tabular-nums">{money(payment.effect)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section aria-label={t('receipt.slip')} className="print-block mt-auto pt-10">
        <div aria-hidden="true" className="flex items-center gap-2 text-muted">
          <Scissors size={16} />
          <span className="flex-1 border-t-2 border-dashed border-muted" />
        </div>
        <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-6 rounded-xl border-2 border-ink p-4">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{orderLabel}</p>
            <p className="font-display text-3xl font-bold">{model.orderNumber}</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">{model.customer.name}</p>
            <p>{t('receipt.slipGarments', { count: formatNumber(live, language) })}</p>
            {model.nextDelivery && (
              <p>
                {t('receipt.delivery')}: <b>{formatDate(model.nextDelivery, language)}</b>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{owed.label}</p>
            <p className="font-display text-2xl font-bold tabular-nums">{money(owed.amount)}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted">{t('receipt.slipHint')}</p>
      </section>
    </div>
  );
}
