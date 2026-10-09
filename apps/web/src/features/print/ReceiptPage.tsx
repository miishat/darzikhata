import type { Language } from '@darzikhata/domain';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { formatMoney, translate } from '../../i18n/format';
import { shareOrCopy } from '../../lib/share';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { PhonePaperLayout, PrintLayout, usePrintLanguage } from './PrintLayout';
import { PhoneReceiptMemo } from './PhoneReceiptMemo';
import { receiptModel, receiptShareText, type ReceiptModel } from './receipt';
import { ReceiptMemo } from './ReceiptMemo';

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
          <tr key={row.key} data-tour={row.key === 'balance' ? 'receipt-balance' : undefined} className="border-t border-line">
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

/** A printable receipt, in its own language, with share and print. A desktop prints it as a cash memo with a tear-off slip, a phone without the slip. */
export function ReceiptPage() {
  const { orderId = '' } = useParams();
  const app = useI18n();
  const { kind } = useShell();
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
    if ((await shareOrCopy(t('receipt.title'), text)) === 'copied') setCopied(true);
  };

  const back = { to: `/app/orders/${order.id}`, label: app.t('print.back') };
  const onLanguage = (next: Language) => {
    setCopied(false);
    setLanguage(next);
  };
  const notice = copied ? app.t('print.copied') : null;

  return kind === 'desktop' ? (
    <PrintLayout
      back={back}
      title={t('receipt.title')}
      language={language}
      onLanguage={onLanguage}
      onShare={share}
      notice={notice}
      orderId={order.id}
    >
      <ReceiptMemo model={model} language={language} />
    </PrintLayout>
  ) : (
    <PhonePaperLayout back={back} title={t('receipt.title')} language={language} onLanguage={onLanguage} onShare={share} notice={notice}>
      <PhoneReceiptMemo model={model} language={language} />
    </PhonePaperLayout>
  );
}
