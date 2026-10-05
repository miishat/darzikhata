import type { Order } from '@darzikhata/domain';
import { ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export interface DueRow {
  order: Order;
  customer: string;
  total: number;
  paid: number;
  balance: number;
}
export interface CreditRow {
  order: Order;
  customer: string;
  amount: number;
}

export interface MobilePaymentsProps {
  rows: DueRow[];
  credit: CreditRow[];
  total: number;
  query: string;
  onQueryChange(query: string): void;
}

/** Phone payments list: search, the total still due, one card per unpaid order with a paid bar, then credit owed to customers. No sideways scrolling. */
export function MobilePayments({ rows, credit, total, query, onQueryChange }: MobilePaymentsProps) {
  const { t, money } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-panel px-3 focus-within:outline-2 focus-within:outline-focus">
        <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
        <span className="sr-only">{t('orders.search')}</span>
        <input type="search" value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder={t('orders.search')} className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted" />
      </label>
      <p className="flex items-baseline justify-between px-1">
        <span className="text-sm font-semibold text-muted">{t('payments.dueTotal')}</span>
        <span className="font-display text-xl font-bold text-warn">{money(total)}</span>
      </p>
      <ul aria-label={t('payments.due')} className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const pct = r.total > 0 ? Math.min(100, Math.round((r.paid / r.total) * 100)) : 0;
          return (
            <li key={r.order.id}>
              <Link to={`/app/orders/${r.order.id}`} className={`flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5 ${FOCUS}`}>
                <span className="flex items-center gap-3">
                  <Avatar id={r.order.customerId} name={r.customer} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{r.customer}</span>
                    <span className="text-sm text-muted">{r.order.number}</span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-display text-lg font-bold text-warn">{money(r.balance)}</span>
                    <span className="text-xs text-muted">{t('orders.card.owed')}</span>
                  </span>
                </span>
                <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
                </span>
                <span className="flex justify-between text-xs text-muted">
                  <span>
                    {t('money.paid')} {money(r.paid)}
                  </span>
                  <span>
                    {t('orders.col.total')} {money(r.total)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {credit.length > 0 && (
        <section aria-label={t('payments.credit')} className="flex flex-col gap-1.5">
          <h2 className="px-1 text-sm font-semibold text-muted">{t('payments.credit')}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-panel ring-1 ring-inset ring-line">
            {credit.map((c) => (
              <li key={c.order.id}>
                <Link to={`/app/orders/${c.order.id}`} className={`flex min-h-14 items-center gap-3 px-3 py-2 ${FOCUS}`}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{c.customer}</span>
                    <span className="text-sm text-muted">{c.order.number}</span>
                  </span>
                  <span className="font-display font-bold text-ok">{money(c.amount)}</span>
                  <ChevronRight size={18} aria-hidden="true" className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
