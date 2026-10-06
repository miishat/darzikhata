import { balanceDue, effectSign, moneySummary, netPaid, orderTotal, type Order, type Payment } from '@darzikhata/domain';
import { HandCoins, Pencil, Percent, Phone, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { PaidBar } from '../../ui/PaidBar';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan } from '../common/hooks';
import { receiptModel, type ReceiptModel } from '../print/receipt';
import { CorrectionDialog, DiscountDialog, PriceAdjustmentDialog, RefundDialog, TakePaymentDialog } from './paymentDialogs';

type ActionKind = 'take' | 'refund' | 'discount' | 'adjust';
type MoneyDialog = { kind: ActionKind; order: Order } | { kind: 'correct'; order: Order; payment: Payment } | null;
type Open = (dialog: MoneyDialog) => void;

interface Entry {
  order: Order;
  payment: Payment;
  /** What the record did to the money held: negative for refunds. */
  effect: number;
  by: string;
}

/** The picked order's customer: all their orders (owing first), each one's money, and every payment they made. */
function useCustomerMoney(orderId: string) {
  const { language } = useI18n();
  const { config } = useSnapshot();
  const state = useScopedState();
  const picked = state.orders[orderId]!;
  const customer = state.customers[picked.customerId] ?? null;
  const orders = Object.values(state.orders)
    .filter((o) => o.customerId === picked.customerId)
    .sort((a, b) => balanceDue(b) - balanceDue(a) || b.createdAt.localeCompare(a.createdAt));
  const staffName = (id: string) => config?.staff.find((s) => s.id === id)?.name ?? '';
  const model = config ? receiptModel(picked, customer, config, language) : null;
  const entries: Entry[] = orders
    .flatMap((order) => order.payments.map((payment) => ({ order, payment, effect: effectSign(payment, order.payments) * payment.amount, by: staffName(payment.by) })))
    .sort((a, b) => b.payment.at.localeCompare(a.payment.at));
  return {
    picked,
    customer,
    orders,
    model,
    entries,
    owed: orders.reduce((sum, o) => sum + Math.max(0, balanceDue(o)), 0),
    credit: orders.reduce((sum, o) => sum + Math.max(0, -balanceDue(o)), 0),
    paid: orders.reduce((sum, o) => sum + netPaid(o.payments), 0),
    billed: orders.reduce((sum, o) => sum + orderTotal(o), 0),
  };
}

/** The money actions this person may take on an order. */
function useActions(order: Order) {
  const { t } = useI18n();
  const can = useCan();
  const m = moneySummary(order);
  return [
    { kind: 'take' as const, icon: HandCoins, label: t('payments.take'), show: can('payments.record') && m.balance > 0 },
    { kind: 'refund' as const, icon: Undo2, label: t('payments.refund'), show: can('payments.refund') && netPaid(order.payments) > 0 },
    { kind: 'discount' as const, icon: Percent, label: t('payments.discount'), show: can('orders.edit') },
    { kind: 'adjust' as const, icon: SlidersHorizontal, label: t('payments.adjust'), show: can('orders.edit') },
  ].filter((a) => a.show);
}

function DialogHost({ dialog, onClose }: { dialog: MoneyDialog; onClose(): void }) {
  if (!dialog) return null;
  switch (dialog.kind) {
    case 'take':
      return <TakePaymentDialog order={dialog.order} onClose={onClose} />;
    case 'refund':
      return <RefundDialog order={dialog.order} onClose={onClose} />;
    case 'discount':
      return <DiscountDialog order={dialog.order} onClose={onClose} />;
    case 'adjust':
      return <PriceAdjustmentDialog order={dialog.order} onClose={onClose} />;
    case 'correct':
      return <CorrectionDialog order={dialog.order} payment={dialog.payment} onClose={onClose} />;
  }
}

/** One line of money: a label, an optional note, and the amount on the right. */
function MoneyLine({ label, note, amount, strong = false, tone }: { label: string; note?: string; amount: string; strong?: boolean; tone?: 'warn' | 'ok' }) {
  return (
    <div className={`flex items-baseline gap-3 py-1 ${strong ? 'font-semibold' : ''}`}>
      <dt className="min-w-0 flex-1">
        {label}
        {note && <span className="ms-2 text-xs font-normal text-muted">{note}</span>}
      </dt>
      <dd className={`m-0 whitespace-nowrap ${strong ? 'font-display text-lg' : ''} ${tone === 'warn' ? 'text-warn' : tone === 'ok' ? 'text-ok' : ''}`}>{amount}</dd>
    </div>
  );
}

function Breakdown({ model }: { model: ReceiptModel }) {
  const { t, money } = useI18n();
  return (
    <dl aria-label={t('payments.section')} className="m-0 flex flex-col text-sm">
      <MoneyLine label={t('money.subtotal')} amount={money(model.subtotal)} />
      {model.discount && <MoneyLine label={t('money.discount')} note={model.discount.reason} amount={`− ${money(model.discount.amount)}`} />}
      {model.adjustments.map((a, i) => (
        <MoneyLine key={i} label={t('money.adjustments')} note={a.reason} amount={`${a.amount < 0 ? '−' : '+'} ${money(Math.abs(a.amount))}`} />
      ))}
      <div className="my-1 border-t border-line" />
      <MoneyLine label={t('money.total')} amount={money(model.total)} strong />
      <MoneyLine label={t('money.paid')} amount={money(model.paid)} tone="ok" />
      {model.creditDue > 0 ? (
        <MoneyLine label={t('money.creditDue')} amount={money(model.creditDue)} strong tone="ok" />
      ) : (
        <MoneyLine label={t('money.balance')} amount={money(model.balance)} strong tone="warn" />
      )}
    </dl>
  );
}

/** A payment or refund with its date, method, who took it, and a correct button where allowed. */
function EntryLine({ entry, showOrder, open }: { entry: Entry; showOrder: boolean; open: Open }) {
  const { t, money, date } = useI18n();
  const can = useCan();
  const { payment, effect } = entry;
  return (
    <li className="flex items-center gap-3 py-2">
      <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full ${effect < 0 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}`}>
        {effect < 0 ? <Undo2 size={15} /> : <HandCoins size={15} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold">
          {t(`receipt.kind.${payment.kind}`)} · {t(`method.${payment.method}`)}
          {payment.reference && <span className="font-normal text-muted"> · {payment.reference}</span>}
        </span>
        <span className="truncate text-xs text-muted">
          {date(payment.at.slice(0, 10))}
          {showOrder && ` · ${entry.order.number}`}
          {entry.by && ` · ${entry.by}`}
          {payment.reason && ` · ${payment.reason}`}
        </span>
      </span>
      <span className={`whitespace-nowrap font-display font-bold ${effect < 0 ? 'text-warn' : 'text-ok'}`}>{money(effect)}</span>
      {can('payments.correct') && payment.kind !== 'correction' ? (
        <button
          type="button"
          aria-label={`${t('payments.correct')}: ${money(effect)}, ${date(payment.at.slice(0, 10))}`}
          title={t('payments.correct')}
          onClick={() => open({ kind: 'correct', order: entry.order, payment })}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Pencil aria-hidden="true" size={15} />
        </button>
      ) : (
        <span className="size-8 shrink-0" />
      )}
    </li>
  );
}

function EntryList({ title, entries, showOrder, open }: { title: string; entries: Entry[]; showOrder: boolean; open: Open }) {
  const { t } = useI18n();
  return (
    <section aria-label={title} className="flex flex-col">
      <h4 className="text-xs font-semibold text-muted">{title}</h4>
      {entries.length === 0 ? (
        <p className="py-2 text-sm text-muted">{t('payments.nothingYet')}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {entries.map((e) => (
            <EntryLine key={e.payment.id} entry={e} showOrder={showOrder} open={open} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** The picked order's balance with Take payment, and its other actions in one row below. */
function ActionBar({ order, open }: { order: Order; open: Open }) {
  const { t, money } = useI18n();
  const actions = useActions(order);
  const take = actions.find((a) => a.kind === 'take');
  const rest = actions.filter((a) => a.kind !== 'take');
  const m = moneySummary(order);
  const credit = m.creditDue > 0;
  return (
    <div className="flex flex-col gap-2 border-t border-line bg-surface/60 p-3">
      <div className="flex items-center gap-3">
        <p className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted">{order.number}</span>
          <span className={`font-display text-lg font-bold leading-tight ${credit ? 'text-ok' : 'text-warn'}`}>
            {credit ? t('money.creditDue') : t('money.balance')} {money(credit ? m.creditDue : m.balance)}
          </span>
        </p>
        {take && (
          <Button onClick={() => open({ kind: 'take', order })} className="min-w-40">
            {take.label}
          </Button>
        )}
      </div>
      {rest.length > 0 && (
        <div className="flex gap-2">
          {rest.map((a) => (
            <button
              key={a.kind}
              type="button"
              onClick={() => open({ kind: a.kind, order })}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-panel px-2 text-sm font-semibold ring-1 ring-inset ring-line hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
            >
              <a.icon aria-hidden="true" size={15} className="text-muted" />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  orderId: string;
  onPick(orderId: string): void;
  onClose(): void;
}

/**
 * The customer behind the picked order: what they owe across all their orders, the orders themselves (the picked one
 * marked with a check), the picked order's garments, price breakdown and payments, and its money actions at the bottom.
 */
export function CustomerMoneyCard({ orderId, onPick, onClose }: Props) {
  const { t, money, number, date } = useI18n();
  const [dialog, setDialog] = useState<MoneyDialog>(null);
  const c = useCustomerMoney(orderId);
  const customerId = c.picked.customerId;
  const name = c.customer?.name ?? '';
  const mine = c.entries.filter((e) => e.order.id === orderId);
  const others = c.entries.filter((e) => e.order.id !== orderId);
  const balanceText = (o: Order) => {
    const m = moneySummary(o);
    return m.balance > 0 ? money(m.balance) : m.creditDue > 0 ? money(m.creditDue) : t('orders.card.paid');
  };

  return (
    <aside aria-label={t('payments.customerCard', { name })} className="flex w-[min(600px,46%)] min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
      <div className="flex items-start gap-3 border-b border-line p-4">
        <Avatar id={customerId} name={name} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate font-display text-xl font-bold">{name}</h2>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
            {c.customer?.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone aria-hidden="true" size={13} />
                {c.customer.phone}
              </span>
            )}
            <Link to={`/app/customers/${customerId}`} className="font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-focus">
              {t('payments.profile')}
            </Link>
          </p>
        </div>
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-2 border-b border-line px-4 py-3">
        <div className="flex items-end gap-4">
          <p className="flex flex-col">
            <span className="text-xs text-muted">{t('payments.dueTotal')}</span>
            <span className="font-display text-3xl font-bold leading-none text-warn">{money(c.owed)}</span>
          </p>
          <div className="ms-auto flex gap-5 text-end text-sm">
            <p className="flex flex-col">
              <span className="text-xs text-muted">{t('payments.billed')}</span>
              <span className="font-semibold">{money(c.billed)}</span>
            </p>
            <p className="flex flex-col">
              <span className="text-xs text-muted">{t('payments.paidAll')}</span>
              <span className="font-semibold text-ok">{money(c.paid)}</span>
            </p>
            {c.credit > 0 && (
              <p className="flex flex-col">
                <span className="text-xs text-muted">{t('payments.credit')}</span>
                <span className="font-semibold">{money(c.credit)}</span>
              </p>
            )}
          </div>
        </div>
        <PaidBar paid={c.paid} total={c.billed} />
      </div>

      {/* relative: keeps absolutely placed screen-reader text inside this scroll area. */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4">
        {c.orders.length > 1 && (
          <section aria-label={t('nav.orders')} className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold text-muted">
              {t('nav.orders')} · {number(c.orders.length)}
            </h3>
            <ul className="m-0 flex list-none flex-col p-0">
              {c.orders.map((o) => {
                const on = o.id === orderId;
                const m = moneySummary(o);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onPick(o.id)}
                      className={`flex w-full items-center gap-3 border-s-4 py-2 pe-2 ps-3 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
                        on ? 'border-brand font-semibold' : 'border-transparent hover:bg-surface'
                      }`}
                    >
                      <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full text-xs ${on ? 'bg-brand text-on-brand' : 'ring-1 ring-line'}`}>
                        {on ? '✓' : ''}
                      </span>
                      <span className="w-20">{o.number}</span>
                      <span className="w-28 text-xs font-normal text-muted">{date(o.createdAt.slice(0, 10))}</span>
                      <span className="min-w-0 flex-1">
                        <PaidBar paid={m.paid} total={m.total} />
                      </span>
                      <span className={`w-24 text-end font-display ${m.balance > 0 ? 'text-warn' : 'text-ok'}`}>{balanceText(o)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {c.model && (
          <section aria-label={c.model.orderNumber} className={`flex flex-col gap-3 ${c.orders.length > 1 ? 'border-t border-line pt-4' : ''}`}>
            <div className="flex items-baseline gap-2">
              <h3 className="font-display text-lg font-bold">{c.model.orderNumber}</h3>
              <span className="text-sm text-muted">{date(c.model.createdAt.slice(0, 10))}</span>
              <Link to={`/app/orders/${orderId}`} className="ms-auto text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                {t('payments.openOrder')}
              </Link>
            </div>
            <ul aria-label={t('receipt.garment')} className="m-0 flex list-none flex-col gap-0.5 p-0 text-sm">
              {c.model.lines.map((line) => (
                <li key={line.itemId} className={`flex items-baseline gap-3 ${line.cancelled ? 'text-muted line-through' : ''}`}>
                  <span className="min-w-0 flex-1 truncate">
                    {line.garment}
                    {line.wearer && <span className="text-xs text-muted"> · {line.wearer}</span>}
                  </span>
                  <span className="whitespace-nowrap text-muted">{money(line.price)}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl bg-surface/60 px-3 py-2">
              <Breakdown model={c.model} />
            </div>
            {c.model.creditDue > 0 && <p className="text-sm font-semibold">{t('payments.creditNote')}</p>}
            <EntryList title={t('payments.paidOnOrder')} entries={mine} showOrder={false} open={setDialog} />
          </section>
        )}

        {others.length > 0 && <EntryList title={t('payments.paidOnOthers')} entries={others} showOrder open={setDialog} />}
      </div>

      <ActionBar order={c.picked} open={setDialog} />
      <DialogHost dialog={dialog} onClose={() => setDialog(null)} />
    </aside>
  );
}
