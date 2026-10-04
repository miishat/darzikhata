import { useI18n } from '../../../i18n/I18nProvider';
import type { DraftTotals } from '../draft';

/** Price, discount, total, advance and what is left to pay, as typed so far. */
export function DraftSummary({ totals, desktop = false }: { totals: DraftTotals; desktop?: boolean }) {
  const { t, money } = useI18n();
  const rows: Array<{ key: string; label: string; amount: number; strong?: boolean }> = [
    { key: 'subtotal', label: t('money.subtotal'), amount: totals.subtotal },
  ];
  if (totals.discount > 0) rows.push({ key: 'discount', label: t('money.discount'), amount: -totals.discount });
  rows.push({ key: 'total', label: t('money.total'), amount: totals.total, strong: true });
  rows.push({ key: 'advance', label: t('money.advance'), amount: totals.advance });
  rows.push({ key: 'balance', label: desktop ? t('entry.balanceLeft') : t('money.balance'), amount: totals.balance, strong: true });
  return (
    <table aria-label={t('entry.summary')} className="w-full border-collapse text-left">
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-t border-line">
            <th scope="row" className={`py-2 pr-3 ${row.strong ? 'font-semibold' : 'font-normal'}`}>
              {row.label}
            </th>
            <td className={`py-2 text-right ${row.strong ? 'font-semibold' : ''} ${desktop && row.key === 'balance' ? 'text-warn' : ''}`}>{money(row.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
