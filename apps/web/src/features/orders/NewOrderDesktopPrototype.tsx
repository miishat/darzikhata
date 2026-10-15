// PROTOTYPE (throwaway): three desktop new-order layouts that fix
//   1. after one failed save, every garment added later opens with all its measurements in red;
//   2. two scroll areas side by side, and the receipt column is cramped at 800px height;
//   3. the save button looks ready before a customer is picked.
// All three show errors only for the garments that were on the order when save was pressed (fix 1). They differ in
// where the money fields go and how "not ready to save" is shown. Switch with ?variant=0|A|B|C on /app/orders/new.
import { profileKey, templateById } from '@darzikhata/domain';
import { ArrowLeft, Check, Circle, Pencil, Shirt, Trash2 } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import type { DraftErrors, DraftItem } from './draft';
import { CustomerBar } from './entry/CustomerBar';
import { DraftSummary } from './entry/DraftSummary';
import { AddGarmentButtons, GarmentTiles, type LineStatus } from './entry/GarmentTiles';
import { ItemDetails } from './entry/ItemDetails';
import { ItemHeader } from './entry/ItemHeader';
import { ItemMeasurements } from './entry/ItemMeasurements';
import { measureStatus, missingCounts } from './entry/measureStatus';
import { ItemSchedule, MoneyFields } from './entry/MoneyFields';
import { useErrorText, useItemTitle } from './entry/shared';
import { SourceSwitch } from './entry/SourceSwitch';
import type { OrderEntry } from './useOrderEntry';

export const NEW_ORDER_VARIANTS = {
  '0': 'Current',
  A: 'Checklist receipt, money in a dialog',
  B: 'One page scroll, sticky receipt, save locked with a reason',
  C: 'Full-width form, bottom save bar with steps',
} as const;

interface Props {
  variant: 'A' | 'B' | 'C';
  entry: OrderEntry;
  onSaved(orderId: string): void;
  onDiscarded(): void;
}

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const TONE = { warn: 'bg-warn-soft text-warn-ink', ok: 'bg-ok-soft text-ok' } as const;
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

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
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const customerBox = useRef<HTMLDivElement>(null);
  const ready = useReadiness(entry);

  const errors: DraftErrors = {};
  if (attempted) {
    for (const [path, code] of Object.entries(entry.errors)) {
      const m = /^items\.([^.]+)\./.exec(path);
      if (!m || attempted.has(m[1]!)) errors[path] = code;
    }
  }
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

  const add = (templateId: string) => {
    const key = entry.addItem(templateId);
    if (key) setChosenKey(key);
  };
  const focusCustomer = () => customerBox.current?.querySelector<HTMLInputElement>('input')?.focus();
  /** Show errors for the garments on the order now, and jump to the first one with a problem. */
  const reveal = () => {
    setAttempted(new Set(items.map((i) => i.key)));
    const first = items.find((i) => Object.keys(entry.errors).some((p) => p.startsWith(`items.${i.key}.`)));
    if (first) setChosenKey(first.key);
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

  /** The first thing still missing, as a short instruction, or null when the order can be saved. */
  const nextStep = !ready.customerOk
    ? L('আগে কাস্টমার বেছে নিন', 'Choose a customer first')
    : !ready.garmentsOk
      ? L('আগে পোশাক যোগ করুন', 'Add a garment first')
      : !ready.measuresOk
        ? L('মাপগুলো পূরণ করুন', 'Fill in the measurements')
        : !ready.otherOk
          ? L('ভুলগুলো ঠিক করুন', 'Fix the marked fields')
          : null;
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
    <GarmentTiles entry={entry} chosenKey={chosenKey} onChoose={setChosenKey} onAdd={add} status={statusLine} hasErrors={lineHasErrors} />
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
  const discardButton = (
    <Button variant="ghost" className="text-muted" onClick={() => (entry.dirty ? setConfirmDiscard(true) : navigate('/app/orders'))}>
      {t('entry.discardDraft')}
    </Button>
  );
  const problemLine = problem && (
    <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
      {problem}
    </p>
  );
  const moneySummary = `${t('money.advance')} ${money(entry.totals.advance)} · ${t('money.discount')} ${money(entry.totals.discount)}`;

  const dialogs = (
    <>
      <Dialog
        open={moneyOpen}
        title={t('entry.paymentRow')}
        onClose={() => setMoneyOpen(false)}
        actions={<Button onClick={() => setMoneyOpen(false)}>{L('ঠিক আছে', 'Done')}</Button>}
      >
        <div className="w-[min(28rem,80vw)] text-ink">
          <MoneyFields entry={entry} errors={errors} />
        </div>
      </Dialog>
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
    </>
  );

  // ---------------------------------------------------------------- A: checklist receipt
  if (variant === 'A') {
    const Row = ({ ok, children, onClick }: { ok: boolean; children: ReactNode; onClick(): void }) => (
      <li>
        <button
          type="button"
          onClick={onClick}
          disabled={ok}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${ok ? 'text-muted' : 'font-semibold hover:bg-surface'} ${FOCUS}`}
        >
          {ok ? <Check aria-hidden="true" size={16} className="text-ok" /> : <Circle aria-hidden="true" size={16} className="text-warn" />}
          <span className={ok ? 'line-through' : ''}>{children}</span>
        </button>
      </li>
    );
    return (
      <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-3">
        <div ref={customerBox}>
          <CustomerBar entry={entry} errors={errors} heading={heading} />
        </div>
        <div className="flex min-h-0 flex-1 gap-4">
          <section className={`${CARD} min-w-0 flex-1`}>
            {tiles}
            <div className="min-h-0 flex-1 overflow-auto p-5">{garmentBody}</div>
          </section>
          {/* No inner scroll: the money form moves to a dialog, so the column fits at 800px. */}
          <section className={`${CARD} w-80 shrink-0 xl:w-[340px]`}>
            <p className="border-b border-dashed border-line px-5 py-2 text-center font-display font-bold">{t('receipt.title')}</p>
            <div className="min-h-0 flex-1 overflow-auto px-5">{lines}</div>
            <div className="flex flex-col gap-2.5 border-t border-line p-4">
              <button
                type="button"
                onClick={() => setMoneyOpen(true)}
                className={`flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface ${FOCUS}`}
              >
                <span className="text-left">
                  <span className="block font-semibold">{t('entry.paymentRow')}</span>
                  <span className="block text-xs text-muted">{moneySummary}</span>
                </span>
                <Pencil aria-hidden="true" size={16} className="text-muted" />
              </button>
              {/* Two numbers instead of five rows: the full breakdown is on the receipt after saving. */}
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-surface px-3 py-2">
                  <dt className="text-xs text-muted">{t('money.total')}</dt>
                  <dd className="font-display text-lg font-bold">{money(entry.totals.total)}</dd>
                </div>
                <div className="rounded-lg bg-surface px-3 py-2">
                  <dt className="text-xs text-muted">{t('entry.balanceLeft')}</dt>
                  <dd className="font-display text-lg font-bold text-warn">{money(entry.totals.balance)}</dd>
                </div>
              </dl>
              <div>
                <p className="px-2 text-xs font-semibold text-muted">{L('সেভ করার আগে', 'Before saving')}</p>
                <ul className="mt-1">
                  <Row ok={ready.customerOk} onClick={focusCustomer}>
                    {L('কাস্টমার বেছে নিন', 'Choose a customer')}
                  </Row>
                  <Row ok={ready.garmentsOk} onClick={goToNextStep}>
                    {L('অন্তত একটি পোশাক', 'At least one garment')}
                  </Row>
                  {ready.garmentsOk && (
                    <Row ok={ready.measuresOk} onClick={reveal}>
                      {ready.measuresOk
                        ? L('সব মাপ দেওয়া', 'All measurements in')
                        : ready.short.map((s) => `${s.title}: ${t('entry.statusMissing', { n: number(s.n) })}`).join(', ')}
                    </Row>
                  )}
                </ul>
              </div>
              {problemLine}
              {ready.ready ? (
                <Button size="lg" disabled={entry.saving} onClick={() => void save()}>
                  {entry.saving ? t('entry.saving') : t('entry.saveAndReceipt')}
                </Button>
              ) : (
                <Button size="lg" variant="secondary" onClick={goToNextStep}>
                  {nextStep}
                </Button>
              )}
              {discardButton}
            </div>
          </section>
        </div>
        {dialogs}
      </div>
    );
  }

  // ---------------------------------------------------------------- B: one page scroll, sticky receipt
  if (variant === 'B') {
    return (
      <div className="flex flex-col gap-3">
        <div ref={customerBox}>
          <CustomerBar entry={entry} errors={errors} heading={heading} />
        </div>
        <div className="flex items-start gap-4">
          {/* The page scrolls as one. The money form is a normal section under the garment, not in the receipt. */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <section className={`${CARD} overflow-visible`}>
              {tiles}
              <div className="p-5">{garmentBody}</div>
            </section>
            <section className={`${CARD} overflow-visible p-5`}>
              <h2 className="mb-3 font-display text-lg font-bold">{t('entry.paymentRow')}</h2>
              <div className="max-w-xl">
                <MoneyFields entry={entry} errors={errors} />
              </div>
            </section>
          </div>
          <section className={`${CARD} sticky top-6 w-80 shrink-0 xl:w-[340px]`}>
            <div className="border-b border-dashed border-line px-5 py-3 text-center">
              <p className="font-display text-lg font-bold">{t('receipt.title')}</p>
            </div>
            <div className="px-5">{lines}</div>
            <div className="flex flex-col gap-3 p-4">
              <DraftSummary totals={entry.totals} desktop />
              {problemLine}
              <Button size="lg" disabled={!ready.ready || entry.saving} onClick={() => void save()}>
                {entry.saving ? t('entry.saving') : t('entry.saveAndReceipt')}
              </Button>
              {nextStep && (
                <p className="text-center text-sm text-muted">
                  {nextStep}.{' '}
                  <button type="button" onClick={goToNextStep} className={`font-semibold text-brand-strong underline ${FOCUS}`}>
                    {L('দেখান', 'Show me')}
                  </button>
                </p>
              )}
              {discardButton}
            </div>
          </section>
        </div>
        {dialogs}
      </div>
    );
  }

  // ---------------------------------------------------------------- C: full width, bottom save bar with steps
  const steps = [
    { ok: ready.customerOk, label: t('entry.step.customer'), go: focusCustomer },
    { ok: ready.garmentsOk, label: L('পোশাক', 'Garment'), go: goToNextStep },
    { ok: ready.garmentsOk && ready.measuresOk, label: L('মাপ', 'Measurements'), go: reveal },
  ];
  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-3">
      <div ref={customerBox}>
        <CustomerBar entry={entry} errors={errors} heading={heading} />
      </div>
      {/* One scroll area: the garment. No receipt column; its numbers live in the bar below. */}
      <section className={`${CARD} min-w-0 flex-1`}>
        {tiles}
        <div className="min-h-0 flex-1 overflow-auto p-5">{garmentBody}</div>
      </section>
      <section className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
        <ol className="flex items-center gap-1">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true" className="h-px w-4 bg-line" />}
              <button
                type="button"
                onClick={s.go}
                disabled={s.ok}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${s.ok ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn-ink hover:brightness-95'} ${FOCUS}`}
              >
                {s.ok ? <Check aria-hidden="true" size={14} /> : <span className="font-display">{number(i + 1)}</span>}
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        <dl className="flex items-center gap-5 text-sm">
          <div>
            <dt className="text-xs text-muted">{t('money.total')}</dt>
            <dd className="font-display text-lg font-bold">{money(entry.totals.total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('money.advance')}</dt>
            <dd className="flex items-center gap-1 font-display text-lg font-bold">
              {money(entry.totals.advance)}
              <button
                type="button"
                aria-label={t('entry.paymentRow')}
                title={t('entry.paymentRow')}
                onClick={() => setMoneyOpen(true)}
                className={`grid size-8 place-items-center rounded-lg text-brand-strong hover:bg-surface ${FOCUS}`}
              >
                <Pencil aria-hidden="true" size={15} />
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('entry.balanceLeft')}</dt>
            <dd className="font-display text-lg font-bold text-warn">{money(entry.totals.balance)}</dd>
          </div>
        </dl>
        <div className="ms-auto flex items-center gap-2">
          {problem && <span className="text-sm text-danger">{problem}</span>}
          {discardButton}
          <Button size="lg" disabled={!ready.ready || entry.saving} title={nextStep ?? undefined} onClick={() => void save()}>
            {entry.saving ? t('entry.saving') : t('entry.saveAndReceipt')}
          </Button>
        </div>
      </section>
      {dialogs}
    </div>
  );
}
