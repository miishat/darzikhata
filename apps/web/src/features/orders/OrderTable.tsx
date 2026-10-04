import { itemSummaryGroup, type Order } from '@darzikhata/domain';
import { TriangleAlert } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { stageTone } from '../../ui/stageTone';
import { useCan } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import type { OrderRow } from './orderList';

/** "৳১,৪০০", or "ফেরত পাওনা ৳৩০০" when the shop owes the customer. */
export function useBalanceText(): (balance: number) => string {
  const { t, money } = useI18n();
  return (balance) => (balance < 0 ? `${t('money.creditDue')} ${money(-balance)}` : money(balance));
}

export function useWorkerNames(): (ids: string[]) => string {
  const { config } = useSnapshot();
  return (ids) => ids.map((id) => config?.staff.find((s) => s.id === id)?.name ?? id).join(', ');
}

/** Garments shown as pills in a row; the rest are counted. */
const MAX_PILLS = 3;

interface Props {
  rows: OrderRow[];
  activeId: string | undefined;
  /** Enter: the order's own page. */
  onOpenFull(order: Order): void;
  /** Escape: close the panel. */
  onCloseDetail(): void;
}

/** Whether a garment still needs somebody on it but has nobody. */
function needsWorker(item: Order['items'][number]): boolean {
  return !item.cancelled && !item.assignedTo && itemSummaryGroup(item) !== 'delivered';
}

/**
 * Desktop list. A row selects its order and opens it beside the table; with focus in the table
 * Up and Down move the selection, Enter opens the full page and Escape closes the panel.
 */
export function OrderTable({ rows, activeId, onOpenFull, onCloseDetail }: Props) {
  const { t, language, date, money, label, number } = useI18n();
  const can = useCan();
  const { search } = useLocation();
  const navigate = useNavigate();
  const balanceText = useBalanceText();
  const workerNames = useWorkerNames();
  const body = useRef<HTMLTableSectionElement>(null);
  const showMoney = can('money.view');
  const head = 'whitespace-nowrap px-3 py-2 text-start text-sm font-semibold text-muted';
  const target = (id: string) => ({ pathname: `/app/orders/${id}`, search });
  // One tab stop for the whole table: the open order, or the first row.
  const stop = rows.some((row) => row.order.id === activeId) ? activeId : rows[0]?.order.id;

  const move = (from: number, step: number) => {
    const next = rows[Math.min(rows.length - 1, Math.max(0, from + step))];
    if (!next) return;
    navigate(target(next.order.id), { replace: true });
    body.current?.querySelector<HTMLElement>(`[data-order-id="${next.order.id}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const row = (event.target as HTMLElement).closest<HTMLElement>('tr[data-order-id]');
    const index = rows.findIndex((r) => r.order.id === row?.dataset.orderId);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      // Before anything is focused, Down goes to the first row.
      move(index < 0 ? -1 : index, event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Escape' && activeId) {
      event.preventDefault();
      onCloseDetail();
    } else if (event.key === 'Enter' && event.target === row && index >= 0) {
      event.preventDefault();
      onOpenFull(rows[index]!.order);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-panel">
      <table aria-label={t('orders.list')} aria-keyshortcuts="ArrowUp ArrowDown Enter Escape" onKeyDown={onKeyDown} className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className={head}>{t('orders.col.customer')}</th>
            <th scope="col" className={head}>{t('orders.col.garmentsStage')}</th>
            <th scope="col" className={head}>{t('orders.col.delivery')}</th>
            <th scope="col" className={head}>{t('orders.col.workers')}</th>
            {showMoney && <th scope="col" className={`${head} text-end`}>{t('orders.col.balance')}</th>}
          </tr>
        </thead>
        <tbody ref={body}>
          {rows.map((row) => {
            const { order } = row;
            const selected = order.id === activeId;
            const live = order.items.filter((item) => !item.cancelled);
            const hasUnassigned = live.some(needsWorker);
            return (
              <tr
                key={order.id}
                data-order-id={order.id}
                aria-selected={selected}
                tabIndex={order.id === stop ? 0 : -1}
                onClick={() => navigate(target(order.id), { replace: true })}
                className={`cursor-pointer border-b border-line last:border-b-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                  selected ? 'bg-brand-soft' : 'hover:bg-surface'
                }`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    {row.customer && <Avatar id={row.customer.id} name={row.customer.name} />}
                    <div className="flex min-w-0 flex-col">
                      <Link
                        to={target(order.id)}
                        replace
                        aria-current={selected ? 'page' : undefined}
                        onClick={(event) => event.stopPropagation()}
                        className="truncate font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        {row.customer?.name ?? order.number}
                      </Link>
                      <span className="text-sm text-muted">{order.number}</span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
                    {live.slice(0, MAX_PILLS).map((item) => {
                      const index = item.stages.findIndex((s) => s.key === item.stageKey);
                      const stage = item.stages[index];
                      return (
                        <li key={item.id} className="flex items-center gap-1.5 text-sm">
                          <span className="text-muted">{itemTitle(order, item, language)}</span>
                          <StagePill label={stage ? label(stage.label) : item.stageKey} tone={stageTone(stage, itemSummaryGroup(item), Math.max(index, 0))} />
                        </li>
                      );
                    })}
                    {live.length > MAX_PILLS && <li className="text-sm text-muted">{t('orders.moreGarments', { n: number(live.length - MAX_PILLS) })}</li>}
                  </ul>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-sm">
                  {row.nextDelivery ? (
                    <div className="flex flex-col items-start gap-0.5">
                      <span>{date(row.nextDelivery)}</span>
                      <DueLabel date={row.nextDelivery} />
                    </div>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-sm">
                  <div className="flex flex-col gap-0.5">
                    {row.workers.length > 0 && <span>{workerNames(row.workers)}</span>}
                    {hasUnassigned && (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-warn">
                        <TriangleAlert aria-hidden="true" size={14} />
                        {t('orders.unassigned')}
                      </span>
                    )}
                  </div>
                </td>
                {showMoney && (
                  <td className="whitespace-nowrap px-3 py-2 text-end">
                    {row.balance > 0 ? (
                      <span className="font-semibold text-warn">{money(row.balance)}</span>
                    ) : (
                      <span className="text-sm font-semibold text-ok">{row.balance < 0 ? balanceText(row.balance) : t('orders.card.paid')}</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
