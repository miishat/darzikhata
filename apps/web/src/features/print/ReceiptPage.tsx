import type { Language } from '@darzikhata/domain';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { formatDate, formatMoney, translate } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { PrintLayout, usePrintLanguage } from './PrintLayout';
import { receiptModel, receiptShareText, type ReceiptModel } from './receipt';

/** The totals table: price, discount, adjustments, total, paid, then balance or credit due. */
export function MoneyTable({ model, language }: { model: ReceiptModel; language: Language }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const rows: Array<{ key: string; label: string; note?: string; amount: number; strong?: boolean }> = [
    { key: 'subtotal', label: t('money.subtotal'), amount: model.subtotal },
  ];
  if (model.discount) {
    rows.push({ key: 'discount', label: t('money.discount'), note: model.discount.reason, amount: -model.discount.amount });
  }
  if (model.adjustments.length > 0) {
    rows.push({
      key: 'adjustments',
      label: t('money.adjustments'),
      note: model.adjustments.map((a) => a.reason).join(', '),
      amount: model.adjustmentsTotal,
    });
  }
  rows.push({ key: 'total', label: t('money.total'), amount: model.total, strong: true });
  rows.push({ key: 'paid', label: t('money.paid'), amount: model.paid });
  rows.push(
    model.creditDue > 0
      ? { key: 'credit', label: t('money.creditDue'), amount: model.creditDue, strong: true }
      : { key: 'balance', label: t('money.balance'), amount: model.balance, strong: true },
  );
  return (
    <table aria-label={t('receipt.money')} className="w-full border-collapse text-left">
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-t border-line">
            <th scope="row" className={`py-2 pr-3 ${row.strong ? 'font-semibold' : 'font-normal'}`}>
              {row.label}
              {row.note && <span className="ml-2 text-sm font-normal text-muted">{row.note}</span>}
            </th>
            <td className={`py-2 text-right ${row.strong ? 'font-semibold' : ''}`}>{formatMoney(row.amount, language)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A printable receipt, in its own language, with share and print. */
export function ReceiptPage() {
  const { orderId = '' } = useParams();
  const app = useI18n();
  const { state, config } = useSnapshot();
  const [language, setLanguage] = usePrintLanguage();
  const [copied, setCopied] = useState(false);
  const order = state.orders[orderId];
  if (!order || !config) {
    return (
      <p role="alert" className="p-6">
        {app.t('print.notFound')}
      </p>
    );
  }
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const model = receiptModel(order, state.customers[order.customerId] ?? null, config, language);

  const share = async () => {
    const text = receiptShareText(model, language);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('receipt.title'), text });
      } catch {
        // Closing the share sheet is not a problem.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Copying can be blocked by the browser; nothing more to do.
    }
  };

  return (
    <PrintLayout
      back={{ to: `/app/orders/${order.id}`, label: app.t('print.back') }}
      title={t('receipt.title')}
      language={language}
      onLanguage={(next) => {
        setCopied(false);
        setLanguage(next);
      }}
      onShare={share}
      notice={copied ? app.t('print.copied') : null}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('receipt.title')}</h1>
          <p className="font-semibold">{model.shop.name}</p>
          {model.shop.phone && <p>{model.shop.phone}</p>}
          {model.shop.address && <p>{model.shop.address}</p>}
        </div>
        <div className="text-right">
          <p className="font-semibold">{t('receipt.orderNumber', { number: model.orderNumber })}</p>
          <p>
            {t('receipt.date')}: {formatDate(model.createdAt, language)}
          </p>
          {model.customer.name && <p>{model.customer.name}</p>}
          {model.customer.phone && <p>{model.customer.phone}</p>}
        </div>
      </header>

      <table aria-label={t('receipt.garments')} className="mb-6 w-full border-collapse text-left">
        <thead>
          <tr className="text-sm text-muted">
            <th scope="col" className="py-1 pr-3">
              {t('receipt.garment')}
            </th>
            <th scope="col" className="py-1 pr-3">
              {t('receipt.wearer')}
            </th>
            <th scope="col" className="py-1 pr-3">
              {t('receipt.delivery')}
            </th>
            <th scope="col" className="py-1 text-right">
              {t('receipt.price')}
            </th>
          </tr>
        </thead>
        <tbody>
          {model.lines.map((line) => (
            <tr key={line.itemId} className="border-t border-line">
              <td className="py-2 pr-3">
                <span className={line.cancelled ? 'line-through' : ''}>{line.garment}</span>
                {line.cancelled && <span className="ml-2 text-sm font-semibold">{t('receipt.cancelled')}</span>}
              </td>
              <td className="py-2 pr-3">{line.wearer ?? ''}</td>
              <td className="py-2 pr-3">{line.deliveryDate ? formatDate(line.deliveryDate, language) : ''}</td>
              <td className={`py-2 text-right ${line.cancelled ? 'line-through' : ''}`}>
                {formatMoney(line.price, language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-block mb-6">
        <MoneyTable model={model} language={language} />
      </div>

      {model.payments.length > 0 && (
        <table aria-label={t('receipt.payments')} className="w-full border-collapse text-left">
          <thead>
            <tr className="text-sm text-muted">
              <th scope="col" className="py-1 pr-3">
                {t('receipt.date')}
              </th>
              <th scope="col" className="py-1 pr-3">
                {t('receipt.kind')}
              </th>
              <th scope="col" className="py-1 pr-3">
                {t('receipt.method')}
              </th>
              <th scope="col" className="py-1 pr-3">
                {t('receipt.reference')}
              </th>
              <th scope="col" className="py-1 text-right">
                {t('receipt.amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {model.payments.map((payment) => (
              <tr key={payment.id} className="border-t border-line">
                <td className="py-2 pr-3">{formatDate(payment.at, language)}</td>
                <td className="py-2 pr-3">{t(`receipt.kind.${payment.kind}`)}</td>
                <td className="py-2 pr-3">{t(`method.${payment.method}`)}</td>
                <td className="py-2 pr-3">{payment.reference}</td>
                <td className="py-2 text-right">{formatMoney(payment.effect, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PrintLayout>
  );
}
