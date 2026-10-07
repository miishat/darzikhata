// PROTOTYPE (throwaway): desktop full order page variants behind ?variant=. A is the current page.
import { isOrderClosed, itemSummaryGroup, moneySummary, netPaid, orderProgress, type Order, type OrderItem } from '@darzikhata/domain';
import { ArrowLeft, CalendarClock, FileText, Percent, Phone, Printer, Repeat, Share2, Tag, Undo2, Wallet, X, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { useCan } from '../common/hooks';
import { progressText } from '../common/orderText';
import { StatusLinkSection } from '../links/StatusLinkSection';
import { MoneyCard, OrderMoney, useMoneyDialogs } from '../payments/OrderMoney';
import { HandOverDialog } from './itemDialogs';
import { PanelItem } from './OrderPanel';
import { nextMove } from './stageMoves';
import { wearerGroups } from './wearers';

export const FULL_VARIANTS = {
  A: 'Current page',
  B: 'Header bar with papers, garments left, customer + money column right',
  C: 'Panel stretched: summary tiles, garment grid, sticky action bar',
  D: 'Key numbers strip, then tabs: Garments / Money / Status link',
};
const KEYS = Object.keys(FULL_VARIANTS);

export function useFullVariant() {
  return useVariant(KEYS);
}

export function FullSwitcher() {
  return <PrototypeSwitcher variants={FULL_VARIANTS} />;
}

const pick = (language: string, bn: string, en: string) => (language === 'bn' ? bn : en);

/** Shared state: the order's people, money dialogs, the share dialog and handing over. */
function useFullOrder(order: Order) {
  const { t, label, date } = useI18n();
  const can = useCan();
  const { state, config } = useSnapshot();
  const money = useMoneyDialogs(order);
  const [sharing, setSharing] = useState(false);
  const [handingId, setHandingId] = useState<string | null>(null);
  const customer = state.customers[order.customerId];
  const takenBy = config?.staff.find((s) => s.id === order.createdBy)?.name;
  const branch = config && config.branches.length > 1 ? config.branches.find((b) => b.id === order.branchId) : undefined;
  const taken = date(order.createdAt.slice(0, 10));
  const byline = [takenBy ? t('order.takenBy', { date: taken, name: takenBy }) : t('order.takenOn', { date: taken }), branch ? label(branch.name) : '']
    .filter(Boolean)
    .join(' · ');
  const ready = order.items.filter((item) => can('work.updateStage') && nextMove(item)?.stage.group === 'delivered');
  const summary = moneySummary(order);
  const showTake = can('money.view') && can('payments.record') && summary.balance > 0;
  const handing = order.items.find((item) => item.id === handingId);
  const dialogs = (
    <>
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
            <StatusLinkSection order={order} inDialog />
          </div>
        </Dialog>
      )}
      {handing && <HandOverDialog order={order} item={handing} onClose={() => setHandingId(null)} />}
    </>
  );
  return { customer, byline, ready, summary, showTake, money, share: () => setSharing(true), handOver: () => ready[0] && setHandingId(ready[0].id), dialogs };
}

function StatusPill({ order }: { order: Order }) {
  const { t } = useI18n();
  const closed = isOrderClosed(order);
  return (
    <span data-tour="order-status" className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${closed ? 'bg-surface text-muted' : 'bg-brand-soft text-brand-strong'}`}>
      {closed ? t('order.statusClosed') : t('order.statusOpen')}
    </span>
  );
}

/** One bar per garment: green once ready or delivered. */
function GarmentBars({ order, dark = false }: { order: Order; dark?: boolean }) {
  const live = order.items.filter((i) => !i.cancelled);
  return (
    <div aria-hidden="true" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(live.length, 1)}, minmax(0, 1fr))` }}>
      {live.map((item) => {
        const g = itemSummaryGroup(item);
        return <span key={item.id} className={`h-1.5 rounded-full ${g === 'ready' || g === 'delivered' ? 'bg-tone-ready-dot' : dark ? 'bg-navy-raised' : 'bg-line'}`} />;
      })}
    </div>
  );
}

function CustomerCard({ order, compact = false }: { order: Order; compact?: boolean }) {
  const { t } = useI18n();
  const { state } = useSnapshot();
  const customer = state.customers[order.customerId];
  if (!customer) return null;
  return (
    <section aria-label={t('order.customer')} className={`flex items-center gap-3 rounded-xl border border-line bg-panel ${compact ? 'p-3' : 'p-4'}`}>
      <Avatar id={customer.id} name={customer.name} />
      <Link to={`/app/customers/${customer.id}`} className="flex min-w-0 flex-1 flex-col focus-visible:outline-2 focus-visible:outline-focus">
        <span className="truncate font-semibold">{customer.name}</span>
        {customer.phone && <span className="truncate text-sm text-muted">{customer.phone}</span>}
      </Link>
      {customer.phone && (
        <a href={`tel:${customer.phone}`} aria-label={t('order.call')} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
          <Phone aria-hidden="true" size={18} />
        </a>
      )}
    </section>
  );
}

/** The papers and order-again links, as icon buttons with labels. */
function PaperLinks({ order, onShare, iconsOnly = false }: { order: Order; onShare(): void; iconsOnly?: boolean }) {
  const { t } = useI18n();
  const can = useCan();
  const item = (to: string, icon: LucideIcon, text: string) => {
    const Icon = icon;
    return (
      <Link key={to} to={to} title={text} aria-label={iconsOnly ? text : undefined} className={buttonClasses('secondary')}>
        <Icon size={16} aria-hidden="true" />
        {!iconsOnly && text}
      </Link>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {can('money.view') && item(`/print/receipt/${order.id}`, Printer, t('order.printReceipt'))}
      {item(`/print/job/${order.id}`, FileText, t('order.jobSlip'))}
      {item(`/print/tags/${order.id}`, Tag, t('order.tags'))}
      {can('links.manage') && (
        <Button variant="secondary" title={t('order.share')} aria-label={iconsOnly ? t('order.share') : undefined} onClick={onShare}>
          <Share2 size={16} aria-hidden="true" />
          {!iconsOnly && t('order.share')}
        </Button>
      )}
      {can('orders.create') && (
        <Link to={`/app/orders/new?repeat=${order.id}`} data-tour="order-again" className={buttonClasses('secondary')}>
          <Repeat size={16} aria-hidden="true" />
          {t('order.orderAgain')}
        </Link>
      )}
    </div>
  );
}

/** Money buttons beside the money card: take, refund, discount, price change. */
function MoneyButtons({ order, open }: { order: Order; open: ReturnType<typeof useMoneyDialogs>['open'] }) {
  const { t } = useI18n();
  const can = useCan();
  if (!can('money.view')) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {can('payments.record') && moneySummary(order).balance > 0 && (
        <Button className="col-span-2" onClick={() => open({ kind: 'take' })}>
          <Wallet size={16} aria-hidden="true" />
          {t('payments.take')}
        </Button>
      )}
      {can('payments.refund') && netPaid(order.payments) > 0 && (
        <Button variant="secondary" className="text-xs" onClick={() => open({ kind: 'refund' })}>
          <Undo2 size={14} aria-hidden="true" />
          {t('payments.refund')}
        </Button>
      )}
      {can('orders.edit') && (
        <Button variant="secondary" className="text-xs" onClick={() => open({ kind: 'discount' })}>
          <Percent size={14} aria-hidden="true" />
          {t('payments.discount')}
        </Button>
      )}
      {can('orders.edit') && (
        <Button variant="secondary" className="text-xs" onClick={() => open({ kind: 'adjust' })}>
          <CalendarClock size={14} aria-hidden="true" />
          {t('payments.adjust')}
        </Button>
      )}
    </div>
  );
}

/** The garments, grouped under each wearer when the order has wearers, in a grid of panel blocks. */
function Garments({ order, cols }: { order: Order; cols: string }) {
  const { t, language } = useI18n();
  const groups = wearerGroups(order);
  const grid = (items: OrderItem[]) => (
    <div className={`grid items-start gap-3 ${cols}`}>
      {items.map((item) => (
        <PanelItem key={item.id} order={order} item={item} />
      ))}
    </div>
  );
  if (groups.length === 0) return grid(order.items);
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const name = group.wearer ?? t('wearers.others');
        return (
          <section key={group.wearer ?? ''} aria-label={name} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <h3 className="font-display text-lg font-bold">{name}</h3>
              <p className="text-sm text-muted">{progressText(group.progress, language)}</p>
            </div>
            {grid(group.items)}
          </section>
        );
      })}
    </div>
  );
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{children}</h3>
      {aside}
    </div>
  );
}

export function ProtoFullOrder({ variant, order, onClose }: { variant: string; order: Order; onClose(): void }) {
  if (variant === 'B') return <FullB order={order} onClose={onClose} />;
  if (variant === 'C') return <FullC order={order} onClose={onClose} />;
  return <FullD order={order} onClose={onClose} />;
}

function BackToList({ onClose }: { onClose(): void }) {
  const { t, language } = useI18n();
  return (
    <button type="button" onClick={onClose} className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
      <ArrowLeft size={16} aria-hidden="true" />
      {pick(language, 'অর্ডারের তালিকা', 'Order List')}
    </button>
  );
}

/** B: a header bar across the top, garments on the left, a sticky column with the customer, money and link on the right. */
function FullB({ order, onClose }: { order: Order; onClose(): void }) {
  const { t, language } = useI18n();
  const can = useCan();
  const f = useFullOrder(order);
  return (
    <div className="flex flex-col gap-4">
      <BackToList onClose={onClose} />
      <header className="flex flex-wrap items-start gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-wide">{order.number}</h1>
            <StatusPill order={order} />
          </div>
          <p className="mt-1 text-sm text-muted">{f.byline}</p>
          <div className="mt-3 flex max-w-md items-center gap-3">
            <div className="flex-1">
              <GarmentBars order={order} />
            </div>
            <span className="shrink-0 text-sm text-muted">{progressText(orderProgress(order), language)}</span>
          </div>
        </div>
        <PaperLinks order={order} onShare={f.share} />
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-4">
        <div className="flex flex-col gap-3">
          <SectionTitle
            aside={
              f.ready.length > 0 && (
                <Button variant="secondary" className="min-h-9!" onClick={f.handOver}>
                  {t('order.handOverBar')}
                </Button>
              )
            }
          >
            {t('receipt.garments')}
          </SectionTitle>
          <Garments order={order} cols="grid-cols-1 2xl:grid-cols-2" />
        </div>
        <aside className="sticky top-4 flex flex-col gap-3">
          <SectionTitle>{t('order.customer')}</SectionTitle>
          <CustomerCard order={order} />
          {can('money.view') && (
            <>
              <SectionTitle>{t('payments.section')}</SectionTitle>
              <MoneyCard order={order} open={f.money.open} />
              <MoneyButtons order={order} open={f.money.open} />
            </>
          )}
        </aside>
      </div>
      {f.dialogs}
    </div>
  );
}

/** C: the panel stretched out. Summary tiles across the top, garments in a grid, and the hand-over and payment bar pinned to the bottom. */
function FullC({ order, onClose }: { order: Order; onClose(): void }) {
  const { t, language, money, date } = useI18n();
  const can = useCan();
  const f = useFullOrder(order);
  const next = order.items
    .filter((i) => !i.cancelled && i.deliveryDate && (itemSummaryGroup(i) === 'unfinished' || itemSummaryGroup(i) === 'ready'))
    .map((i) => i.deliveryDate!)
    .sort()[0];
  const owed = f.summary.creditDue > 0 ? { label: t('money.creditDue'), amount: f.summary.creditDue, tone: 'text-ok' } : { label: t('money.balance'), amount: f.summary.balance, tone: f.summary.balance > 0 ? 'text-warn' : 'text-ok' };
  const tile = 'flex flex-col justify-center gap-1 rounded-2xl border border-line bg-panel p-4';
  return (
    // The window less the shell header (3.5rem) and the page padding (2 × 1.5rem).
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex items-center gap-3 border-b border-line bg-panel px-5 py-3">
        <button type="button" aria-label={t('common.close')} onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-surface">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <h1 className="font-display text-2xl font-bold tracking-wide">{order.number}</h1>
        <StatusPill order={order} />
        <span className="min-w-0 flex-1 truncate text-sm text-muted">{f.byline}</span>
        <PaperLinks order={order} onShare={f.share} iconsOnly />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <CustomerCard order={order} />
          </div>
          <div className={tile}>
            <span className="text-xs text-muted">{progressText(orderProgress(order), language)}</span>
            <GarmentBars order={order} />
            <span className="text-xs text-muted">{next ? t('item.deliveryOn', { date: date(next) }) : ''}</span>
          </div>
          {can('money.view') ? (
            <button type="button" onClick={() => f.money.open({ kind: 'history' })} className={`${tile} text-start hover:border-brand`}>
              <span className="text-xs text-muted">{owed.label}</span>
              <span className={`font-display text-2xl font-bold ${owed.tone}`}>{money(owed.amount)}</span>
              <span className="text-xs text-muted">
                {t('money.paid')} {money(f.summary.paid)} / {money(f.summary.total)}
              </span>
            </button>
          ) : (
            <span />
          )}
        </div>
        <div className="mt-5">
          <Garments order={order} cols="grid-cols-2 2xl:grid-cols-3" />
        </div>
      </div>
      {(f.ready.length > 0 || f.showTake) && (
        <div className="flex items-center justify-end gap-2 border-t border-line bg-panel px-5 py-3">
          <span className="me-auto text-sm text-muted">{pick(language, 'এই অর্ডারে যা বাকি', 'Left on this order')}</span>
          {f.ready.length > 0 && (
            <Button variant="secondary" onClick={f.handOver}>
              {t('order.handOverBar')}
            </Button>
          )}
          {f.showTake && (
            <Button onClick={() => f.money.open({ kind: 'take' })}>
              <Wallet size={16} aria-hidden="true" />
              {t('payments.take')}
            </Button>
          )}
        </div>
      )}
      {f.dialogs}
    </div>
  );
}

type Tab = 'garments' | 'money' | 'link';

/** D: a strip of key numbers under the header, then tabs so each part gets the full width. */
function FullD({ order, onClose }: { order: Order; onClose(): void }) {
  const { t, language, money, date, number } = useI18n();
  const can = useCan();
  const f = useFullOrder(order);
  const [tab, setTab] = useState<Tab>('garments');
  const progress = orderProgress(order);
  const live = order.items.filter((i) => !i.cancelled);
  const done = progress.ready + progress.delivered;
  const next = live
    .filter((i) => i.deliveryDate && (itemSummaryGroup(i) === 'unfinished' || itemSummaryGroup(i) === 'ready'))
    .map((i) => i.deliveryDate!)
    .sort()[0];
  const tabs: Array<{ key: Tab; label: string; show: boolean }> = [
    { key: 'garments', label: `${t('receipt.garments')} · ${number(live.length)}`, show: true },
    { key: 'money', label: t('payments.section'), show: can('money.view') },
    { key: 'link', label: t('link.section'), show: can('links.manage') },
  ];
  const stat = (label: string, value: ReactNode, tone = '') => (
    <div className="flex flex-col gap-0.5 px-5 py-3">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-display text-xl font-bold ${tone}`}>{value}</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <header className="flex items-center gap-4 p-5">
          <button type="button" aria-label={t('common.close')} onClick={onClose} className="flex size-10 items-center justify-center rounded-full border border-line hover:bg-surface">
            <X size={18} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-wide">{order.number}</h1>
              <StatusPill order={order} />
            </div>
            <p className="text-sm text-muted">{f.byline}</p>
          </div>
          <div className="w-72">
            <CustomerCard order={order} compact />
          </div>
        </header>
        <div className="grid grid-cols-5 divide-x divide-line border-t border-line bg-surface/50">
          {stat(pick(language, 'রেডি', 'Ready'), `${number(done)} / ${number(live.length)}`)}
          {stat(pick(language, 'পরের ডেলিভারি', 'Next Delivery'), next ? date(next) : '-')}
          {can('money.view') && stat(t('money.total'), money(f.summary.total))}
          {can('money.view') && stat(t('money.paid'), money(f.summary.paid), 'text-ok')}
          {can('money.view') &&
            stat(
              f.summary.creditDue > 0 ? t('money.creditDue') : t('money.balance'),
              money(f.summary.creditDue > 0 ? f.summary.creditDue : f.summary.balance),
              f.summary.balance > 0 ? 'text-warn' : 'text-ok',
            )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div role="tablist" className="flex rounded-xl bg-line/60 p-1">
          {tabs
            .filter((x) => x.show)
            .map((x) => (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={tab === x.key}
                onClick={() => setTab(x.key)}
                className={`min-h-9 rounded-lg px-4 text-sm ${tab === x.key ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted'}`}
              >
                {x.label}
              </button>
            ))}
        </div>
        <div className="ms-auto flex items-center gap-2">
          {f.ready.length > 0 && (
            <Button variant="secondary" onClick={f.handOver}>
              {t('order.handOverBar')}
            </Button>
          )}
          {f.showTake && (
            <Button onClick={() => f.money.open({ kind: 'take' })}>
              <Wallet size={16} aria-hidden="true" />
              {t('payments.take')}
            </Button>
          )}
          <PaperLinks order={order} onShare={() => setTab('link')} iconsOnly />
        </div>
      </div>
      <div role="tabpanel">
        {tab === 'garments' && <Garments order={order} cols="grid-cols-2 2xl:grid-cols-3" />}
        {tab === 'money' && <OrderMoney order={order} />}
        {tab === 'link' && (
          <div className="max-w-2xl">
            <StatusLinkSection order={order} />
          </div>
        )}
      </div>
      {f.dialogs}
    </div>
  );
}
