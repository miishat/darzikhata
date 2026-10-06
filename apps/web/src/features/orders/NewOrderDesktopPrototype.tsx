// PROTOTYPE (throwaway): desktop new order layouts behind ?variant=. Lives on prototype/neworder-desktop only.
import { profileKey, searchCustomers, templateById } from '@darzikhata/domain';
import { AlertCircle, ArrowLeft, Check, ChevronLeft, ChevronRight, Plus, Search, Shirt, UserRound, Wallet } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import { useScopedState } from '../branches/BranchScopeProvider';
import type { DraftItem } from './draft';
import { CustomerPicker } from './entry/CustomerPicker';
import { DraftSummary } from './entry/DraftSummary';
import { ItemDetails } from './entry/ItemDetails';
import { ItemHeader } from './entry/ItemHeader';
import { ItemMeasurements } from './entry/ItemMeasurements';
import { measureStatus, missingCounts } from './entry/measureStatus';
import { ItemSchedule, MoneyFields } from './entry/MoneyFields';
import { useErrorText, useItemTitle } from './entry/shared';
import { SourceSwitch } from './entry/SourceSwitch';
import type { OrderEntry } from './useOrderEntry';

export const NEW_ORDER_VARIANTS = {
  A: 'Current three columns',
  B: 'Full-height cards',
  C: 'Garment tabs + receipt',
  D: 'Steps',
  E: 'One long page',
} as const;

interface Props {
  entry: OrderEntry;
  onSaved(orderId: string): void;
  onDiscarded(): void;
}

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const FULL = 'h-[calc(100dvh-6.5rem)] min-h-96';
const TONE = { warn: 'bg-warn-soft text-warn-ink', ok: 'bg-ok-soft text-ok', none: 'bg-surface text-muted' } as const;

/** Everything the layouts share: the chosen garment, errors, save and discard. */
function useForm({ entry, onSaved, onDiscarded }: Props) {
  const { t, number, language } = useI18n();
  const { config, state } = useSnapshot();
  const title = useItemTitle(entry);
  const [chosenKey, setChosenKey] = useState<string | null>(
    () => entry.draft.items.find((i) => i.measurements.kind === 'saved')?.key ?? entry.draft.items[0]?.key ?? null,
  );
  const [showErrors, setShowErrors] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const errors = showErrors ? entry.errors : {};
  const items = entry.draft.items;
  const chosen = items.find((i) => i.key === chosenKey) ?? null;
  const customerId = entry.draft.customer?.kind === 'existing' ? entry.draft.customer.customerId : null;
  const templates = (config?.templates ?? []).filter((tpl) => tpl.active);
  const L = (bn: string, en: string) => (language === 'bn' ? bn : en);

  const status = (item: DraftItem): { text: string; tone: keyof typeof TONE } => {
    const template = config ? templateById(config, item.templateId) : null;
    if (!template) return { text: '', tone: 'none' };
    const m = item.measurements;
    const saved =
      m.kind === 'saved' && customerId && entry.canSeeMeasurements
        ? (state.profiles[profileKey(customerId, template.id)]?.versions.find((v) => v.id === m.versionId) ?? null)
        : null;
    const s = measureStatus(template, item, saved);
    if (s.kind === 'missing') return { text: t('entry.statusMissing', { n: number(s.missing) }), tone: 'warn' };
    if (s.kind === 'confirm') return { text: t('entry.statusConfirm'), tone: 'warn' };
    if (s.kind === 'filled' && s.filled > 0) return { text: t('entry.statusFilled', { n: number(s.filled) }), tone: 'ok' };
    return { text: L('মাপ নেই', 'No measurements'), tone: 'none' };
  };
  const hasErrors = Object.keys(errors).length > 0;
  const lineHasErrors = (key: string) => Object.keys(errors).some((path) => path.startsWith(`items.${key}.`));
  const missing = missingCounts(errors, items);
  const missingText = items
    .filter((i) => missing[i.key])
    .map((i) => `${title(i)}: ${t('entry.statusMissing', { n: number(missing[i.key]!) })}`)
    .join(', ');

  const add = (templateId: string) => {
    const key = entry.addItem(templateId);
    if (key) setChosenKey(key);
  };

  const save = async () => {
    setProblem(null);
    const result = await entry.save();
    if (result.ok) return onSaved(result.orderId);
    if (result.problem) return setProblem(result.problem);
    const paths = Object.keys(entry.errors);
    if (paths.length > 0) {
      setShowErrors(true);
      const first = items.find((i) => paths.some((p) => p.startsWith(`items.${i.key}.`)));
      if (first) setChosenKey(first.key);
      return;
    }
    setProblem(t('entry.saveFailed'));
  };

  const alert =
    hasErrors || problem ? (
      <p role="alert" className="flex gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
        <AlertCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
        <span>
          {problem ?? t('entry.fixErrors')}
          {!problem && missingText && <span className="block">{missingText}</span>}
        </span>
      </p>
    ) : null;

  const discardDialog = (
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
  );
  const askDiscard = () => (entry.dirty ? setConfirmDiscard(true) : onDiscarded());

  return { entry, errors, items, chosen, chosenKey, setChosenKey, templates, status, lineHasErrors, add, save, alert, discardDialog, askDiscard, title, L };
}
type Form = ReturnType<typeof useForm>;

function StatusPill({ text, tone }: { text: string; tone: keyof typeof TONE }) {
  if (!text) return null;
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[tone]}`}>{text}</span>;
}

function AddChips({ f, className = '' }: { f: Form; className?: string }) {
  const { t, label } = useI18n();
  return (
    <div role="group" aria-label={t('entry.quickAddGroup')} data-tour="add-garment" className={`flex flex-wrap gap-2 ${className}`}>
      {f.templates.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          onClick={() => f.add(tpl.id)}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-line px-3 text-sm font-medium text-ink hover:border-brand hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Plus aria-hidden="true" size={14} />
          {label(tpl.name)}
        </button>
      ))}
    </div>
  );
}

/** The chosen garment: who wears it, quantity and source, then measurements, notes and photos, dates and price. */
function GarmentEditor({ f, item, heading = true }: { f: Form; item: DraftItem; heading?: boolean }) {
  const { t } = useI18n();
  const { entry, errors } = f;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        {heading && <h2 className="me-auto font-display text-xl font-bold">{f.title(item)}</h2>}
        <TextField
          label={t('entry.wearer')}
          className="w-56"
          value={item.wearer}
          onChange={(e) => entry.updateItem(item.key, { wearer: e.target.value })}
          autoComplete="off"
        />
        {item.measurements.kind === 'new' && (
          <SourceSwitch
            value={item.measurements.source}
            onChange={(source) => {
              const m = item.measurements;
              if (m.kind === 'new') entry.updateItem(item.key, { measurements: { ...m, source } });
            }}
          />
        )}
        <ItemHeader key={`${item.key}:header`} entry={entry} item={item} errors={errors} />
      </div>
      <ItemMeasurements key={`${item.key}:measurements`} entry={entry} item={item} errors={errors} />
      <ItemDetails key={`${item.key}:details`} entry={entry} item={item} desktop />
      <ItemSchedule key={`${item.key}:schedule`} entry={entry} item={item} errors={errors} />
    </div>
  );
}

/** Customer as one horizontal strip: search with results under it, the chosen one with a Change button, or the new customer fields. */
function CustomerStrip({ f }: { f: Form }) {
  const { t, number } = useI18n();
  const { state } = useSnapshot();
  const scoped = useScopedState();
  const [query, setQuery] = useState('');
  const errorText = useErrorText(f.errors);
  const customer = f.entry.draft.customer;
  const matches = useMemo(() => (query.trim() ? searchCustomers(Object.values(state.customers), query, 6) : []), [state.customers, query]);

  if (customer?.kind === 'existing') {
    const chosen = state.customers[customer.customerId];
    const orders = Object.values(scoped.orders).filter((o) => o.customerId === customer.customerId).length;
    return (
      <div className="flex items-center gap-3">
        {chosen && <Avatar id={chosen.id} name={chosen.name} />}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-display text-lg font-bold leading-tight">{chosen?.name}</span>
          <span className="truncate text-sm text-muted">
            {chosen?.phone} · {t('entry.earlierOrders', { n: number(orders) })}
          </span>
        </div>
        <Button variant="ghost" onClick={() => f.entry.setCustomer(null)}>
          {t('entry.changeCustomerShort')}
        </Button>
      </div>
    );
  }
  if (customer?.kind === 'new') {
    return (
      <div className="w-full max-w-3xl">
        <CustomerPicker entry={f.entry} errors={f.errors} />
      </div>
    );
  }
  return (
    <div className="relative flex w-full max-w-2xl items-start gap-2">
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-line bg-panel px-3 focus-within:outline-2 focus-within:outline-focus">
        <Search aria-hidden="true" size={16} className="text-muted" />
        <input
          type="search"
          aria-label={t('customers.search')}
          placeholder={t('customers.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
      <Button
        variant="secondary"
        data-tour="new-customer"
        onClick={() => f.entry.setCustomer({ kind: 'new', name: '', nameAlt: '', phone: '', gender: null })}
      >
        {t('customers.new')}
      </Button>
      {errorText('customer') && <p className="absolute top-full mt-1 text-sm text-danger">{errorText('customer')}</p>}
      {query.trim() && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 flex max-h-80 flex-col overflow-auto rounded-xl border border-line bg-panel-raised p-1 shadow-lg">
          {matches.length === 0 && <li className="px-3 py-2 text-muted">{t('customers.none')}</li>}
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => f.entry.setCustomer({ kind: 'existing', customerId: m.id })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Avatar id={m.id} name={m.name} size="sm" />
                <span className="font-semibold">{m.name}</span>
                <span className="text-sm text-muted">{m.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SaveButtons({ f, stacked = true }: { f: Form; stacked?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={stacked ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
      <Button size="lg" data-tour="save-order" disabled={f.entry.saving} onClick={() => void f.save()}>
        {f.entry.saving ? t('entry.saving') : t('entry.saveAndReceipt')}
      </Button>
      <Button variant="ghost" className="text-muted" onClick={f.askDiscard}>
        {t('entry.discardDraft')}
      </Button>
    </div>
  );
}

function PageHead({ f, children }: { f: Form; children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Link to="/app/orders" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus">
        <ArrowLeft aria-hidden="true" size={16} />
        {t('entry.backToOrders')}
      </Link>
      <h1 className="font-display text-xl font-bold">{t('nav.newOrder')}</h1>
      {f.entry.restored && (
        <span role="status" className="text-sm text-muted">
          {t('entry.draftRestored')}{' '}
          <button type="button" className="font-semibold text-brand-strong underline" onClick={f.entry.discard}>
            {t('entry.startFresh')}
          </button>
        </span>
      )}
      {children}
    </header>
  );
}

function GarmentRow({ f, item, compact = false }: { f: Form; item: DraftItem; compact?: boolean }) {
  const { money } = useI18n();
  const s = f.status(item);
  const on = item.key === f.chosenKey;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => f.setChosenKey(item.key)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start focus-visible:outline-2 focus-visible:outline-focus ${
        on ? 'bg-brand-soft text-brand-strong' : 'hover:bg-surface'
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${on ? 'bg-panel' : 'bg-surface'}`}>
        <Shirt aria-hidden="true" size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{f.title(item)}</span>
          {!compact && <span className="text-sm text-muted">{item.price === null ? '' : money(item.price * item.quantity)}</span>}
        </span>
        <span className="flex flex-wrap gap-1">
          <StatusPill {...s} />
          {f.lineHasErrors(item.key) && <StatusPill text="!" tone="warn" />}
        </span>
      </span>
    </button>
  );
}

/** B: the current three columns, as full-height cards that scroll inside, money and save pinned at the bottom right. */
export function VariantB(props: Props) {
  const f = useForm(props);
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <PageHead f={f} />
      <div className={`grid grid-cols-[300px_minmax(0,1fr)_320px] gap-4 h-[calc(100dvh-9rem)] min-h-96`}>
        <section aria-label={t('entry.left')} className={CARD}>
          <div className="border-b border-line p-4">
            <CustomerPicker entry={f.entry} errors={f.errors} card />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2">
            <h2 className="px-2 pt-1 text-sm font-semibold text-muted">{t('entry.itemsHeading')}</h2>
            {f.items.map((item) => (
              <GarmentRow key={item.key} f={f} item={item} />
            ))}
          </div>
          <div className="border-t border-line p-3">
            <AddChips f={f} />
          </div>
        </section>
        <section aria-label={t('entry.middle')} className={CARD}>
          <div className="min-h-0 flex-1 overflow-auto p-5">
            {f.chosen ? <GarmentEditor f={f} item={f.chosen} /> : <EmptyGarment f={f} />}
          </div>
        </section>
        <section aria-label={t('entry.summary')} className={CARD}>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <MoneyFields entry={f.entry} errors={f.errors} />
          </div>
          <div className="flex flex-col gap-3 border-t border-line bg-surface/50 p-4">
            <DraftSummary totals={f.entry.totals} desktop />
            {f.alert}
            <SaveButtons f={f} />
          </div>
        </section>
      </div>
      {f.discardDialog}
    </div>
  );
}

function EmptyGarment({ f }: { f: Form }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
          <Shirt aria-hidden="true" size={28} />
        </span>
        <p className="font-display text-lg font-bold">{f.L('কোন পোশাক বানাবেন?', 'What are we making?')}</p>
        <AddChips f={f} className="justify-center" />
      </div>
    </div>
  );
}

/** C: customer strip on top, garments as tabs over one big editor, and a receipt on the right that fills in as you type. */
export function VariantC(props: Props) {
  const f = useForm(props);
  const { t, money, label } = useI18n();
  const [adding, setAdding] = useState(false);
  return (
    <div className={`flex flex-col gap-3 ${FULL}`}>
      <section aria-label={t('entry.step.customer')} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
        <Link to="/app/orders" aria-label={t('entry.backToOrders')} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
          <ArrowLeft aria-hidden="true" size={18} />
        </Link>
        <h1 className="font-display text-xl font-bold">{t('nav.newOrder')}</h1>
        <span className="h-8 w-px bg-line" />
        <CustomerStrip f={f} />
      </section>
      <div className="flex min-h-0 flex-1 gap-4">
        <section aria-label={t('entry.middle')} className={`${CARD} min-w-0 flex-1`}>
          <div role="tablist" aria-label={t('entry.itemsHeading')} className="flex flex-wrap items-end gap-1 border-b border-line px-3 pt-3">
            {f.items.map((item) => {
              const s = f.status(item);
              const on = item.key === f.chosenKey;
              return (
                <button
                  key={item.key}
                  role="tab"
                  aria-selected={on}
                  onClick={() => f.setChosenKey(item.key)}
                  className={`-mb-px flex shrink-0 items-center gap-2 rounded-t-xl border px-4 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
                    on ? 'border-line border-b-panel bg-panel font-bold text-ink' : 'border-transparent text-muted hover:bg-surface hover:text-ink'
                  }`}
                >
                  <span aria-hidden="true" className={`size-2.5 rounded-full ${s.tone === 'ok' ? 'bg-ok' : s.tone === 'warn' ? 'bg-warn' : 'bg-line'}`} />
                  {f.title(item)}
                </button>
              );
            })}
            <div className="relative mb-1 ms-1">
              <button
                type="button"
                aria-expanded={adding}
                onClick={() => setAdding((v) => !v)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Plus aria-hidden="true" size={16} />
                {t('entry.addGarment')}
              </button>
              {adding && (
                <div className="absolute start-0 top-full z-20 mt-1 flex w-48 flex-col rounded-xl border border-line bg-panel-raised p-1 shadow-lg">
                  {f.templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        f.add(tpl.id);
                        setAdding(false);
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-start hover:bg-surface"
                    >
                      <Shirt aria-hidden="true" size={16} className="text-muted" />
                      {label(tpl.name)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">
            {f.chosen ? (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <StatusPill {...f.status(f.chosen)} />
                </div>
                <GarmentEditor f={f} item={f.chosen} />
              </>
            ) : (
              <EmptyGarment f={f} />
            )}
          </div>
        </section>
        <aside aria-label={t('entry.summary')} className={`${CARD} w-[340px] shrink-0`}>
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="border-b border-dashed border-line px-5 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{f.L('রসিদ', 'Receipt')}</p>
              <p className="font-display text-lg font-bold">{t('nav.newOrder')}</p>
            </div>
            <ul className="flex flex-col px-5 py-3">
              {f.items.length === 0 && <li className="py-2 text-sm text-muted">{f.L('এখনো কোনো পোশাক নেই', 'No garments yet')}</li>}
              {f.items.map((item) => (
                <li key={item.key} className="flex items-baseline justify-between gap-2 border-b border-dotted border-line py-2 text-sm">
                  <span>
                    {f.title(item)}
                    {item.quantity > 1 && <span className="text-muted"> × {item.quantity}</span>}
                  </span>
                  <span className="font-semibold">{item.price === null ? '–' : money(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-4">
              <MoneyFields entry={f.entry} errors={f.errors} />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line p-4">
            <DraftSummary totals={f.entry.totals} desktop />
            {f.alert}
            <SaveButtons f={f} />
          </div>
        </aside>
      </div>
      {f.discardDialog}
    </div>
  );
}

/** D: one card with steps down the side (customer, each garment, money); Back and Next at the bottom with the total always in view. */
export function VariantD(props: Props) {
  const f = useForm(props);
  const { t, money, number } = useI18n();
  const [step, setStep] = useState<string>(() => (props.entry.draft.customer ? (f.items[0]?.key ?? 'money') : 'customer'));
  const order = ['customer', ...f.items.map((i) => i.key), 'money'];
  // A garment just added becomes the step.
  const current = step !== 'customer' && step !== 'money' && !f.items.some((i) => i.key === step) ? 'money' : step;
  const at = order.indexOf(current);
  const go = (key: string) => {
    setStep(key);
    if (key !== 'customer' && key !== 'money') f.setChosenKey(key);
  };
  const item = f.items.find((i) => i.key === current) ?? null;
  const customer = f.entry.draft.customer;
  const { state } = useSnapshot();
  const customerName = customer?.kind === 'existing' ? state.customers[customer.customerId]?.name : customer?.kind === 'new' ? customer.name : '';
  const stepButton = (key: string, n: number, name: string, sub: ReactNode, done: boolean) => (
    <button
      key={key}
      type="button"
      aria-current={key === current ? 'step' : undefined}
      onClick={() => go(key)}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start focus-visible:outline-2 focus-visible:outline-focus ${
        key === current ? 'bg-brand-soft' : 'hover:bg-surface'
      }`}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
          done ? 'bg-ok text-white' : key === current ? 'bg-brand text-white' : 'bg-surface text-muted ring-1 ring-inset ring-line'
        }`}
      >
        {done ? <Check aria-hidden="true" size={16} /> : number(n)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={`truncate font-semibold ${key === current ? 'text-brand-strong' : ''}`}>{name}</span>
        <span className="truncate text-xs text-muted">{sub}</span>
      </span>
    </button>
  );
  return (
    <div className={`flex flex-col gap-3 ${FULL}`}>
      <PageHead f={f} />
      <section className={`${CARD} min-h-0 flex-1 flex-row`}>
        <nav aria-label={f.L('ধাপ', 'Steps')} className="flex w-72 shrink-0 flex-col gap-1 overflow-auto border-e border-line bg-surface/40 p-3">
          {stepButton('customer', 1, t('entry.step.customer'), customerName || f.L('বেছে নিন', 'Choose'), !!customerName)}
          {f.items.map((it, i) => {
            const s = f.status(it);
            return stepButton(it.key, i + 2, f.title(it), <StatusPill {...s} />, s.tone === 'ok')
          })}
          <div className="px-3 py-2">
            <AddChips f={{ ...f, add: (id) => { const key = f.entry.addItem(id); if (key) go(key); } }} />
          </div>
          {stepButton('money', f.items.length + 2, f.L('টাকা ও সেভ', 'Money and Save'), money(f.entry.totals.total), false)}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto p-6">
            <p className="mb-1 text-sm text-muted">{t('entry.stepOf', { n: number(at + 1), total: number(order.length) })}</p>
            {current === 'customer' && (
              <div className="flex max-w-xl flex-col gap-4">
                <h2 className="font-display text-2xl font-bold">{t('entry.step.customer')}</h2>
                <CustomerPicker entry={f.entry} errors={f.errors} card />
              </div>
            )}
            {item && <GarmentEditor f={f} item={item} />}
            {current === 'money' && (
              <div className="grid max-w-4xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-4">
                  <h2 className="font-display text-2xl font-bold">{f.L('টাকা ও সেভ', 'Money and Save')}</h2>
                  <MoneyFields entry={f.entry} errors={f.errors} />
                </div>
                <div className="flex flex-col gap-3 self-start rounded-xl bg-surface p-4">
                  <DraftSummary totals={f.entry.totals} desktop />
                  {f.alert}
                  <SaveButtons f={f} />
                </div>
              </div>
            )}
          </div>
          <footer className="flex items-center gap-3 border-t border-line px-6 py-3">
            <Button variant="secondary" disabled={at <= 0} onClick={() => go(order[at - 1]!)}>
              <ChevronLeft aria-hidden="true" size={16} />
              {t('entry.back')}
            </Button>
            <span className="ms-auto flex items-center gap-2 text-sm text-muted">
              <Wallet aria-hidden="true" size={16} />
              {t('money.total')} <strong className="font-display text-lg text-ink">{money(f.entry.totals.total)}</strong>
              <span className="mx-1">·</span>
              {t('entry.balanceLeft')} <strong className="font-display text-lg text-warn">{money(f.entry.totals.balance)}</strong>
            </span>
            {current === 'money' ? (
              <Button disabled={f.entry.saving} onClick={() => void f.save()}>
                {t('entry.save')}
              </Button>
            ) : (
              <Button onClick={() => go(order[at + 1]!)}>
                {t('entry.next')}
                <ChevronRight aria-hidden="true" size={16} />
              </Button>
            )}
          </footer>
        </div>
      </section>
      {f.discardDialog}
    </div>
  );
}

/** E: everything on one scrolling page, every garment open in its own card, with a summary card that stays in view. */
export function VariantE(props: Props) {
  const f = useForm(props);
  const { t, money } = useI18n();
  const id = useId();
  return (
    <div className={`flex gap-4 ${FULL}`}>
      <div className={`${CARD} min-w-0 flex-1`}>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-panel/95 px-6 py-4 backdrop-blur">
            <PageHead f={f} />
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted">
                <UserRound aria-hidden="true" size={18} />
              </span>
              <CustomerStrip f={f} />
            </div>
          </div>
          <div className="flex flex-col gap-4 p-6">
            {f.items.map((item) => (
              <section key={item.key} aria-labelledby={`${id}-${item.key}`} className="rounded-2xl border border-line">
                <div className="flex items-center gap-3 rounded-t-2xl border-b border-line bg-surface/60 px-5 py-3">
                  <Shirt aria-hidden="true" size={20} className="text-muted" />
                  <h2 id={`${id}-${item.key}`} className="font-display text-lg font-bold">
                    {f.title(item)}
                  </h2>
                  <StatusPill {...f.status(item)} />
                  <span className="ms-auto font-semibold">{item.price === null ? '' : money(item.price * item.quantity)}</span>
                </div>
                <div className="p-5" onFocusCapture={() => f.setChosenKey(item.key)}>
                  <GarmentEditor f={f} item={item} heading={false} />
                </div>
              </section>
            ))}
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line p-6">
              <p className="font-semibold text-muted">{f.items.length ? t('entry.addAnother') : f.L('কোন পোশাক বানাবেন?', 'What are we making?')}</p>
              <AddChips f={f} className="justify-center" />
            </div>
          </div>
        </div>
      </div>
      <aside aria-label={t('entry.summary')} className={`${CARD} w-[320px] shrink-0`}>
        <div className="flex flex-col gap-1 border-b border-line p-4">
          {f.items.map((item) => (
            <a
              key={item.key}
              href={`#${id}-${item.key}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`${id}-${item.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface"
            >
              <span className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${f.status(item).tone === 'ok' ? 'bg-ok' : f.status(item).tone === 'warn' ? 'bg-warn' : 'bg-line'}`} />
                {f.title(item)}
              </span>
              <span>{item.price === null ? '–' : money(item.price * item.quantity)}</span>
            </a>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <MoneyFields entry={f.entry} errors={f.errors} />
        </div>
        <div className="flex flex-col gap-3 border-t border-line p-4">
          <DraftSummary totals={f.entry.totals} desktop />
          {f.alert}
          <SaveButtons f={f} />
        </div>
      </aside>
      {f.discardDialog}
    </div>
  );
}
