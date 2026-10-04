import { itemSummaryGroup, labelIn, stageByKey } from '@darzikhata/domain';
import { CalendarDays } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { stageTone } from '../../ui/stageTone';
import { useCan } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import type { OrderRow } from './orderList';

/** Mobile list: one card per order, the whole card is the link. */
export function OrderCards({ rows }: { rows: OrderRow[] }) {
  const { t, language, date, money, number } = useI18n();
  const can = useCan();
  const { search } = useLocation();
  const showMoney = can('money.view');

  return (
    <ul aria-label={t('orders.list')} className="flex flex-col gap-2.5">
      {rows.map((row) => {
        const name = row.customer?.name ?? '';
        const garments = row.order.items.filter((item) => !item.cancelled);
        const owed = row.balance > 0;
        return (
          <li key={row.order.id}>
            <Link
              to={{ pathname: `/app/orders/${row.order.id}`, search }}
              className="flex min-h-11 flex-col gap-2.5 rounded-2xl border border-line bg-panel p-3.5 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span className="flex items-center gap-3">
                <Avatar id={row.order.customerId} name={name} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="truncate text-sm text-muted">
                    {t('orders.card.meta', { number: row.order.number, n: number(garments.length) })}
                  </span>
                </span>
                {showMoney && (
                  <span className="flex flex-col items-end">
                    <span className={`font-display text-lg font-bold ${owed ? 'text-warn' : 'text-ok'}`}>
                      {owed ? money(row.balance) : row.balance < 0 ? money(-row.balance) : t('orders.card.paid')}
                    </span>
                    {(owed || row.balance < 0) && (
                      <span className="text-xs text-muted">{owed ? t('orders.card.owed') : t('money.creditDue')}</span>
                    )}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {garments.map((item) => {
                  const stage = stageByKey(item.stages, item.stageKey);
                  return (
                    <StagePill
                      key={item.id}
                      label={`${itemTitle(row.order, item, language)} · ${labelIn(stage.label, language)}`}
                      tone={stageTone(stage, itemSummaryGroup(item), item.stages.indexOf(stage))}
                    />
                  );
                })}
              </span>
              {row.nextDelivery && (
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <CalendarDays aria-hidden="true" size={16} />
                  <span>{`${t('receipt.delivery')} ${date(row.nextDelivery)}`}</span>
                  <span className="ms-auto">
                    <DueLabel date={row.nextDelivery} />
                  </span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
