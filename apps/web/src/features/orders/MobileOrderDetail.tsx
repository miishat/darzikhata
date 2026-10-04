import { isOrderClosed, moneySummary, orderProgress, type Order } from '@darzikhata/domain';
import { ArrowLeft, Banknote, EllipsisVertical, MessageCircle, Phone, Printer, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { ActionSheet, ActionSheetItem } from '../../ui/ActionSheet';
import { Avatar } from '../../ui/Avatar';
import { BOTTOM_BAR_SPACE, BottomBar } from '../../ui/BottomBar';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { IconButton } from '../../ui/IconButton';
import { useCan } from '../common/hooks';
import { itemTitle, progressText } from '../common/orderText';
import { StatusLinkSection } from '../links/StatusLinkSection';
import { MoneyCard, useMoneyDialogs } from '../payments/OrderMoney';
import { HandOverDialog } from './itemDialogs';
import { MobileItemCard } from './MobileItemCard';
import { nextMove } from './stageMoves';
import { wearerGroups } from './wearers';

const ROUND = 'flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const BAR_BUTTON = 'min-h-[54px]! rounded-2xl! text-base';

/** The phone order screen: customer, money, garments, and a bottom bar for printing, handing over and taking payment. */
export function MobileOrderDetail({ order }: { order: Order }) {
  const { t, language, date } = useI18n();
  const can = useCan();
  const { state, config } = useSnapshot();
  const { search } = useLocation();
  const money = useMoneyDialogs(order);
  const [sharing, setSharing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [handingId, setHandingId] = useState<string | null>(null);

  const customer = state.customers[order.customerId];
  const takenBy = config?.staff.find((s) => s.id === order.createdBy)?.name;
  const groups = wearerGroups(order);
  const taken = date(order.createdAt.slice(0, 10));

  const ready = order.items.filter((item) => can('work.updateStage') && nextMove(item)?.stage.group === 'delivered');
  const showTake = can('money.view') && can('payments.record') && moneySummary(order).balance > 0;
  const hasBar = can('money.view') || ready.length > 0;
  const handing = order.items.find((item) => item.id === handingId);

  const startHandOver = () => {
    if (ready.length === 1) setHandingId(ready[0]!.id);
    else if (ready.length > 1) setPicking(true);
  };

  return (
    <div className={`flex flex-col gap-3 ${hasBar ? BOTTOM_BAR_SPACE : ''}`}>
      <header className="-mx-2 flex items-center gap-1">
        <Link to={{ pathname: '/app/orders', search }} aria-label={t('orders.back')} className={`${ROUND} text-ink hover:bg-surface`}>
          <ArrowLeft aria-hidden="true" size={24} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold tracking-wide">{order.number}</h1>
          <p className="truncate text-xs text-muted">
            {takenBy ? t('order.takenBy', { date: taken, name: takenBy }) : t('order.takenOn', { date: taken })}
          </p>
        </div>
        {can('links.manage') && <IconButton label={t('order.share')} icon={Share2} onClick={() => setSharing(true)} />}
        <ActionSheet label={t('order.more')} icon={EllipsisVertical} title={t('nav.more')}>
          {() => (
            <>
              {can('money.view') && <ActionSheetItem to={`/print/receipt/${order.id}`}>{t('order.printReceipt')}</ActionSheetItem>}
              <ActionSheetItem to={`/print/job/${order.id}`}>{t('order.jobSlip')}</ActionSheetItem>
              <ActionSheetItem to={`/print/tags/${order.id}`}>{t('order.tags')}</ActionSheetItem>
              {can('orders.create') && (
                <ActionSheetItem to={`/app/orders/new?repeat=${order.id}`} data-tour="order-again">
                  {t('order.orderAgain')}
                </ActionSheetItem>
              )}
            </>
          )}
        </ActionSheet>
      </header>

      {customer && (
        <section aria-label={t('order.customer')} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
          <Avatar id={customer.id} name={customer.name} />
          <Link to={`/app/customers/${customer.id}`} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
            <span className="truncate font-semibold">{customer.name}</span>
            {customer.phone && <span className="truncate text-sm text-muted">{customer.phone}</span>}
          </Link>
          {customer.phone && (
            <>
              <a href={`tel:${customer.phone}`} aria-label={t('order.call')} className={`${ROUND} bg-ok-soft text-ok`}>
                <Phone aria-hidden="true" size={20} />
              </a>
              <a href={`sms:${customer.phone}`} aria-label={t('order.message')} className={`${ROUND} bg-brand-soft text-brand-strong`}>
                <MessageCircle aria-hidden="true" size={20} />
              </a>
            </>
          )}
        </section>
      )}

      {can('money.view') && <MoneyCard order={order} open={money.open} />}

      <p className="flex flex-wrap items-center gap-x-2 text-sm">
        <span data-tour="order-status" className="font-semibold">
          {isOrderClosed(order) ? t('order.statusClosed') : t('order.statusOpen')}
        </span>
        <span className="text-muted">{progressText(orderProgress(order), language)}</span>
      </p>

      {groups.length === 0 && order.items.map((item) => <MobileItemCard key={item.id} order={order} item={item} />)}
      {groups.map((group) => {
        const name = group.wearer ?? t('wearers.others');
        return (
          <section key={group.wearer ?? ''} aria-label={name} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold">{name}</h2>
              <p className="text-sm text-muted">{progressText(group.progress, language)}</p>
            </div>
            {group.items.map((item) => (
              <MobileItemCard key={item.id} order={order} item={item} />
            ))}
          </section>
        );
      })}

      {hasBar && (
      <BottomBar>
        {can('money.view') && (
          <Link
            to={`/print/receipt/${order.id}`}
            aria-label={t('order.printReceipt')}
            className="flex size-[54px] shrink-0 items-center justify-center rounded-2xl border border-line bg-panel text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Printer aria-hidden="true" size={22} />
          </Link>
        )}
        {ready.length > 0 && (
          <Button
            variant={showTake ? 'secondary' : 'primary'}
            className={`${BAR_BUTTON} flex-1`}
            onClick={startHandOver}
          >
            {t('order.handOverBar')}
          </Button>
        )}
        {showTake && (
          <Button className={`${BAR_BUTTON} flex-[1.4]`} onClick={() => money.open({ kind: 'take' })}>
            <Banknote aria-hidden="true" size={20} />
            {t('payments.take')}
          </Button>
        )}
      </BottomBar>
      )}

      {money.element}
      {sharing && (
        <Dialog
          open
          title={t('link.section')}
          onClose={() => setSharing(false)}
          actions={
            <Button variant="secondary" onClick={() => setSharing(false)}>
              {t('common.close')}
            </Button>
          }
        >
          <div className="text-ink">
            <StatusLinkSection order={order} />
          </div>
        </Dialog>
      )}
      {picking && (
        <Dialog
          open
          title={t('order.handOverPick')}
          onClose={() => setPicking(false)}
          actions={
            <Button variant="secondary" onClick={() => setPicking(false)}>
              {t('common.cancel')}
            </Button>
          }
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {ready.map((item) => (
              <li key={item.id}>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full justify-start"
                  onClick={() => {
                    setPicking(false);
                    setHandingId(item.id);
                  }}
                >
                  {itemTitle(order, item, language)}
                </Button>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
      {handing && <HandOverDialog order={order} item={handing} onClose={() => setHandingId(null)} />}
    </div>
  );
}
