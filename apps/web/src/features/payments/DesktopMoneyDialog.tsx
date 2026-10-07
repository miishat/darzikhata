import { parseTaka, subtotal, type Payment } from '@darzikhata/domain';
import { ArrowRight, Banknote, Landmark, Minus, Plus, Smartphone, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { useModalFocus } from '../../ui/Dialog';
import { fieldText } from '../../ui/NumberField';
import { TextAreaField } from '../../ui/TextAreaField';
import { TextField } from '../../ui/TextField';
import { METHODS, useMoneyAction, type MoneyAction, type MoneyActionProps, type MoneyActionState } from './useMoneyAction';

const METHOD_ICON = { cash: Banknote, bkash: Smartphone, nagad: Smartphone, bank: Landmark };

/** Rounds to the nearest ten taka, for suggested amounts. */
const roundTen = (poisha: number) => Math.round(poisha / 1000) * 1000;

/**
 * Desktop: one window for every money action. The left side has the amount in large type with suggested
 * amounts under it, the method as tiles and the reason; the right side shows the order's total, paid and
 * what is left, before and after saving. Like the phone sheets it is not a form, so Enter records nothing.
 */
export function DesktopMoneyDialog({ kind, order, payment, onClose }: MoneyActionProps & { kind: MoneyAction; payment?: Payment | undefined }) {
  const { t } = useI18n();
  const { state } = useSnapshot();
  const m = useMoneyAction(kind, order, onClose, payment);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocus(true, panel, onClose);
  const customer = state.customers[order.customerId];
  const title = {
    take: t('payments.takeTitle'),
    refund: t('payments.refundTitle'),
    discount: t('payments.discount'),
    adjust: t('payments.adjust'),
    correct: t('payments.correct'),
  }[kind];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog-panel grid max-h-[calc(100dvh-2rem)] w-[860px] max-w-full grid-cols-[1fr_300px] overflow-hidden rounded-2xl bg-panel-raised text-ink shadow-xl outline-1 -outline-offset-1 outline-raised-line"
      >
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 id={titleId} className="font-display text-xl font-bold">
                {title}
              </h2>
              <p className="flex items-center gap-2 text-sm">
                {customer && <Avatar id={customer.id} name={customer.name} size="sm" />}
                {customer && <span className="truncate font-semibold">{customer.name}</span>}
                <span className="whitespace-nowrap text-muted">{t('receipt.orderNumber', { number: order.number })}</span>
              </p>
            </div>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <Fields m={m} />
          {m.problem && (
            <p role="alert" className="text-danger">
              {m.problem}
            </p>
          )}
          <div className="mt-auto flex gap-2">
            <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button size="lg" disabled={m.working} onClick={m.submit} className="flex-[2]">
              <SaveLabel m={m} />
            </Button>
          </div>
        </div>
        <aside aria-label={t('payments.thisOrder')} className="flex flex-col gap-4 border-s border-line bg-surface p-6">
          <h3 className="text-sm font-semibold text-muted">{t('payments.thisOrder')}</h3>
          <BeforeAfter m={m} />
          <Outcome m={m} />
        </aside>
      </div>
    </div>,
    document.body,
  );
}

function SaveLabel({ m }: { m: MoneyActionState }) {
  const { t, money } = useI18n();
  const named = m.amount !== null && m.amount > 0;
  if (m.kind === 'take') return <>{named ? t('payments.recordAmount', { amount: money(m.amount!) }) : t('payments.record')}</>;
  if (m.kind === 'refund') return <>{named ? t('payments.refundAmount', { amount: money(m.amount!) }) : t('payments.doRefund')}</>;
  return <>{t('common.save')}</>;
}

/** The action's fields: direction for a price change, the amount and its suggestions, the method, then the note. */
function Fields({ m }: { m: MoneyActionState }) {
  const { t, money } = useI18n();
  const reasonLabel = { refund: t('payments.refundReason'), adjust: t('payments.reason'), correct: t('payments.correctReason') };
  return (
    <>
      {m.kind === 'adjust' && <DirectionTiles m={m} />}
      {m.kind === 'correct' && <p className="text-center font-semibold">{t('payments.nowRecorded', { amount: money(m.current) })}</p>}
      <BigAmount m={m} />
      {(m.kind === 'take' || m.kind === 'refund') && <MethodTiles m={m} />}
      {m.kind === 'take' && m.method !== 'cash' && (
        <TextField label={t('payment.reference')} value={m.reference} onChange={(e) => m.setReference(e.target.value)} autoComplete="off" />
      )}
      {m.kind === 'discount' && <TextField label={t('entry.discountReason')} value={m.reason} onChange={(e) => m.setReason(e.target.value)} autoComplete="off" />}
      {(m.kind === 'refund' || m.kind === 'adjust' || m.kind === 'correct') && (
        <TextAreaField label={reasonLabel[m.kind]} value={m.reason} onChange={(e) => m.setReason(e.target.value)} error={m.reasonError} />
      )}
    </>
  );
}

/** The amount in large type, with suggested amounts under it that fill it in. */
function BigAmount({ m }: { m: MoneyActionState }) {
  const { t, money, number, language } = useI18n();
  const id = useId();
  const [text, setText] = useState(() => fieldText('money', m.initial, language));
  const unreadable = text.trim() !== '' && parseTaka(text) === null;
  const error = unreadable ? t('input.invalidMoney') : m.amountError;
  const label = m.kind === 'discount' ? t('entry.discount') : m.kind === 'correct' ? t('payments.correctAmount') : t('payments.amount');

  const fill = (value: number) => {
    setText(fieldText('money', value, language));
    m.setAmount(value);
  };
  const sub = subtotal(m.order);
  const picks: Array<{ label: string; value: number }> = {
    take: [
      { label: t('payments.pickBalance', { amount: money(m.balance) }), value: m.balance },
      { label: t('payments.pickHalf', { amount: money(roundTen(m.balance / 2)) }), value: roundTen(m.balance / 2) },
      ...[50000, 100000, 200000].filter((v) => v < m.balance / 2).map((v) => ({ label: money(v), value: v })),
    ].filter((p) => p.value > 0),
    refund: [
      ...(m.credit > 0 ? [{ label: t('payments.pickCredit', { amount: money(m.credit) }), value: m.credit }] : []),
      ...(m.before.paid > 0 ? [{ label: t('payments.pickAllPaid', { amount: money(m.before.paid) }), value: m.before.paid }] : []),
    ],
    discount: [
      ...[5, 10].map((percent) => ({ label: t('payments.pickPercent', { percent: number(percent), amount: money(roundTen((sub * percent) / 100)) }), value: roundTen((sub * percent) / 100) })),
      { label: t('payments.pickNoDiscount'), value: 0 },
    ],
    adjust: [10000, 20000, 50000].map((v) => ({ label: money(v), value: v })),
    correct: [],
  }[m.kind];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <label htmlFor={id} className="text-sm font-semibold text-muted">
          {label}
        </label>
        <div className={`flex items-baseline gap-1 border-b-2 px-2 ${error ? 'border-danger' : 'border-brand'}`}>
          <span aria-hidden="true" className="font-display text-3xl text-muted">
            ৳
          </span>
          <input
            id={id}
            data-autofocus
            inputMode="decimal"
            autoComplete="off"
            value={text}
            size={Math.max(4, text.length + 1)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-message` : undefined}
            onChange={(e) => {
              setText(e.target.value);
              m.setAmount(e.target.value.trim() === '' ? null : parseTaka(e.target.value));
            }}
            onBlur={() => {
              if (!unreadable && m.amount !== null) setText(fieldText('money', m.amount, language));
            }}
            className="bg-transparent text-center font-display text-5xl font-bold outline-none"
          />
        </div>
        {error && (
          <p id={`${id}-message`} className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {picks.length > 0 && (
        <div role="group" aria-label={t('payments.quickPicks')} className="flex flex-wrap justify-center gap-2">
          {picks.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={m.amount === p.value}
              onClick={() => fill(p.value)}
              className={`min-h-9 rounded-full border px-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-focus ${
                m.amount === p.value ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-panel hover:bg-surface'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const tile = (on: boolean) =>
  `flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
    on ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-panel hover:bg-surface'
  }`;

function MethodTiles({ m }: { m: MoneyActionState }) {
  const { t } = useI18n();
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{t('payment.method')}</legend>
      <div className="grid grid-cols-4 gap-2">
        {METHODS.map((value) => {
          const Icon = METHOD_ICON[value];
          return (
            <label key={value} className={`${tile(m.method === value)} flex-col py-3`}>
              <input type="radio" name={name} className="sr-only" checked={m.method === value} onChange={() => m.setMethod(value)} />
              <Icon className="size-6" aria-hidden="true" />
              {t(`method.${value}`)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function DirectionTiles({ m }: { m: MoneyActionState }) {
  const { t } = useI18n();
  const name = useId();
  const options = [
    { value: 'up' as const, label: t('payments.adjustUp'), Icon: Plus },
    { value: 'down' as const, label: t('payments.adjustDown'), Icon: Minus },
  ];
  return (
    <fieldset>
      <legend className="sr-only">{t('payments.adjustKind')}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ value, label, Icon }) => (
          <label key={value} className={`${tile(m.direction === value)} min-h-11`}>
            <input type="radio" name={name} className="sr-only" checked={m.direction === value} onChange={() => m.setDirection(value)} />
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** One amount that may change: the new value, with the old one struck through before it when they differ. */
function Change({ from, to, strong = false, tone = '' }: { from: number; to: number; strong?: boolean; tone?: string }) {
  const { t, money } = useI18n();
  return (
    <dd className="m-0 flex items-baseline gap-2 whitespace-nowrap">
      {from !== to && (
        <>
          <span className="text-muted line-through">
            <span className="sr-only">{t('payments.was')} </span>
            {money(from)}
          </span>
          <ArrowRight className="size-3.5 self-center text-muted" aria-hidden="true" />
        </>
      )}
      <span className={`${strong ? `font-display text-2xl font-bold ${tone}` : from !== to ? 'font-semibold text-brand-strong' : ''}`}>{money(to)}</span>
    </dd>
  );
}

function BeforeAfter({ m }: { m: MoneyActionState }) {
  const { t } = useI18n();
  const leftBefore = m.before.total - m.before.paid;
  const leftAfter = m.after.total - m.after.paid;
  const rows = [
    { label: t('payments.billed'), from: m.before.total, to: m.after.total },
    { label: t('money.paid'), from: m.before.paid, to: m.after.paid },
  ];
  return (
    <dl className="m-0 flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className={`flex items-baseline gap-2 ${row.from === row.to ? 'text-muted' : ''}`}>
          <dt className="flex-1">{row.label}</dt>
          <Change from={row.from} to={row.to} />
        </div>
      ))}
      <div className="flex items-baseline gap-2 border-t border-line pt-3">
        <dt className="flex-1 font-semibold">{leftAfter < 0 ? t('money.creditDue') : t('money.balance')}</dt>
        <Change from={Math.abs(leftBefore)} to={Math.abs(leftAfter)} strong tone={leftAfter > 0 ? 'text-warn' : 'text-ok'} />
      </div>
    </dl>
  );
}

/** One sentence on where the order stands once this is saved. */
function Outcome({ m }: { m: MoneyActionState }) {
  const { t, money } = useI18n();
  const left = m.after.total - m.after.paid;
  const text =
    left > 0 ? t('payments.afterOwed', { amount: money(left) }) : left < 0 ? t('payments.afterCredit', { amount: money(-left) }) : t('payments.afterSettled');
  return <p className={`mt-auto rounded-lg px-3 py-2 text-sm font-semibold ${left > 0 ? 'bg-warn-soft text-warn-ink' : 'bg-ok-soft text-ok'}`}>{text}</p>;
}
