// PROTOTYPE (throwaway): five ways to lay out the money part of the desktop new-order receipt column so the column
// fits without its own scrollbar. Everything else on the page is unchanged. Switch with ?variant=0|1|2|3|4|5.
import type { PaymentMethod } from '@darzikhata/domain';
import { Info, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { NumberField } from '../../../ui/NumberField';
import { TextField } from '../../../ui/TextField';
import type { DraftErrors } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText, useItemTitle } from './shared';

export const RECEIPT_MONEY_VARIANTS = {
  '0': 'Current',
  '1': 'Pairs side by side, one-line note',
  '2': 'Advance shown, discount and note added on demand',
  '3': 'Label on the left, small rows like a ledger',
  '4': 'Discount and advance typed straight into the totals',
  '5': 'Extra fields appear only when they apply',
} as const;
export type ReceiptVariant = Exclude<keyof typeof RECEIPT_MONEY_VARIANTS, '0'>;

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const METHODS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank'];
/** Shrinks a TextField or NumberField: label on the left, a 36px input on the right. */
const ROW = 'flex-row! items-center gap-3! [&>label]:w-24 [&>label]:shrink-0 [&>label]:font-normal [&>div]:min-h-9 [&>div]:min-w-0 [&>div]:flex-1 [&_input]:py-1';
/** Shrinks the input only, label stays on top. */
const SMALL = '[&>div]:min-h-10 [&_input]:py-1.5';

/** The middle of the receipt column: a short heading, the garment lines and the money fields. */
export function ReceiptMoneyPrototype({ variant, entry, errors }: { variant: ReceiptVariant; entry: OrderEntry; errors: DraftErrors }) {
  const { t, money, number, language } = useI18n();
  const L = (bn: string, en: string) => (language === 'bn' ? bn : en);
  const title = useItemTitle(entry);
  const errorText = useErrorText(errors);
  const { discount, advance, notes } = entry.draft;
  const [shown, setShown] = useState({ discount: discount.amount !== null, notes: notes !== '' });

  // The three-line note under the title becomes an info icon; the restored notice stays, on one line.
  const heading = (
    <div className="flex flex-col gap-0.5 border-b border-dashed border-line px-5 py-2.5">
      <p className="flex items-center justify-center gap-1.5 font-display text-lg font-bold">
        {t('nav.newOrder')}
        <span title={t(entry.persists ? 'entry.newDraftNote' : 'entry.newOrderNote')} className="text-muted">
          <Info aria-label={t(entry.persists ? 'entry.newDraftNote' : 'entry.newOrderNote')} size={15} />
        </span>
      </p>
      {entry.restored && (
        <p role="status" className="text-center text-xs text-muted">
          {t('entry.draftRestored')}{' '}
          <button type="button" onClick={entry.discard} className={`font-semibold text-brand-strong underline ${FOCUS}`}>
            {t('entry.startFresh')}
          </button>
        </p>
      )}
    </div>
  );
  const lines = (
    <ul className="flex flex-col px-5 py-1 text-sm">
      {entry.draft.items.length === 0 && <li className="py-2 text-muted">{t('entry.noGarments')}</li>}
      {entry.draft.items.map((item) => (
        <li key={item.key} className="flex items-baseline justify-between gap-2 border-b border-dotted border-line py-1.5">
          <span>
            {title(item)}
            {item.quantity > 1 && <span className="text-muted"> × {number(item.quantity)}</span>}
          </span>
          <span className="font-semibold">{item.price === null ? '–' : money(item.price * item.quantity)}</span>
        </li>
      ))}
    </ul>
  );

  const field = {
    discount: (cls = '') => (
      <NumberField
        label={t('entry.discount')}
        kind="money"
        className={cls}
        initialValue={discount.amount}
        onValueChange={(amount) => entry.update({ discount: { ...entry.draft.discount, amount } })}
        onInvalidChange={(bad) => entry.setUnreadable('discount', bad)}
        error={errorText('discount.amount')}
      />
    ),
    reason: (cls = '') => (
      <TextField
        label={t('entry.discountReason')}
        className={cls}
        value={discount.reason}
        onChange={(e) => entry.update({ discount: { ...entry.draft.discount, reason: e.target.value } })}
        autoComplete="off"
      />
    ),
    advance: (cls = '') => (
      <NumberField
        label={t('entry.advance')}
        kind="money"
        className={cls}
        initialValue={advance.amount}
        onValueChange={(amount) => entry.update({ advance: { ...entry.draft.advance, amount } })}
        onInvalidChange={(bad) => entry.setUnreadable('advance', bad)}
        error={errorText('advance.amount')}
      />
    ),
    reference: (cls = '') => (
      <TextField
        label={t('payment.reference')}
        className={cls}
        value={advance.reference}
        onChange={(e) => entry.update({ advance: { ...entry.draft.advance, reference: e.target.value } })}
        autoComplete="off"
      />
    ),
    notes: (cls = '') => (
      <TextField label={t('entry.notes')} className={cls} value={notes} onChange={(e) => entry.update({ notes: e.target.value })} autoComplete="off" />
    ),
  };
  const methods = (cls = '') => (
    <div role="group" aria-label={t('payment.method')} className={`flex gap-1 ${cls}`}>
      {METHODS.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={advance.method === m}
          onClick={() => entry.update({ advance: { ...entry.draft.advance, method: m } })}
          className={`min-h-8 flex-1 rounded-md border px-1 text-sm ${advance.method === m ? 'border-brand bg-brand-soft font-semibold text-brand-strong' : 'border-line bg-panel'} ${FOCUS}`}
        >
          {t(`method.${m}`)}
        </button>
      ))}
    </div>
  );
  const methodLabelled = (cls = '') => (
    <div className={`flex flex-col gap-1 ${cls}`}>
      <span className="text-sm font-semibold">{t('payment.method')}</span>
      {methods()}
    </div>
  );
  const nonCash = advance.method !== 'cash';

  let body: ReactNode;
  if (variant === '1') {
    // Pairs side by side; the note is one line instead of a box.
    body = (
      <div className="flex flex-col gap-2.5 px-5 pt-2 pb-3">
        <div className="grid grid-cols-2 items-end gap-2">
          {field.discount(SMALL)}
          {field.reason(SMALL)}
        </div>
        <div className="grid grid-cols-2 items-end gap-2">
          {field.advance(SMALL)}
          {field.reference(SMALL)}
        </div>
        {methods()}
        {field.notes(SMALL)}
      </div>
    );
  } else if (variant === '2') {
    // The advance is taken on most orders, so it is always there. Discount and note open in place when asked for.
    const adder = (key: 'discount' | 'notes', label: string) => (
      <button
        type="button"
        onClick={() => setShown((s) => ({ ...s, [key]: true }))}
        className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-strong hover:bg-surface ${FOCUS}`}
      >
        <Plus aria-hidden="true" size={14} />
        {label}
      </button>
    );
    body = (
      <div className="flex flex-col gap-2.5 px-5 pt-2 pb-3">
        {field.advance(SMALL)}
        {methods()}
        {nonCash && field.reference(SMALL)}
        {shown.discount && (
          <div className="grid grid-cols-2 items-end gap-2">
            {field.discount(SMALL)}
            {field.reason(SMALL)}
          </div>
        )}
        {shown.notes && field.notes(SMALL)}
        {(!shown.discount || !shown.notes) && (
          <div className="flex gap-1">
            {!shown.discount && adder('discount', L('ছাড় দিন', 'Add discount'))}
            {!shown.notes && adder('notes', L('নোট লিখুন', 'Add note'))}
          </div>
        )}
      </div>
    );
  } else if (variant === '3') {
    // A ledger: label on the left, a small input on the right, every field always there.
    body = (
      <div className="flex flex-col gap-1.5 px-5 pt-2 pb-3 text-sm">
        {field.discount(ROW)}
        {field.reason(ROW)}
        {field.advance(ROW)}
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0">{t('payment.method')}</span>
          {methods('flex-1')}
        </div>
        {field.reference(ROW)}
        {field.notes(ROW)}
      </div>
    );
  } else if (variant === '4') {
    // The totals table becomes the form: discount and advance are typed into their own rows, so nothing is shown twice.
    const row = (label: ReactNode, value: ReactNode, strong = false) => (
      <div className={`flex items-center justify-between gap-3 border-t border-line py-1.5 ${strong ? 'font-semibold' : ''}`}>
        <span className="shrink-0">{label}</span>
        {value}
      </div>
    );
    const inline = (node: ReactNode) => <div className="w-32 [&>div>label]:sr-only [&>div>div]:min-h-9 [&_input]:py-1 [&_input]:text-right">{node}</div>;
    body = (
      <div className="flex flex-col px-5 pt-1 pb-3 text-sm">
        {row(t('money.subtotal'), <span>{money(entry.totals.subtotal)}</span>)}
        {row(t('money.discount'), inline(field.discount()))}
        {discount.amount !== null && discount.amount > 0 && <div className="pb-1.5">{field.reason(SMALL)}</div>}
        {row(t('money.total'), <span>{money(entry.totals.total)}</span>, true)}
        {row(t('money.advance'), inline(field.advance()))}
        <div className="flex flex-col gap-1.5 pb-1.5">
          {methods()}
          {nonCash && field.reference(SMALL)}
        </div>
        {row(t('entry.balanceLeft'), <span className="text-warn">{money(entry.totals.balance)}</span>, true)}
        <div className="border-t border-line pt-2">{field.notes(SMALL)}</div>
      </div>
    );
  } else {
    // Closest to today: same stacked fields, but the reason shows only after a discount and the TrxID only for
    // bKash, Nagad or bank. The note is one line.
    body = (
      <div className="flex flex-col gap-3 px-5 pt-2 pb-3">
        {field.discount()}
        {discount.amount !== null && discount.amount > 0 && field.reason()}
        {field.advance()}
        {methodLabelled()}
        {nonCash && field.reference()}
        {field.notes()}
      </div>
    );
  }

  return (
    <>
      {heading}
      {lines}
      {body}
    </>
  );
}
