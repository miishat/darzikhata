// PROTOTYPE (throwaway): desktop money dialog layouts behind ?variant=. Lives on prototype/money-dialogs-desktop only.
import {
  adjustmentsTotal,
  correctedAmount,
  effectSign,
  netPaid,
  orderTotal,
  parseTaka,
  subtotal,
  toScript,
  type Order,
  type Payment,
  type PaymentMethod,
} from '@darzikhata/domain';
import { ArrowRight, Banknote, Landmark, Smartphone, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { NumberField } from '../../ui/NumberField';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { TextAreaField } from '../../ui/TextAreaField';
import { TextField } from '../../ui/TextField';
import { useCan } from '../common/hooks';
import { useSave } from '../orders/itemDialogs';
import { receiptModel } from '../print/receipt';

export type MoneyKind = 'take' | 'refund' | 'discount' | 'adjust' | 'correct';

const VARIANTS = {
  A: 'Current small dialogs',
  B: 'Form + before → after',
  C: 'Big amount, quick picks, method tiles',
  D: 'One money window with tabs + history',
  E: 'Side drawer with the ledger',
};
const KEYS = Object.keys(VARIANTS);

const METHODS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank'];
const METHOD_ICON = { cash: Banknote, bkash: Smartphone, nagad: Smartphone, bank: Landmark };

interface ProtoProps {
  kind: MoneyKind;
  order: Order;
  payment?: Payment;
  onClose(): void;
  current: ReactNode;
}

/** Chooses the dialog layout from ?variant= on a desktop. Phones and variant A keep the current dialog. */
export function MoneyPrototype({ kind, order, payment, onClose, current }: ProtoProps) {
  const shell = useShell();
  const variant = useVariant(KEYS);
  if (shell.kind !== 'desktop') return <>{current}</>;
  const props = { kind, order, payment, onClose };
  return (
    <>
      {variant === 'A' && current}
      {variant === 'B' && <VariantB {...props} />}
      {variant === 'C' && <VariantC {...props} />}
      {variant === 'D' && <VariantD {...props} />}
      {variant === 'E' && <VariantE {...props} />}
      {createPortal(<PrototypeSwitcher variants={VARIANTS} />, document.body)}
    </>
  );
}

interface FormProps {
  kind: MoneyKind;
  order: Order;
  payment?: Payment | undefined;
  onClose(): void;
}

/** All the state of one money action, with its checks, its save and what the order looks like after it. */
function useMoney({ kind, order, payment, onClose }: FormProps) {
  const { t } = useI18n();
  const store = useStore();
  const { problem, working, save } = useSave(onClose);
  const [id] = useState(() => store.createId());
  const opened = useRef(order);
  const total = orderTotal(order);
  const paid = netPaid(order.payments);
  const balance = Math.max(0, total - paid);
  const credit = Math.max(0, paid - total);
  const current = kind === 'correct' && payment ? correctedAmount(order.payments, payment.id) : 0;
  const initial =
    kind === 'take' ? (balance > 0 ? balance : null) : kind === 'refund' ? (credit > 0 ? credit : null) : kind === 'discount' ? (order.discount?.amount ?? null) : null;
  const [amount, setAmountRaw] = useState<number | null>(initial);
  const [amountKey, setAmountKey] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState(kind === 'discount' ? (order.discount?.reason ?? '') : '');
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const [tried, setTried] = useState(false);

  const needsReason = kind === 'refund' || kind === 'adjust' || kind === 'correct';
  const amountProblem = (): string | undefined => {
    if (amount === null) return t('payments.error.amount');
    if ((kind === 'take' || kind === 'refund' || kind === 'adjust') && amount <= 0) return t('payments.error.amount');
    if (kind === 'refund' && amount > paid) return t('payments.error.refundTooMuch');
    if (kind === 'correct' && amount === current) return t('payments.error.noChange');
    return undefined;
  };
  const reasonProblem = needsReason && !reason.trim() ? t('item.reasonRequired') : undefined;

  const a = amount ?? 0;
  const sign = kind === 'correct' && payment ? effectSign(payment, order.payments) : 1;
  const after = {
    total:
      kind === 'discount'
        ? Math.max(0, subtotal(order) - a + adjustmentsTotal(order))
        : kind === 'adjust'
          ? Math.max(0, total + (dir === 'up' ? a : -a))
          : total,
    paid: kind === 'take' ? paid + a : kind === 'refund' ? paid - a : kind === 'correct' ? paid + sign * (a - current) : paid,
  };

  const submit = () => {
    setTried(true);
    if (amountProblem() || reasonProblem || amount === null) return;
    const text = reason.trim();
    if (kind === 'take')
      void save({
        type: 'payment.recorded',
        orderId: order.id,
        payment: { id, amount, method, reference: reference.trim(), kind: order.payments.length === 0 ? 'advance' : 'payment', corrects: null, reason: '' },
      });
    if (kind === 'refund')
      void save({ type: 'payment.recorded', orderId: order.id, payment: { id, amount, method, reference: '', kind: 'refund', corrects: null, reason: text } });
    if (kind === 'discount')
      void save({ type: 'order.discountSet', orderId: order.id, baseVersion: opened.current.version, discount: amount === 0 ? null : { amount, reason: text } });
    if (kind === 'adjust')
      void save({ type: 'order.priceAdjusted', orderId: order.id, adjustment: { id, amount: dir === 'up' ? amount : -amount, reason: text } });
    if (kind === 'correct' && payment)
      void save({
        type: 'payment.recorded',
        orderId: order.id,
        payment: { id, amount: amount - current, method: payment.method, reference: '', kind: 'correction', corrects: payment.id, reason: text },
      });
  };

  return {
    kind,
    order,
    payment,
    onClose,
    problem,
    working,
    submit,
    amount,
    amountKey,
    initial,
    setAmount: setAmountRaw,
    /** Sets the amount from outside the field, so the field is redrawn with it. */
    pick(value: number) {
      setAmountRaw(value);
      setAmountKey((k) => k + 1);
    },
    method,
    setMethod,
    reference,
    setReference,
    reason,
    setReason,
    dir,
    setDir,
    amountError: tried ? amountProblem() : undefined,
    reasonError: tried ? reasonProblem : undefined,
    current,
    before: { total, paid },
    after,
    balance,
    credit,
  };
}
type Money = ReturnType<typeof useMoney>;

function useLabels() {
  const { t } = useI18n();
  return {
    title: (kind: MoneyKind) =>
      ({ take: t('payments.takeTitle'), refund: t('payments.refundTitle'), discount: t('payments.discount'), adjust: t('payments.adjust'), correct: t('payments.correct') })[
        kind
      ],
    tab: (kind: MoneyKind) =>
      ({ take: t('payments.take'), refund: t('payments.refund'), discount: t('payments.discount'), adjust: t('payments.adjust'), correct: t('payments.correct') })[kind],
    save: (kind: MoneyKind) => (kind === 'take' ? t('payments.record') : kind === 'refund' ? t('payments.doRefund') : t('common.save')),
  };
}

function useOrderInfo(order: Order) {
  const { language } = useI18n();
  const { state, config } = useSnapshot();
  const customer = state.customers[order.customerId] ?? null;
  const model = config ? receiptModel(order, customer, config, language) : null;
  return { customer, model };
}

/** A plain modal frame: backdrop, Escape, focus on the first field. */
function Frame({ label, onClose, className, children, side = false }: { label: string; onClose(): void; className: string; children: ReactNode; side?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('input:not([type=radio]),textarea')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex bg-scrim ${side ? 'justify-end' : 'items-center justify-center p-4'}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panel} role="dialog" aria-modal="true" aria-label={label} className={`bg-panel-raised text-ink shadow-xl ${className}`}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function CloseButton({ onClose }: { onClose(): void }) {
  const { t } = useI18n();
  return (
    <button type="button" aria-label={t('common.close')} onClick={onClose} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface">
      <X className="size-5" aria-hidden="true" />
    </button>
  );
}

/** Order number, customer avatar and name. */
function WhoLine({ order }: { order: Order }) {
  const { t } = useI18n();
  const { customer, model } = useOrderInfo(order);
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {customer && <Avatar id={customer.id} name={customer.name} size="sm" />}
      <span className="font-semibold">{customer?.name}</span>
      <span className="text-muted">· {t('receipt.orderNumber', { number: model?.orderNumber ?? '' })}</span>
    </div>
  );
}

/** The standard fields for the action, as today. */
function Fields({ m, hideAmount = false, methodTiles = false }: { m: Money; hideAmount?: boolean; methodTiles?: boolean }) {
  const { t, money } = useI18n();
  const methods = METHODS.map((value) => ({ value, label: t(`method.${value}`) }));
  return (
    <div className="flex flex-col gap-4">
      {m.kind === 'correct' && <p className="font-semibold">{t('payments.nowRecorded', { amount: money(m.current) })}</p>}
      {m.kind === 'adjust' && !hideAmount && (
        <ChoiceGroup
          legend={t('payments.adjustKind')}
          value={m.dir}
          options={[
            { value: 'up', label: t('payments.adjustUp') },
            { value: 'down', label: t('payments.adjustDown') },
          ]}
          onChange={m.setDir}
        />
      )}
      {!hideAmount && (
        <NumberField
          key={m.amountKey}
          label={m.kind === 'discount' ? t('entry.discount') : m.kind === 'correct' ? t('payments.correctAmount') : t('payments.amount')}
          kind="money"
          initialValue={m.amount}
          onValueChange={m.setAmount}
          error={m.amountError}
        />
      )}
      {(m.kind === 'take' || m.kind === 'refund') &&
        (methodTiles ? <MethodTiles m={m} /> : <ChoiceGroup legend={t('payment.method')} value={m.method} options={methods} onChange={m.setMethod} />)}
      {m.kind === 'take' && (!methodTiles || m.method !== 'cash') && (
        <TextField label={t('payment.reference')} value={m.reference} onChange={(e) => m.setReference(e.target.value)} autoComplete="off" />
      )}
      {m.kind === 'discount' && <TextField label={t('entry.discountReason')} value={m.reason} onChange={(e) => m.setReason(e.target.value)} autoComplete="off" />}
      {(m.kind === 'refund' || m.kind === 'adjust' || m.kind === 'correct') && (
        <TextAreaField
          label={m.kind === 'refund' ? t('payments.refundReason') : m.kind === 'correct' ? t('payments.correctReason') : t('payments.reason')}
          value={m.reason}
          onChange={(e) => m.setReason(e.target.value)}
          error={m.reasonError}
        />
      )}
    </div>
  );
}

function MethodTiles({ m }: { m: Money }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{t('payment.method')}</legend>
      <div className="grid grid-cols-4 gap-2">
        {METHODS.map((value) => {
          const Icon = METHOD_ICON[value];
          const on = m.method === value;
          return (
            <label
              key={value}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                on ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-panel hover:bg-surface'
              }`}
            >
              <input type="radio" className="sr-only" checked={on} onChange={() => m.setMethod(value)} />
              <Icon className="size-6" aria-hidden="true" />
              {t(`method.${value}`)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Problem({ m }: { m: Money }) {
  return m.problem ? (
    <p role="alert" className="text-danger">
      {m.problem}
    </p>
  ) : null;
}

function Actions({ m, label, wide = false }: { m: Money; label?: string; wide?: boolean }) {
  const { t } = useI18n();
  const labels = useLabels();
  return (
    <div className={`flex gap-2 ${wide ? '' : 'justify-end'}`}>
      <Button variant="secondary" onClick={m.onClose} className={wide ? 'flex-1' : ''}>
        {t('common.cancel')}
      </Button>
      <Button disabled={m.working} onClick={m.submit} className={wide ? 'flex-[2]' : ''} size={wide ? 'lg' : 'md'}>
        {label ?? labels.save(m.kind)}
      </Button>
    </div>
  );
}

/** Total, paid and what is left, before and after this action. Rows that change are highlighted. */
function BeforeAfter({ m, compact = false }: { m: Money; compact?: boolean }) {
  const { t, money } = useI18n();
  const left = (s: { total: number; paid: number }) => s.total - s.paid;
  const rows = [
    { label: t('payments.billed'), from: m.before.total, to: m.after.total },
    { label: t('money.paid'), from: m.before.paid, to: m.after.paid },
  ];
  const fromLeft = left(m.before);
  const toLeft = left(m.after);
  const leftLabel = (n: number) => (n < 0 ? t('money.creditDue') : t('money.balance'));
  return (
    <dl className={`m-0 flex flex-col ${compact ? 'gap-1.5 text-sm' : 'gap-3'}`}>
      {rows.map((row) => (
        <div key={row.label} className={`flex items-baseline gap-2 ${row.from !== row.to ? '' : 'text-muted'}`}>
          <dt className="flex-1">{row.label}</dt>
          <dd className="m-0 flex items-baseline gap-2 whitespace-nowrap">
            {row.from !== row.to && (
              <>
                <span className="text-muted line-through">{money(row.from)}</span>
                <ArrowRight className="size-3.5 self-center text-muted" aria-hidden="true" />
              </>
            )}
            <span className={row.from !== row.to ? 'font-semibold text-brand-strong' : ''}>{money(row.to)}</span>
          </dd>
        </div>
      ))}
      <div className={`flex items-baseline gap-2 border-t border-line ${compact ? 'pt-1.5' : 'pt-3'}`}>
        <dt className="flex-1 font-semibold">{leftLabel(toLeft)}</dt>
        <dd className="m-0 flex items-baseline gap-2 whitespace-nowrap">
          {fromLeft !== toLeft && (
            <>
              <span className="text-muted line-through">{money(Math.abs(fromLeft))}</span>
              <ArrowRight className="size-3.5 self-center text-muted" aria-hidden="true" />
            </>
          )}
          <span className={`font-display font-bold ${compact ? 'text-lg' : 'text-2xl'} ${toLeft > 0 ? 'text-warn' : 'text-ok'}`}>{money(Math.abs(toLeft))}</span>
        </dd>
      </div>
    </dl>
  );
}

/** One sentence on what saving will do. */
function Outcome({ m }: { m: Money }) {
  const { money } = useI18n();
  const left = m.after.total - m.after.paid;
  const text = left > 0 ? `সেভ করার পরে বাকি থাকবে ${money(left)}` : left < 0 ? `সেভ করার পরে কাস্টমার ${money(-left)} ফেরত পাবেন` : 'সেভ করার পরে পুরো টাকা শোধ হয়ে যাবে';
  return <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${left > 0 ? 'bg-warn-soft text-warn-ink' : 'bg-ok-soft text-ok'}`}>{text}</p>;
}

/* ---------- B: form on the left, before and after on the right ---------- */

function VariantB(props: FormProps) {
  const m = useMoney(props);
  const labels = useLabels();
  return (
    <Frame label={labels.title(m.kind)} onClose={m.onClose} className="grid w-[760px] max-w-full grid-cols-[1fr_300px] overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-xl font-bold">{labels.title(m.kind)}</h2>
          <WhoLine order={m.order} />
        </div>
        <Fields m={m} />
        <Problem m={m} />
        <div className="mt-auto">
          <Actions m={m} />
        </div>
      </div>
      <aside className="flex flex-col gap-4 border-s border-line bg-surface p-6">
        <h3 className="text-sm font-semibold text-muted">এই অর্ডারের হিসাব</h3>
        <BeforeAfter m={m} />
        <div className="mt-auto">
          <Outcome m={m} />
        </div>
      </aside>
    </Frame>
  );
}

/* ---------- C: one big amount with quick picks ---------- */

function moneyText(value: number | null, language: 'bn' | 'en') {
  if (value === null) return '';
  return toScript(value % 100 === 0 ? String(value / 100) : (value / 100).toFixed(2), language);
}

function round10(poisha: number) {
  return Math.round(poisha / 1000) * 1000;
}

function BigAmount({ m }: { m: Money }) {
  const { language, t } = useI18n();
  const [text, setText] = useState(() => moneyText(m.amount, language));
  useEffect(() => setText(moneyText(m.amount, language)), [m.amountKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = text.trim() !== '' && parseTaka(text) === null;
  return (
    <div className="flex flex-col items-center gap-1">
      <label htmlFor="proto-amount" className="text-sm font-semibold text-muted">
        {m.kind === 'discount' ? t('entry.discount') : m.kind === 'correct' ? t('payments.correctAmount') : t('payments.amount')}
      </label>
      <div className={`flex items-baseline gap-1 border-b-2 px-2 ${m.amountError || bad ? 'border-danger' : 'border-brand'}`}>
        <span className="font-display text-3xl text-muted">৳</span>
        <input
          id="proto-amount"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          size={Math.max(3, text.length + 1)}
          onChange={(e) => {
            setText(e.target.value);
            m.setAmount(e.target.value.trim() === '' ? null : parseTaka(e.target.value));
          }}
          className="bg-transparent text-center font-display text-5xl font-bold outline-none"
        />
      </div>
      {(bad || m.amountError) && <p className="text-sm text-danger">{bad ? t('input.invalidMoney') : m.amountError}</p>}
    </div>
  );
}

function QuickPicks({ m }: { m: Money }) {
  const { money } = useI18n();
  const sub = subtotal(m.order);
  const picks: Array<{ label: string; value: number }> =
    m.kind === 'take'
      ? [
          { label: `পুরো বাকি ${money(m.balance)}`, value: m.balance },
          { label: `অর্ধেক ${money(round10(m.balance / 2))}`, value: round10(m.balance / 2) },
          ...[50000, 100000, 200000].filter((v) => v < m.balance).map((v) => ({ label: money(v), value: v })),
        ]
      : m.kind === 'refund'
        ? [
            ...(m.credit > 0 ? [{ label: `ফেরত পাওনা ${money(m.credit)}`, value: m.credit }] : []),
            { label: `সব জমা ${money(m.before.paid)}`, value: m.before.paid },
          ]
        : m.kind === 'discount'
          ? [
              { label: `৫% · ${money(round10(sub * 0.05))}`, value: round10(sub * 0.05) },
              { label: `১০% · ${money(round10(sub * 0.1))}`, value: round10(sub * 0.1) },
              { label: 'ছাড় নেই', value: 0 },
            ]
          : m.kind === 'adjust'
            ? [10000, 20000, 50000].map((v) => ({ label: money(v), value: v }))
            : [{ label: `এখনকার ${money(m.current)}`, value: m.current }];
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {picks.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => m.pick(p.value)}
          className={`min-h-9 rounded-full border px-3.5 text-sm font-semibold ${m.amount === p.value ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-panel hover:bg-surface'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function VariantC(props: FormProps) {
  const m = useMoney(props);
  const labels = useLabels();
  const { money } = useI18n();
  const left = m.after.total - m.after.paid;
  const verb = labels.save(m.kind);
  const saveLabel = m.amount !== null && (m.kind === 'take' || m.kind === 'refund') ? `${money(m.amount)} ${verb}` : verb;
  return (
    <Frame label={labels.title(m.kind)} onClose={m.onClose} className="flex max-h-[calc(100dvh-2rem)] w-[540px] max-w-full flex-col gap-5 overflow-y-auto rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-xl font-bold">{labels.title(m.kind)}</h2>
          <WhoLine order={m.order} />
        </div>
        <CloseButton onClose={m.onClose} />
      </div>
      {m.kind === 'adjust' && (
        <div className="grid grid-cols-2 gap-2">
          {(['up', 'down'] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={m.dir === d}
              onClick={() => m.setDir(d)}
              className={`min-h-11 rounded-xl border font-semibold ${m.dir === d ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-panel hover:bg-surface'}`}
            >
              {d === 'up' ? '+ দাম বাড়ান' : '− দাম কমান'}
            </button>
          ))}
        </div>
      )}
      {m.kind === 'correct' && <p className="text-center text-sm text-muted">এখন লেখা আছে {money(m.current)}</p>}
      <BigAmount m={m} />
      <QuickPicks m={m} />
      <Fields m={m} hideAmount methodTiles />
      <p className="text-center text-sm text-muted">
        {left > 0 ? `পরে বাকি থাকবে ${money(left)}` : left < 0 ? `পরে ফেরত পাওনা ${money(-left)}` : 'পরে পুরো টাকা শোধ'}
      </p>
      <Problem m={m} />
      <Actions m={m} label={saveLabel} wide />
    </Frame>
  );
}

/* ---------- D: one money window with tabs and the history ---------- */

function VariantD(props: FormProps) {
  const can = useCan();
  const labels = useLabels();
  const { t } = useI18n();
  const [tab, setTab] = useState<MoneyKind>(props.kind);
  const [payment, setPayment] = useState(props.payment);
  const tabs: MoneyKind[] = [
    ...(can('payments.record') ? (['take'] as const) : []),
    ...(can('payments.refund') && netPaid(props.order.payments) > 0 ? (['refund'] as const) : []),
    ...(can('orders.edit') ? (['discount', 'adjust'] as const) : []),
    ...(payment ? (['correct'] as const) : []),
  ];
  return (
    <Frame label={t('payments.section')} onClose={props.onClose} className="flex h-[min(660px,calc(100dvh-2rem))] w-[920px] max-w-full flex-col overflow-hidden rounded-2xl">
      <header className="flex items-center gap-4 border-b border-line px-6 py-4">
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="font-display text-xl font-bold">{t('payments.section')}</h2>
          <WhoLine order={props.order} />
        </div>
        <CloseButton onClose={props.onClose} />
      </header>
      <div role="tablist" className="flex gap-1 border-b border-line px-4">
        {tabs.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold ${tab === k ? 'border-brand text-brand-strong' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {labels.tab(k)}
          </button>
        ))}
      </div>
      <TabBody
        key={`${tab}-${payment?.id ?? ''}`}
        {...props}
        kind={tab}
        payment={payment}
        onCorrect={(p) => {
          setPayment(p);
          setTab('correct');
        }}
      />
    </Frame>
  );
}

function TabBody(props: FormProps & { onCorrect(p: Payment): void }) {
  const m = useMoney(props);
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
        <Fields m={m} />
        <Problem m={m} />
        <div className="mt-auto">
          <Actions m={m} />
        </div>
      </div>
      <aside className="flex min-h-0 flex-col gap-4 border-s border-line bg-surface p-5">
        <BeforeAfter m={m} compact />
        <History order={m.order} onCorrect={props.onCorrect} />
      </aside>
    </div>
  );
}

/** Every record on the order, newest first, with a correction link on each. */
function History({ order, onCorrect }: { order: Order; onCorrect?(p: Payment): void }) {
  const { t, date, money } = useI18n();
  const can = useCan();
  const { model } = useOrderInfo(order);
  const rows = (model?.payments ?? []).map((row, i) => ({ row, payment: order.payments[i]! })).reverse();
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted">{t('receipt.payments')}</h3>
      {rows.length === 0 && <p className="text-sm text-muted">{t('payments.nothingYet')}</p>}
      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col overflow-y-auto p-0">
        {rows.map(({ row, payment }) => (
          <li key={row.id} className="flex items-center gap-3 border-b border-line py-2 text-sm last:border-b-0">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">
                {t(`receipt.kind.${row.kind}`)} · {t(`method.${row.method}`)}
              </span>
              <span className="truncate text-xs text-muted">
                {date(row.at.slice(0, 10))}
                {row.reason && ` · ${row.reason}`}
              </span>
            </div>
            <span className={`whitespace-nowrap font-semibold ${row.effect < 0 ? 'text-danger' : 'text-ok'}`}>{money(row.effect)}</span>
            {onCorrect && can('payments.correct') && row.kind !== 'correction' && (
              <button type="button" onClick={() => onCorrect(payment)} className="text-xs font-semibold text-brand-strong hover:underline">
                {t('payments.correct')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- E: drawer from the right, ledger above, form docked below ---------- */

function VariantE(props: FormProps) {
  const m = useMoney(props);
  const labels = useLabels();
  const { t, money } = useI18n();
  const left = m.after.total - m.after.paid;
  const tile = (label: string, from: number, to: number, tone = '') => (
    <div className="flex flex-col gap-0.5 rounded-xl bg-surface px-3 py-2.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-display text-lg font-bold ${tone}`}>{money(to)}</span>
      <span className={`text-xs ${from !== to ? 'text-muted line-through' : 'invisible'}`}>{money(from)}</span>
    </div>
  );
  const fromLeft = m.before.total - m.before.paid;
  return (
    <Frame side label={labels.title(m.kind)} onClose={m.onClose} className="flex h-full w-[460px] max-w-full flex-col">
      <header className="flex items-start gap-3 border-b border-line px-5 py-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <h2 className="font-display text-xl font-bold">{labels.title(m.kind)}</h2>
          <WhoLine order={m.order} />
        </div>
        <CloseButton onClose={m.onClose} />
      </header>
      <div className="grid grid-cols-3 gap-2 px-5 pt-4">
        {tile(t('payments.billed'), m.before.total, m.after.total)}
        {tile(t('money.paid'), m.before.paid, m.after.paid, 'text-ok')}
        {tile(left < 0 ? t('money.creditDue') : t('money.balance'), Math.abs(fromLeft), Math.abs(left), left > 0 ? 'text-warn' : 'text-ok')}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-5 pt-4">
        <History order={m.order} />
      </div>
      <section className="flex flex-col gap-4 border-t border-line bg-panel px-5 py-4 shadow-[0_-6px_16px_-12px_rgb(0_0_0/0.3)]">
        <h3 className="text-sm font-semibold text-brand-strong">নতুন লেনদেন</h3>
        <Fields m={m} />
        <Problem m={m} />
        <Actions m={m} wide />
      </section>
    </Frame>
  );
}
