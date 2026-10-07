// PROTOTYPE (throwaway): desktop full order page variants behind ?variant=. A is the current page.
import { isOrderClosed, itemSummaryGroup, moneySummary, orderProgress, type Order, type OrderItem } from '@darzikhata/domain';
import { ArrowLeft, ChevronDown, FileText, Phone, Printer, Repeat, Share2, Shirt, Tag, Wallet, X, type LucideIcon } from 'lucide-react';
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
import { OrderMoney, useMoneyDialogs } from '../payments/OrderMoney';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { StageStrip } from '../../ui/StageStrip';
import { stageTone } from '../../ui/stageTone';
import { itemTitle } from '../common/orderText';
import { MoveOn } from './ItemCard';
import { HandOverDialog } from './itemDialogs';
import { PanelItem } from './OrderPanel';
import { nextMove } from './stageMoves';
import { wearerGroups } from './wearers';

export const FULL_VARIANTS = {
  A: 'Current page',
  C: 'Panel stretched: summary tiles, garment grid, sticky action bar',
  D: 'Key numbers strip, then tabs: Garments / Money / Status link',
  E: 'C with a wearer list down the side, money in the action bar',
  F: 'C with garments as compact rows that open in place',
  G: 'D on a navy header band',
  H: 'D with tabs down the left, wearers under Garments',
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

/** The garments, grouped under each wearer when the order has wearers, in a grid of panel blocks. */
function Garments({ order, cols, only = null, rows = false }: { order: Order; cols: string; only?: number | null; rows?: boolean }) {
  const { t, language } = useI18n();
  const groups = wearerGroups(order);
  if (rows) {
    const list = (items: OrderItem[]) => (
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        {items.map((item) => (
          <CompactRow key={item.id} order={order} item={item} />
        ))}
      </div>
    );
    if (groups.length === 0) return list(order.items);
    return (
      <div className="flex flex-col gap-5">
        {groups.map((group, index) => (
          <section key={group.wearer ?? ''} id={`wearer-${index}`} aria-label={group.wearer ?? t('wearers.others')} className="flex scroll-mt-4 flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <h3 className="font-display text-lg font-bold">{group.wearer ?? t('wearers.others')}</h3>
              <p className="text-sm text-muted">{progressText(group.progress, language)}</p>
            </div>
            {list(group.items)}
          </section>
        ))}
      </div>
    );
  }
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
      {groups.map((group, index) => {
        const name = group.wearer ?? t('wearers.others');
        if (only !== null && only !== index) return null;
        return (
          <section key={group.wearer ?? ''} id={`wearer-${index}`} aria-label={name} className="flex scroll-mt-4 flex-col gap-2">
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

export function ProtoFullOrder({ variant, order, onClose }: { variant: string; order: Order; onClose(): void }) {
  if (variant === 'C' || variant === 'E' || variant === 'F') return <FullC order={order} onClose={onClose} take={variant} />;
  return <FullD order={order} onClose={onClose} take={variant} />;
}

/** F: one garment per row with its stage, delivery, worker and next move; clicking the row opens the full block in place. */
function CompactRow({ order, item }: { order: Order; item: OrderItem }) {
  const { t, language, label, date } = useI18n();
  const can = useCan();
  const { config } = useSnapshot();
  const [open, setOpen] = useState(false);
  const title = itemTitle(order, item, language);
  const stageIndex = item.stages.findIndex((s) => s.key === item.stageKey);
  const stage = item.stages[stageIndex];
  const group = itemSummaryGroup(item);
  const worker = item.assignedTo ? config?.staff.find((s) => s.id === item.assignedTo) : undefined;
  const next = nextMove(item);
  const canMove = can('work.updateStage') && next !== null && !item.cancelled && next.stage.group !== 'delivered';
  return (
    <div className="border-b border-line last:border-b-0">
      <div className="grid grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto_auto] items-center gap-4 px-4 py-2.5">
        <div className="min-w-0">
          <p className={`truncate font-semibold ${item.cancelled ? 'line-through' : ''}`}>{title}</p>
          {item.wearer && <p className="truncate text-xs text-muted">{item.wearer}</p>}
        </div>
        <StagePill label={stage ? label(stage.label) : item.stageKey} tone={stageTone(stage, group, Math.max(stageIndex, 0))} />
        <div className="min-w-0">{!item.cancelled && stageIndex >= 0 && <StageStrip total={item.stages.length} current={stageIndex + 1} stage={stage ? label(stage.label) : item.stageKey} />}</div>
        <div className="flex min-w-0 flex-col text-sm">
          {item.deliveryDate && <span className="text-muted">{date(item.deliveryDate)}</span>}
          {item.deliveryDate && (group === 'unfinished' || group === 'ready') && <DueLabel date={item.deliveryDate} />}
        </div>
        <span className="truncate text-sm">{worker?.name ?? ''}</span>
        <div>
          {canMove && next && (
            <MoveOn
              order={order}
              item={item}
              stageKey={next.stage.key}
              label={t('item.moveTo', { stage: label(next.stage.label) })}
              render={(props) => (
                <button type="button" disabled={props.disabled} onClick={props.onClick} className={`${buttonClasses('secondary')} min-h-9! border-brand text-brand-strong`}>
                  {props.children}
                </button>
              )}
            />
          )}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={t('item.details')}
          onClick={() => setOpen(!open)}
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface"
        >
          <ChevronDown size={18} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="bg-surface px-4 pb-4 pt-1">
          <PanelItem order={order} item={item} />
        </div>
      )}
    </div>
  );
}

/** E: the wearers down the side, each a jump to its garments with its progress. */
function WearerList({ order, active, onPick }: { order: Order; active?: number | null; onPick(index: number | null): void }) {
  const { t, language, number } = useI18n();
  const groups = wearerGroups(order);
  const live = order.items.filter((i) => !i.cancelled).length;
  const row = (key: string, name: string, sub: string, on: boolean, pickIt: () => void) => (
    <button
      key={key}
      type="button"
      onClick={pickIt}
      aria-current={on ? 'true' : undefined}
      className={`flex w-full flex-col rounded-xl px-3 py-2 text-start ${on ? 'bg-brand-soft text-brand-strong' : 'hover:bg-surface'}`}
    >
      <span className="truncate text-sm font-semibold">{name}</span>
      <span className="truncate text-xs text-muted">{sub}</span>
    </button>
  );
  return (
    <nav aria-label={t('wearers.summary')} className="flex flex-col gap-1">
      {row('all', pick(language, 'সব পোশাক', 'All Garments'), `${number(live)}`, active === null, () => onPick(null))}
      {groups.map((group, index) => row(String(index), group.wearer ?? t('wearers.others'), progressText(group.progress, language), active === index, () => onPick(index)))}
    </nav>
  );
}

/** C: the panel stretched out. Summary tiles across the top, garments in a grid, and the hand-over and payment bar pinned to the bottom. */
function FullC({ order, onClose, take }: { order: Order; onClose(): void; take: string }) {
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
        {take === 'E' && wearerGroups(order).length > 0 ? (
          <div className="mt-5 grid grid-cols-[220px_minmax(0,1fr)] items-start gap-4">
            <div className="sticky top-0 rounded-2xl border border-line bg-panel p-2">
              <WearerList
                order={order}
                active={null}
                onPick={(index) => document.getElementById(index === null ? 'garments-top' : `wearer-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
            </div>
            <div id="garments-top" className="scroll-mt-4">
              <Garments order={order} cols="grid-cols-2" />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <Garments order={order} cols="grid-cols-2 2xl:grid-cols-3" rows={take === 'F'} />
          </div>
        )}
      </div>
      {(f.ready.length > 0 || f.showTake) && (
        <div className="flex items-center justify-end gap-2 border-t border-line bg-panel px-5 py-3">
          {take === 'C' ? (
            <span className="me-auto text-sm text-muted">{pick(language, 'এই অর্ডারে যা বাকি', 'Left on this order')}</span>
          ) : (
            <span className="me-auto flex items-baseline gap-4 text-sm">
              {can('money.view') && (
                <>
                  <span className="text-muted">
                    {t('money.paid')} <b className="text-ok">{money(f.summary.paid)}</b>
                  </span>
                  <span className="text-muted">
                    {owed.label} <b className={`font-display text-lg ${owed.tone}`}>{money(owed.amount)}</b>
                  </span>
                </>
              )}
              <span className="text-muted">
                <Shirt size={14} aria-hidden="true" className="me-1 inline" />
                {progressText(orderProgress(order), language)}
              </span>
            </span>
          )}
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
function FullD({ order, onClose, take }: { order: Order; onClose(): void; take: string }) {
  const { t, language, money, date, number } = useI18n();
  const can = useCan();
  const f = useFullOrder(order);
  const [tab, setTab] = useState<Tab>('garments');
  const [only, setOnly] = useState<number | null>(null);
  const navy = take === 'G';
  const side = take === 'H';
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
      <span className={`text-xs ${navy ? 'text-on-navy-muted' : 'text-muted'}`}>{label}</span>
      <span className={`font-display text-xl font-bold ${navy ? '' : tone}`}>{value}</span>
    </div>
  );
  const groups = wearerGroups(order);
  return (
    <div className="flex flex-col gap-4">
      <div className={`overflow-hidden rounded-2xl ${navy ? 'bg-navy text-on-navy' : 'border border-line bg-panel'}`}>
        <header className="flex items-center gap-4 p-5">
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
            className={`flex size-10 items-center justify-center rounded-full ${navy ? 'ring-1 ring-white/30 hover:bg-white/15' : 'border border-line hover:bg-surface'}`}
          >
            <X size={18} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-wide">{order.number}</h1>
              <StatusPill order={order} />
            </div>
            <p className={`text-sm ${navy ? 'text-on-navy-muted' : 'text-muted'}`}>{f.byline}</p>
          </div>
          <div className="w-72 text-ink">
            <CustomerCard order={order} compact />
          </div>
        </header>
        {navy && (
          <div className="px-5">
            <GarmentBars order={order} dark />
          </div>
        )}
        <div className={`grid grid-cols-5 divide-x ${navy ? 'mt-2 divide-white/15 border-t border-white/15' : 'divide-line border-t border-line bg-surface/50'}`}>
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
      {side ? (
        <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4">
          <div className="sticky top-4 flex flex-col gap-3">
            <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-1 rounded-2xl border border-line bg-panel p-2">
              {tabs
                .filter((x) => x.show)
                .map((x) => (
                  <div key={x.key}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === x.key}
                      onClick={() => {
                        setTab(x.key);
                        setOnly(null);
                      }}
                      className={`w-full rounded-xl px-3 py-2.5 text-start text-sm ${tab === x.key && only === null ? 'bg-brand-soft font-semibold text-brand-strong' : 'hover:bg-surface'}`}
                    >
                      {x.label}
                    </button>
                    {x.key === 'garments' && tab === 'garments' && groups.length > 0 && (
                      <div className="ms-3 mt-1 border-s border-line ps-2">
                        <WearerList order={order} active={only} onPick={(index) => setOnly(index)} />
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <div className="flex flex-col gap-2">
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
            {tab === 'garments' && <Garments order={order} cols="grid-cols-2" only={only} />}
            {tab === 'money' && <OrderMoney order={order} />}
            {tab === 'link' && (
              <div className="max-w-2xl">
                <StatusLinkSection order={order} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
      {f.dialogs}
    </div>
  );
}
