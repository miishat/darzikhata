// PROTOTYPE (throwaway): five variations of variant A (checklist receipt) for the desktop new order form. They fix
//   1. after one failed save, every garment added later opens with all its measurements in red;
//   2. two scroll areas side by side, and the receipt column is cramped at 800px height;
//   3. the save button looks ready before a customer is picked.
// All five share fix 1 (errors only for the garments on the order when save was pressed) and fix 3 (a grey save
// button that names the next step, plus a "before saving" checklist). They differ in where the payment fields sit,
// always inline on the page, never in a popup. Switch with ?variant=0|A1|A2|A3|A4|A5 on /app/orders/new.
import { profileKey, templateById, type PaymentMethod } from '@darzikhata/domain';
import { ArrowLeft, Check, ChevronDown, Circle, Plus, Shirt, Trash2, Wallet } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/NumberField';
import { TextField } from '../../ui/TextField';
import type { DraftErrors, DraftItem } from './draft';
import { CustomerBar } from './entry/CustomerBar';
import { AddGarmentButtons, GarmentTiles, type LineStatus } from './entry/GarmentTiles';
import { ItemDetails } from './entry/ItemDetails';
import { ItemHeader } from './entry/ItemHeader';
import { ItemMeasurements } from './entry/ItemMeasurements';
import { measureStatus, missingCounts } from './entry/measureStatus';
import { ItemSchedule } from './entry/MoneyFields';
import { useErrorText, useItemTitle } from './entry/shared';
import { SourceSwitch } from './entry/SourceSwitch';
import type { OrderEntry } from './useOrderEntry';

export const NEW_ORDER_VARIANTS = {
  '0': 'Current',
  A1: 'Accordion: garments or payment open in the receipt column',
  A2: 'Tabs at the top of the receipt column: receipt / payment',
  A3: 'Advance always inline, discount and note added on demand',
  A4: 'Payment as a tile next to the garments, edited in the big panel',
  A5: 'Wider column, payment grid in place of the garment lines',
} as const;
type Variant = Exclude<keyof typeof NEW_ORDER_VARIANTS, '0'>;

interface Props {
  variant: Variant;
  entry: OrderEntry;
  onSaved(orderId: string): void;
  onDiscarded(): void;
}

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const TONE = { warn: 'bg-warn-soft text-warn-ink', ok: 'bg-ok-soft text-ok' } as const;
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const METHODS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank'];

/** What still blocks saving, worked out from all errors, shown or not. */
function useReadiness(entry: OrderEntry) {
  const title = useItemTitle(entry);
  const paths = Object.keys(entry.errors);
  const customerOk = !paths.some((p) => p === 'customer' || p.startsWith('customer.'));
  const garmentsOk = entry.draft.items.length > 0;
  const missing = missingCounts(entry.errors, entry.draft.items);
  const short = entry.draft.items.filter((i) => missing[i.key]).map((i) => ({ key: i.key, title: title(i), n: missing[i.key]! }));
  const otherOk = !paths.some((p) => !(p === 'customer' || p.startsWith('customer.') || p === 'items' || p.includes('.measure.')));
  return { customerOk, garmentsOk, measuresOk: short.length === 0, otherOk, short, ready: paths.length === 0 };
}

/** Small payment pieces so each variation can lay them out its own way. */
function useMoneyBits(entry: OrderEntry, errors: DraftErrors) {
  const { t } = useI18n();
  const errorText = useErrorText(errors);
  const { discount, advance, notes } = entry.draft;
  const advanceField = (
    <NumberField
      label={t('entry.advance')}
      kind="money"
      initialValue={advance.amount}
      onValueChange={(amount) => entry.update({ advance: { ...entry.draft.advance, amount } })}
      onInvalidChange={(bad) => entry.setUnreadable('advance', bad)}
      error={errorText('advance.amount')}
    />
  );
  const methodChips = (
    <div role="group" aria-label={t('payment.method')} className="flex flex-wrap gap-1.5">
      {METHODS.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={advance.method === m}
          onClick={() => entry.update({ advance: { ...entry.draft.advance, method: m } })}
          className={`min-h-9 rounded-lg border px-2.5 text-sm ${advance.method === m ? 'border-brand bg-brand-soft font-semibold text-brand-strong' : 'border-line bg-panel'} ${FOCUS}`}
        >
          {t(`method.${m}`)}
        </button>
      ))}
    </div>
  );
  const referenceField =
    advance.method !== 'cash' ? (
      <TextField
        label={t('payment.reference')}
        value={advance.reference}
        onChange={(e) => entry.update({ advance: { ...entry.draft.advance, reference: e.target.value } })}
        autoComplete="off"
      />
    ) : null;
  const discountField = (
    <NumberField
      label={t('entry.discount')}
      kind="money"
      initialValue={discount.amount}
      onValueChange={(amount) => entry.update({ discount: { ...entry.draft.discount, amount } })}
      onInvalidChange={(bad) => entry.setUnreadable('discount', bad)}
      error={errorText('discount.amount')}
    />
  );
  const reasonField = (
    <TextField
      label={t('entry.discountReason')}
      value={discount.reason}
      onChange={(e) => entry.update({ discount: { ...entry.draft.discount, reason: e.target.value } })}
      autoComplete="off"
    />
  );
  const notesField = <TextField label={t('entry.notes')} value={notes} onChange={(e) => entry.update({ notes: e.target.value })} autoComplete="off" />;
  return { advanceField, methodChips, referenceField, discountField, reasonField, notesField };
}

export function NewOrderDesktopPrototype({ variant, entry, onSaved, onDiscarded }: Props) {
  const { t, money, number, language } = useI18n();
  const L = (bn: string, en: string) => (language === 'bn' ? bn : en);
  const { config, state } = useSnapshot();
  const navigate = useNavigate();
  const title = useItemTitle(entry);
  const items = entry.draft.items;
  const [chosenKey, setChosenKey] = useState<string | null>(() => items[0]?.key ?? null);
  // Fix 1: remember which garments were on the order when save was pressed. Only those show measurement errors.
  const [attempted, setAttempted] = useState<Set<string> | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [open, setOpen] = useState<'lines' | 'money'>('lines'); // A1 accordion, A2 tabs
  const [extra, setExtra] = useState({ discount: entry.draft.discount.amount !== null, notes: entry.draft.notes !== '' }); // A3
  const [moneyChosen, setMoneyChosen] = useState(false); // A4
  const customerBox = useRef<HTMLDivElement>(null);
  const ready = useReadiness(entry);

  const errors: DraftErrors = {};
  if (attempted) {
    for (const [path, code] of Object.entries(entry.errors)) {
      const m = /^items\.([^.]+)\./.exec(path);
      if (!m || attempted.has(m[1]!)) errors[path] = code;
    }
  }
  const bits = useMoneyBits(entry, errors);
  const errorText = useErrorText(errors);
  const chosen = items.find((i) => i.key === chosenKey) ?? null;
  const lineHasErrors = (key: string) => Object.keys(errors).some((p) => p.startsWith(`items.${key}.`));
  const customerId = entry.draft.customer?.kind === 'existing' ? entry.draft.customer.customerId : null;

  const statusLine = (item: DraftItem): LineStatus | null => {
    const template = config ? templateById(config, item.templateId) : null;
    if (!template) return null;
    const m = item.measurements;
    const saved =
      m.kind === 'saved' && customerId && entry.canSeeMeasurements
        ? (state.profiles[profileKey(customerId, template.id)]?.versions.find((v) => v.id === m.versionId) ?? null)
        : null;
    const status = measureStatus(template, item, saved);
    if (status.kind === 'missing') return { text: t('entry.statusMissing', { n: number(status.missing) }), tone: 'warn' };
    if (status.kind === 'confirm') return { text: t('entry.statusConfirm'), tone: 'warn' };
    if (status.kind === 'filled' && status.filled > 0) return { text: t('entry.statusFilled', { n: number(status.filled) }), tone: 'ok' };
    return null;
  };

  const choose = (key: string) => {
    setChosenKey(key);
    setMoneyChosen(false);
  };
  const add = (templateId: string) => {
    const key = entry.addItem(templateId);
    if (key) choose(key);
  };
  const focusCustomer = () => customerBox.current?.querySelector<HTMLInputElement>('input')?.focus();
  /** Show errors for the garments on the order now, and jump to the first one with a problem. */
  const reveal = () => {
    setAttempted(new Set(items.map((i) => i.key)));
    const first = items.find((i) => Object.keys(entry.errors).some((p) => p.startsWith(`items.${i.key}.`)));
    if (first) choose(first.key);
  };

  const save = async () => {
    setProblem(null);
    const result = await entry.save();
    if (result.ok) return onSaved(result.orderId);
    if (result.problem) return setProblem(result.problem);
    if (Object.keys(entry.errors).length > 0) {
      reveal();
      if (!ready.customerOk) focusCustomer();
      return;
    }
    setProblem(t('entry.saveFailed'));
  };

  const nextStep = !ready.customerOk
    ? L('আগে কাস্টমার বেছে নিন', 'Choose a customer first')
    : !ready.garmentsOk
      ? L('আগে পোশাক যোগ করুন', 'Add a garment first')
      : !ready.measuresOk
        ? L('মাপগুলো পূরণ করুন', 'Fill in the measurements')
        : L('ভুলগুলো ঠিক করুন', 'Fix the marked fields');
  const goToNextStep = () => {
    if (!ready.customerOk) return focusCustomer();
    if (!ready.garmentsOk) return document.querySelector<HTMLButtonElement>('[data-tour="add-garment"] button')?.focus();
    reveal();
  };

  const heading = (
    <div className="flex items-center gap-2">
      <Link
        to="/app/orders"
        aria-label={t('entry.backToOrders')}
        className={`grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink ${FOCUS}`}
      >
        <ArrowLeft aria-hidden="true" size={18} />
      </Link>
      <h1 className="font-display text-xl font-bold">{t('nav.newOrder')}</h1>
      {/* Discard moves up beside the title so the receipt column keeps its height for the payment. */}
      <button
        type="button"
        onClick={() => (entry.dirty ? setConfirmDiscard(true) : navigate('/app/orders'))}
        className={`ms-1 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted hover:bg-surface hover:text-danger ${FOCUS}`}
      >
        <Trash2 aria-hidden="true" size={14} />
        {t('entry.discardDraft')}
      </button>
    </div>
  );

  const chosenStatus = chosen ? statusLine(chosen) : null;
  const garmentBody = chosen ? (
    <div className="flex min-h-full flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="me-auto flex flex-col items-start gap-1">
          {chosenStatus && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[chosenStatus.tone]}`}>{chosenStatus.text}</span>}
          <h3 className="font-display text-xl font-bold">{title(chosen)}</h3>
        </div>
        {chosen.measurements.kind === 'new' && (
          <SourceSwitch
            value={chosen.measurements.source}
            onChange={(source) => {
              const m = chosen.measurements;
              if (m.kind === 'new') entry.updateItem(chosen.key, { measurements: { ...m, source } });
            }}
          />
        )}
        <ItemHeader key={`${chosen.key}:header`} entry={entry} item={chosen} errors={errors} showRemove={false} />
      </div>
      <ItemMeasurements key={`${chosen.key}:measurements`} entry={entry} item={chosen} errors={errors} />
      <ItemDetails key={`${chosen.key}:details`} entry={entry} item={chosen} desktop />
      <ItemSchedule key={`${chosen.key}:schedule`} entry={entry} item={chosen} errors={errors} />
      <button
        type="button"
        onClick={() => entry.removeItem(chosen.key)}
        className={`mt-auto inline-flex min-h-11 items-center gap-2 self-center rounded-lg px-3 text-sm font-semibold text-danger hover:bg-surface ${FOCUS}`}
      >
        <Trash2 aria-hidden="true" size={18} />
        {t('entry.removeItem', { item: title(chosen) })}
      </button>
    </div>
  ) : (
    <div className="grid h-full min-h-72 place-items-center">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span aria-hidden="true" className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
          <Shirt size={28} />
        </span>
        <p className="font-display text-lg font-bold">{t('entry.whatToMake')}</p>
        <div data-tour="add-garment">
          <AddGarmentButtons onAdd={add} className="justify-center" />
        </div>
        {errorText('items') && <p className="text-sm text-danger">{errorText('items')}</p>}
      </div>
    </div>
  );
  const tiles = items.length > 0 && (
    <GarmentTiles
      entry={entry}
      chosenKey={moneyChosen ? null : chosenKey}
      onChoose={choose}
      onAdd={add}
      status={statusLine}
      hasErrors={lineHasErrors}
    />
  );
  const lines = (
    <ul className="flex flex-col text-sm">
      {items.length === 0 && <li className="py-2 text-muted">{t('entry.noGarments')}</li>}
      {items.map((item) => (
        <li key={item.key} className="flex items-baseline justify-between gap-2 border-b border-dotted border-line py-2">
          <span>
            {title(item)}
            {item.quantity > 1 && <span className="text-muted"> × {number(item.quantity)}</span>}
          </span>
          <span className="font-semibold">{item.price === null ? '–' : money(item.price * item.quantity)}</span>
        </li>
      ))}
    </ul>
  );
  const moneySummary = `${t('money.advance')} ${money(entry.totals.advance)} · ${t('money.discount')} ${money(entry.totals.discount)}`;

  // Pinned at the foot of the receipt column in every variation: two totals, the checklist, save and discard.
  const Row = ({ ok, children, onClick }: { ok: boolean; children: ReactNode; onClick(): void }) => (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={ok}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm ${ok ? 'text-muted' : 'font-semibold hover:bg-surface'} ${FOCUS}`}
      >
        {ok ? <Check aria-hidden="true" size={16} className="shrink-0 text-ok" /> : <Circle aria-hidden="true" size={16} className="shrink-0 text-warn" />}
        <span className={ok ? 'line-through' : ''}>{children}</span>
      </button>
    </li>
  );
  const totalsBoxes = (
    <dl className="flex items-baseline justify-between gap-2 text-sm">
      <div className="flex items-baseline gap-1.5">
        <dt className="text-muted">{t('money.total')}</dt>
        <dd className="font-display text-lg font-bold">{money(entry.totals.total)}</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt className="text-muted">{t('entry.balanceLeft')}</dt>
        <dd className="font-display text-lg font-bold text-warn">{money(entry.totals.balance)}</dd>
      </div>
    </dl>
  );
  const foot = (
    <div className="flex flex-col gap-2 border-t border-line p-4">
      {totalsBoxes}
      {!ready.ready && !(variant === 'A1' && open === 'money') && (
        <div>
          <p className="px-2 text-xs font-semibold text-muted">{L('সেভ করার আগে বাকি', 'Still needed before saving')}</p>
          <ul>
            {!ready.customerOk && (
              <Row ok={false} onClick={focusCustomer}>
                {L('কাস্টমার বেছে নিন', 'Choose a customer')}
              </Row>
            )}
            {!ready.garmentsOk && (
              <Row ok={false} onClick={goToNextStep}>
                {L('অন্তত একটি পোশাক', 'At least one garment')}
              </Row>
            )}
            {ready.garmentsOk && !ready.measuresOk && (
              <Row ok={false} onClick={reveal}>
                {ready.short.map((s) => `${s.title}: ${t('entry.statusMissing', { n: number(s.n) })}`).join(', ')}
              </Row>
            )}
          </ul>
        </div>
      )}
      {problem && (
        <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
          {problem}
        </p>
      )}
      {ready.ready ? (
        <Button size="lg" disabled={entry.saving} onClick={() => void save()}>
          {entry.saving ? t('entry.saving') : t('entry.saveAndReceipt')}
        </Button>
      ) : (
        <Button size="lg" variant="secondary" onClick={goToNextStep}>
          {nextStep}
        </Button>
      )}
    </div>
  );
  const receiptTitle = <p className="border-b border-dashed border-line px-5 py-2 text-center font-display font-bold">{t('receipt.title')}</p>;

  // ---------------------------------------------------------------- the middle of the receipt column, per variation
  let column: ReactNode;
  let left: ReactNode = (
    <>
      {tiles}
      <div className="min-h-0 flex-1 overflow-auto p-5">{garmentBody}</div>
    </>
  );
  let columnWidth = 'w-80 xl:w-[340px]';

  if (variant === 'A1') {
    // Accordion: one of the two sections is open at a time, so the column never needs two scrolls.
    const Head = ({ id, label, sub }: { id: 'lines' | 'money'; label: string; sub: string }) => (
      <button
        type="button"
        aria-expanded={open === id}
        onClick={() => setOpen(id)}
        className={`flex w-full items-center justify-between gap-2 border-b border-line px-5 py-2.5 text-left hover:bg-surface ${FOCUS}`}
      >
        <span>
          <span className="block font-semibold">{label}</span>
          <span className="block text-xs text-muted">{sub}</span>
        </span>
        <ChevronDown aria-hidden="true" size={18} className={`text-muted transition-transform ${open === id ? 'rotate-180' : ''}`} />
      </button>
    );
    column = (
      <>
        <Head id="lines" label={t('entry.step.garments')} sub={`${number(items.length)} · ${money(entry.totals.subtotal)}`} />
        {open === 'lines' && <div className="min-h-0 flex-1 overflow-auto px-5">{lines}</div>}
        <Head id="money" label={t('entry.paymentRow')} sub={moneySummary} />
        {open === 'money' && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-3">
            {bits.advanceField}
            {bits.methodChips}
            {bits.referenceField}
            <div className="grid grid-cols-2 gap-2">
              {bits.discountField}
              {bits.reasonField}
            </div>
            {bits.notesField}
          </div>
        )}
      </>
    );
  } else if (variant === 'A2') {
    // Tabs: the receipt and the payment share the same space, switched at the top.
    column = (
      <>
        <div role="tablist" className="m-3 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
          {(['lines', 'money'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={open === id}
              onClick={() => setOpen(id)}
              className={`min-h-9 rounded-lg text-sm font-semibold ${open === id ? 'bg-panel text-ink shadow-sm' : 'text-muted'} ${FOCUS}`}
            >
              {id === 'lines' ? t('receipt.title') : L('টাকা ও নোট', 'Payment & note')}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="min-h-0 flex-1 overflow-auto px-5 pb-3">
          {open === 'lines' ? (
            <>
              {lines}
              <button type="button" onClick={() => setOpen('money')} className={`mt-2 text-sm text-muted hover:text-ink ${FOCUS}`}>
                {moneySummary} ›
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {bits.advanceField}
              {bits.methodChips}
              {bits.referenceField}
              <div className="grid grid-cols-2 gap-2">
                {bits.discountField}
                {bits.reasonField}
              </div>
              {bits.notesField}
            </div>
          )}
        </div>
      </>
    );
  } else if (variant === 'A3') {
    // Advance is the common case, so it is always there. Discount and note appear only when asked for.
    column = (
      <>
        {receiptTitle}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-2">
          {lines}
          <div className="flex flex-col gap-2 rounded-xl bg-surface/60 p-3">
            {bits.advanceField}
            {bits.methodChips}
            {bits.referenceField}
          </div>
          {extra.discount && (
            <div className="grid grid-cols-2 gap-2">
              {bits.discountField}
              {bits.reasonField}
            </div>
          )}
          {extra.notes && bits.notesField}
          {(!extra.discount || !extra.notes) && (
            <div className="flex gap-2">
              {!extra.discount && (
                <button
                  type="button"
                  onClick={() => setExtra((e) => ({ ...e, discount: true }))}
                  className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-strong hover:bg-surface ${FOCUS}`}
                >
                  <Plus aria-hidden="true" size={14} />
                  {t('money.discount')}
                </button>
              )}
              {!extra.notes && (
                <button
                  type="button"
                  onClick={() => setExtra((e) => ({ ...e, notes: true }))}
                  className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-strong hover:bg-surface ${FOCUS}`}
                >
                  <Plus aria-hidden="true" size={14} />
                  {L('নোট', 'Note')}
                </button>
              )}
            </div>
          )}
        </div>
      </>
    );
  } else if (variant === 'A4') {
    // Payment is one more tile beside the garments and is edited in the big panel, where there is room.
    const moneyTile = (
      <button
        type="button"
        aria-pressed={moneyChosen}
        onClick={() => setMoneyChosen(true)}
        className={`m-3 ms-0 flex min-w-44 items-center gap-3 rounded-xl px-3 py-2 text-start ring-inset ${moneyChosen ? 'bg-brand-soft ring-2 ring-brand' : 'bg-surface/60 ring-1 ring-line hover:bg-surface'} ${FOCUS}`}
      >
        <span aria-hidden="true" className={`grid size-9 place-items-center rounded-lg bg-panel ${moneyChosen ? 'text-brand-strong' : 'text-muted'}`}>
          <Wallet size={18} />
        </span>
        <span className="flex flex-col">
          <span className={`font-bold ${moneyChosen ? 'text-brand-strong' : ''}`}>{L('টাকা ও নোট', 'Payment & note')}</span>
          <span className="text-xs text-muted">{moneySummary}</span>
        </span>
      </button>
    );
    left = (
      <>
        {items.length > 0 && (
          <div className="flex items-stretch border-b border-line [&>div:first-child]:flex-1 [&>div:first-child]:border-b-0">
            {tiles}
            {moneyTile}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto p-5">
          {moneyChosen ? (
            <div className="flex max-w-2xl flex-col gap-5">
              <h3 className="font-display text-xl font-bold">{t('entry.paymentRow')}</h3>
              <div className="grid grid-cols-2 gap-4">
                {bits.advanceField}
                <div className="flex flex-col gap-2">
                  <span className="font-semibold">{t('payment.method')}</span>
                  {bits.methodChips}
                </div>
                {bits.referenceField}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {bits.discountField}
                {bits.reasonField}
              </div>
              {bits.notesField}
            </div>
          ) : (
            garmentBody
          )}
        </div>
      </>
    );
    column = (
      <>
        {receiptTitle}
        <div className="min-h-0 flex-1 overflow-auto px-5">
          {lines}
          <button type="button" onClick={() => setMoneyChosen(true)} className={`mt-2 text-sm text-muted hover:text-ink ${FOCUS}`}>
            {moneySummary} ›
          </button>
        </div>
      </>
    );
  } else {
    // A5: the garment tiles already show each price, so the column drops the lines and gives the space to payment.
    columnWidth = 'w-[400px] xl:w-[420px]';
    column = (
      <>
        <p className="border-b border-dashed border-line px-5 py-2 font-display font-bold">{t('entry.paymentRow')}</p>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              {bits.advanceField}
              {bits.methodChips}
              {bits.referenceField}
            </div>
            <div className="flex flex-col gap-2">
              {bits.discountField}
              {bits.reasonField}
            </div>
          </div>
          {bits.notesField}
        </div>
      </>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-3">
      <div ref={customerBox}>
        <CustomerBar entry={entry} errors={errors} heading={heading} />
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        <section className={`${CARD} min-w-0 flex-1`}>{left}</section>
        <section className={`${CARD} shrink-0 ${columnWidth}`}>
          {column}
          {foot}
        </section>
      </div>
      <Dialog
        open={confirmDiscard}
        title={t('entry.discardTitle')}
        onClose={() => setConfirmDiscard(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>
              {t('entry.discardKeep')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDiscard(false);
                entry.discard();
                onDiscarded();
              }}
            >
              {t('entry.discardYes')}
            </Button>
          </>
        }
      >
        <p>{t('entry.discardBody')}</p>
      </Dialog>
    </div>
  );
}

