import type { Language } from '@darzikhata/domain';
import { formatDate, formatMoney, translate } from '../../i18n/format';
import type { ReceiptModel } from './receipt';
import { MemoMoney } from './ReceiptMemo';

/**
 * The phone's receipt as a cash memo: the shop centred, the order and customer, each garment with a dotted line out
 * to its price, the desktop memo's totals with the amount owed boxed, and the payments as two-line rows. The tear-off
 * slip is left out.
 */
export function PhoneReceiptMemo({ model, language }: { model: ReceiptModel; language: Language }) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const money = (amount: number) => formatMoney(amount, language);
  const orderLabel = t('receipt.orderNumber', { number: '' }).trim();

  return (
    <>
      <header className="text-center">
        <p className="font-display text-2xl font-bold">{model.shop.name}</p>
        {model.shop.address && <p className="text-sm text-muted">{model.shop.address}</p>}
        {model.shop.phone && <p className="text-sm text-muted">{model.shop.phone}</p>}
        <h1 className={`mx-auto mt-3 w-fit rounded-full border-2 border-ink px-4 py-0.5 text-xs font-bold ${language === 'en' ? 'uppercase tracking-[0.2em]' : ''}`}>
          {t('receipt.title')}
        </h1>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-0.5 border-y-4 border-double border-ink py-2 text-sm">
        <p>
          <span className="text-muted">{orderLabel}: </span>
          <b>{model.orderNumber}</b>
        </p>
        <p className="text-end">{formatDate(model.createdAt, language)}</p>
        <p className="font-semibold">{model.customer.name}</p>
        <p className="text-end">{model.customer.phone}</p>
      </div>

      <table aria-label={t('receipt.garments')} className="mt-3 w-full border-collapse">
        <thead className="sr-only">
          <tr>
            <th scope="col">{t('receipt.garment')}</th>
            <th scope="col">{t('receipt.price')}</th>
          </tr>
        </thead>
        <tbody>
          {model.lines.map((line) => (
            <tr key={line.itemId} className="print-block">
              <td className="w-full py-1.5 align-top">
                <span className="flex items-baseline">
                  <span>
                    <span className={`font-semibold ${line.cancelled ? 'line-through' : ''}`}>{line.garment}</span>
                    {line.cancelled && <span className="ms-1 text-xs font-semibold">({t('receipt.cancelled')})</span>}
                  </span>
                  <span aria-hidden="true" className="mx-2 mb-[0.35em] min-w-4 flex-1 self-end border-b border-dotted border-muted" />
                </span>
                <span className="block text-xs text-muted">
                  {[line.wearer, line.deliveryDate && `${t('receipt.delivery')}: ${formatDate(line.deliveryDate, language)}`].filter(Boolean).join(' · ')}
                </span>
              </td>
              <td className={`whitespace-nowrap py-1.5 text-right align-top tabular-nums ${line.cancelled ? 'line-through' : ''}`}>{money(line.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-sm">
        <MemoMoney model={model} language={language} />
      </div>

      {model.payments.length > 0 && (
        <table aria-label={t('receipt.payments')} className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="colgroup" colSpan={2} className="border-b border-ink pb-0.5 text-start text-xs font-bold text-muted">
                {t('receipt.payments')}
              </th>
            </tr>
          </thead>
          <tbody>
            {model.payments.map((payment) => (
              <tr key={payment.id} className="border-b border-line">
                <td className="py-1.5 pe-3">
                  <span className="block">
                    {t(`receipt.kind.${payment.kind}`)} · {t(`method.${payment.method}`)}
                  </span>
                  <span className="block text-xs text-muted">{[formatDate(payment.at, language), payment.reference].filter(Boolean).join(' · ')}</span>
                </td>
                <td className="py-1.5 text-right align-top font-semibold tabular-nums">{money(payment.effect)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
