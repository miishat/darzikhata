// PROTOTYPE (throwaway): desktop new order layouts behind ?variant=. Lives on prototype/neworder-desktop only.
import { profileKey, searchCustomers, templateById } from '@darzikhata/domain';
import { AlertCircle, ArrowLeft, ArrowLeftRight, CalendarDays, ChevronsUpDown, ClipboardList, Plus, Search, Shirt, UserRound, UserRoundPlus, Wallet } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import { NumberField } from '../../ui/NumberField';
import { SelectField } from '../../ui/SelectField';
import { TextAreaField } from '../../ui/TextAreaField';
import { directoryRows } from '../customers/directoryView';
import { PhotoPicker } from './PhotoPicker';
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
  B: 'Garment tabs + receipt (as picked)',
  C: 'B + tiles, Change Customer button',
  D: 'B + tiles, customer card is the switch',
  E: 'B + tiles, Profile and Change links',
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

/** B (was C): customer strip on top, garments as tabs over one big editor, and a receipt on the right that fills in as you type. */
export function VariantB(props: Props) {
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

/* ---------- Variations of the picked layout (B) ---------- */

function AddMenu({ f, tone = 'link' }: { f: Form; tone?: 'link' | 'tile' }) {
  const { t, label } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={
          tone === 'tile'
            ? 'flex h-full min-h-14 items-center gap-2 rounded-xl border-2 border-dashed border-line px-4 text-sm font-semibold text-brand-strong hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus'
            : 'inline-flex min-h-9 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus'
        }
      >
        <Plus aria-hidden="true" size={16} />
        {t('entry.addGarment')}
      </button>
      {open && (
        <div className="absolute start-0 top-full z-30 mt-1 flex w-48 flex-col rounded-xl border border-line bg-panel-raised p-1 shadow-lg">
          {f.templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                f.add(tpl.id);
                setOpen(false);
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
  );
}

const DOT = { ok: 'bg-ok', warn: 'bg-warn', none: 'bg-line' } as const;

/** Garments as tiles: name, wearer, status and price, the chosen one outlined. */
function TileTabs({ f }: { f: Form }) {
  const { t, money } = useI18n();
  return (
    <div role="tablist" aria-label={t('entry.itemsHeading')} className="flex flex-wrap items-stretch gap-2 border-b border-line p-3">
      {f.items.map((item) => {
        const s = f.status(item);
        const on = item.key === f.chosenKey;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={on}
            onClick={() => f.setChosenKey(item.key)}
            className={`flex min-w-44 items-center gap-3 rounded-xl px-3 py-2 text-start ring-inset focus-visible:outline-2 focus-visible:outline-focus ${
              on ? 'bg-brand-soft ring-2 ring-brand' : 'bg-surface/60 ring-1 ring-line hover:bg-surface'
            }`}
          >
            <span className={`grid size-9 shrink-0 place-items-center rounded-lg bg-panel ${on ? 'text-brand-strong' : 'text-muted'}`}>
              <Shirt aria-hidden="true" size={18} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="flex items-baseline gap-2">
                <span className={`truncate font-bold ${on ? 'text-brand-strong' : ''}`}>{f.title(item)}</span>
                <span className="text-sm text-muted">{item.price === null ? '' : money(item.price * item.quantity)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden="true" className={`size-2 rounded-full ${DOT[s.tone]}`} />
                {s.text}
                {item.wearer && <span>· {item.wearer}</span>}
              </span>
            </span>
          </button>
        );
      })}
      <AddMenu f={f} tone="tile" />
    </div>
  );
}

/** Garments as rounded pills in a soft track, like the view switches elsewhere. */
function PillTabs({ f, trailing }: { f: Form; trailing?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
      <div role="tablist" aria-label={t('entry.itemsHeading')} className="flex flex-wrap gap-1 rounded-xl bg-surface p-1">
        {f.items.map((item) => {
          const s = f.status(item);
          const on = item.key === f.chosenKey;
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={on}
              onClick={() => f.setChosenKey(item.key)}
              className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
                on ? 'bg-panel font-bold text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              <span aria-hidden="true" className={`size-2 rounded-full ${DOT[s.tone]}`} />
              {f.title(item)}
            </button>
          );
        })}
      </div>
      <AddMenu f={f} />
      {trailing}
    </div>
  );
}

/** The editor in two columns: measurements on the left; wearer, dates, price, notes and photos on the right. */
function SplitEditor({ f, item }: { f: Form; item: DraftItem }) {
  const { t } = useI18n();
  const { entry, errors } = f;
  const errorText = useErrorText(errors);
  const at = `items.${item.key}`;
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-h-0 overflow-auto p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h2 className="me-auto font-display text-xl font-bold">{f.title(item)}</h2>
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
      </div>
      <div className="flex min-h-0 flex-col gap-3 overflow-auto border-s border-line bg-surface/40 p-5">
        <TextField label={t('entry.wearer')} value={item.wearer} onChange={(e) => entry.updateItem(item.key, { wearer: e.target.value })} autoComplete="off" />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t('entry.deliveryDate')}
            type="date"
            value={item.deliveryDate}
            onChange={(e) => entry.updateItem(item.key, { deliveryDate: e.target.value })}
            error={errorText(`${at}.deliveryDate`)}
          />
          <TextField
            label={t('entry.trialDate')}
            type="date"
            value={item.trialDate}
            onChange={(e) => entry.updateItem(item.key, { trialDate: e.target.value })}
            error={errorText(`${at}.trialDate`)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={t('entry.price')}
            kind="money"
            initialValue={item.price}
            onValueChange={(price) => entry.updateItem(item.key, { price })}
            error={errorText(`${at}.price`)}
          />
          {entry.canAssign && (
            <SelectField
              label={t('work.worker')}
              value={item.assignedTo ?? ''}
              onChange={(id) => entry.updateItem(item.key, { assignedTo: id === '' ? null : id })}
              options={[{ value: '', label: t('work.nobody') }, ...entry.workers.map((w) => ({ value: w.id, label: w.name }))]}
            />
          )}
        </div>
        <TextAreaField label={t('entry.designNotes')} value={item.designNotes} onChange={(e) => entry.updateItem(item.key, { designNotes: e.target.value })} />
        <TextField label={t('entry.fabricNote')} value={item.fabricNote} onChange={(e) => entry.updateItem(item.key, { fabricNote: e.target.value })} autoComplete="off" />
        <PhotoPicker photoIds={item.photoIds} onChange={(photoIds) => entry.updateItem(item.key, { photoIds })} />
      </div>
    </div>
  );
}

/** The receipt as in B, with the money fields passed in. */
function Receipt({ f, children }: { f: Form; children: ReactNode }) {
  const { t, money } = useI18n();
  return (
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
        <div className="px-5 pb-4">{children}</div>
      </div>
      <div className="flex flex-col gap-3 border-t border-line p-4">
        <DraftSummary totals={f.entry.totals} desktop />
        {f.alert}
        <SaveButtons f={f} />
      </div>
    </aside>
  );
}

/** Advance first, with the method as a switch; reference only for non-cash; discount and order notes only when asked for. */
function ShortMoney({ f }: { f: Form }) {
  const { t } = useI18n();
  const { entry, errors } = f;
  const errorText = useErrorText(errors);
  const { discount, advance, notes } = entry.draft;
  const [showDiscount, setShowDiscount] = useState(discount.amount !== null && discount.amount > 0);
  const [showNotes, setShowNotes] = useState(notes !== '');
  const methods = ['cash', 'bkash', 'nagad', 'bank'] as const;
  const link = 'inline-flex items-center gap-1 text-sm font-semibold text-brand-strong hover:underline';
  return (
    <div className="flex flex-col gap-3">
      <div data-tour="advance">
        <NumberField
          label={t('entry.advance')}
          kind="money"
          initialValue={advance.amount}
          onValueChange={(amount) => entry.update({ advance: { ...entry.draft.advance, amount } })}
          onInvalidChange={(bad) => entry.setUnreadable('advance', bad)}
          error={errorText('advance.amount')}
        />
      </div>
      <div role="group" aria-label={t('payment.method')} className="grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
        {methods.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={advance.method === m}
            onClick={() => entry.update({ advance: { ...entry.draft.advance, method: m } })}
            className={`min-h-9 rounded-lg text-sm ${advance.method === m ? 'bg-panel font-bold shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {t(`method.${m}`)}
          </button>
        ))}
      </div>
      {advance.method !== 'cash' && (
        <TextField
          label={t('payment.reference')}
          value={advance.reference}
          onChange={(e) => entry.update({ advance: { ...entry.draft.advance, reference: e.target.value } })}
          autoComplete="off"
        />
      )}
      {showDiscount && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t('entry.discount')}
            kind="money"
            initialValue={discount.amount}
            onValueChange={(amount) => entry.update({ discount: { ...entry.draft.discount, amount } })}
            onInvalidChange={(bad) => entry.setUnreadable('discount', bad)}
            error={errorText('discount.amount')}
          />
          <TextField
            label={f.L('কারণ', 'Reason')}
            value={discount.reason}
            onChange={(e) => entry.update({ discount: { ...entry.draft.discount, reason: e.target.value } })}
            autoComplete="off"
          />
        </div>
      )}
      {showNotes && <TextAreaField label={t('entry.notes')} value={notes} onChange={(e) => entry.update({ notes: e.target.value })} />}
      <div className="flex flex-wrap gap-4">
        {!showDiscount && (
          <button type="button" className={link} onClick={() => setShowDiscount(true)}>
            <Plus aria-hidden="true" size={14} />
            {f.L('ছাড় দিন', 'Add discount')}
          </button>
        )}
        {!showNotes && (
          <button type="button" className={link} onClick={() => setShowNotes(true)}>
            <Plus aria-hidden="true" size={14} />
            {f.L('অর্ডারের নোট', 'Order note')}
          </button>
        )}
      </div>
    </div>
  );
}

/** What the shop already knows about the chosen customer: what they owe, open orders, last visit. */
function CustomerFacts({ f }: { f: Form }) {
  const { money, number, date } = useI18n();
  const scoped = useScopedState();
  const customer = f.entry.draft.customer;
  if (customer?.kind !== 'existing') return null;
  const c = scoped.customers[customer.customerId];
  if (!c) return null;
  const [row] = directoryRows([c], Object.values(scoped.orders));
  if (!row) return null;
  const fact = (label: string, value: string, tone = '') => (
    <div className="flex flex-col rounded-xl bg-surface px-3 py-1.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-display font-bold ${tone}`}>{value}</span>
    </div>
  );
  return (
    <div className="ms-auto flex gap-2">
      {fact(f.L('আগের বাকি', 'Owes'), money(row.owed), row.owed > 0 ? 'text-warn' : 'text-ok')}
      {fact(f.L('চলমান অর্ডার', 'Open orders'), number(row.openCount))}
      {fact(f.L('শেষ এসেছেন', 'Last visit'), row.lastVisit ? date(row.lastVisit.slice(0, 10)) : '–')}
    </div>
  );
}

function TopStrip({ f, children }: { f: Form; children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <section aria-label={t('entry.step.customer')} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
      <Link to="/app/orders" aria-label={t('entry.backToOrders')} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
        <ArrowLeft aria-hidden="true" size={18} />
      </Link>
      <h1 className="font-display text-xl font-bold">{t('nav.newOrder')}</h1>
      <span className="h-8 w-px bg-line" />
      <CustomerStrip f={f} />
      {children}
    </section>
  );
}

/* ---------- Round 3: B with C's garment tiles and D's customer facts, three ways to change the customer ---------- */

/** Search results for picking a customer, shared by the menus below. */
function CustomerSearch({ f, onPicked, autoFocus = false }: { f: Form; onPicked(): void; autoFocus?: boolean }) {
  const { t } = useI18n();
  const { state } = useSnapshot();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => (query.trim() ? searchCustomers(Object.values(state.customers), query, 6) : []), [state.customers, query]);
  return (
    <div className="flex flex-col gap-2">
      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-panel px-3 focus-within:outline-2 focus-within:outline-focus">
        <Search aria-hidden="true" size={16} className="text-muted" />
        <input
          type="search"
          autoFocus={autoFocus}
          aria-label={t('customers.search')}
          placeholder={t('customers.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
      {query.trim() && matches.length === 0 && <p className="px-1 text-sm text-muted">{t('customers.none')}</p>}
      {matches.length > 0 && (
        <ul className="flex max-h-72 flex-col overflow-auto">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  f.entry.setCustomer({ kind: 'existing', customerId: m.id });
                  onPicked();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Avatar id={m.id} name={m.name} size="sm" />
                <span className="font-semibold">{m.name}</span>
                <span className="ms-auto text-sm text-muted">{m.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => {
          f.entry.setCustomer({ kind: 'new', name: '', nameAlt: '', phone: '', gender: null });
          onPicked();
        }}
        className="flex items-center gap-2 rounded-lg border-t border-line px-2 pt-3 pb-1 text-sm font-semibold text-brand-strong hover:underline"
      >
        <UserRoundPlus aria-hidden="true" size={16} />
        {t('customers.new')}
      </button>
    </div>
  );
}

/** A small popover anchored under its button; closes on Escape or when focus leaves. */
function Popover({ open, setOpen, button, children, width = 'w-96', align = 'start' }: { open: boolean; setOpen(v: boolean): void; button: ReactNode; children: ReactNode; width?: string; align?: 'start' | 'end' }) {
  return (
    <div
      className="relative"
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      {button}
      {open && (
        <div className={`absolute top-full z-40 mt-2 ${align === 'start' ? 'start-0' : 'end-0'} ${width} rounded-xl border border-line bg-panel-raised p-3 shadow-lg`}>{children}</div>
      )}
    </div>
  );
}

function useChosenCustomer(f: Form) {
  const { state } = useSnapshot();
  const scoped = useScopedState();
  const customer = f.entry.draft.customer;
  if (customer?.kind !== 'existing') return null;
  const c = state.customers[customer.customerId];
  if (!c) return null;
  const [row] = directoryRows([c], Object.values(scoped.orders));
  return row ?? null;
}

/** Facts as tiles with icons, like the payments page tiles. */
function FactTiles({ f }: { f: Form }) {
  const { money, number, date } = useI18n();
  const row = useChosenCustomer(f);
  if (!row) return null;
  const tile = (Icon: typeof Wallet, label: string, value: string, tone: string) => (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface/70 px-3 py-1.5">
      <span aria-hidden="true" className={`grid size-8 place-items-center rounded-lg ${tone}`}>
        <Icon size={16} />
      </span>
      <span className="flex flex-col">
        <span className="text-xs text-muted">{label}</span>
        <span className="font-display font-bold leading-tight">{value}</span>
      </span>
    </div>
  );
  return (
    <div className="ms-auto flex gap-2">
      {tile(Wallet, f.L('আগের বাকি', 'Owes'), money(row.owed), row.owed > 0 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok')}
      {tile(ClipboardList, f.L('চলমান অর্ডার', 'Open orders'), number(row.openCount), 'bg-brand-soft text-brand-strong')}
      {tile(CalendarDays, f.L('শেষ এসেছেন', 'Last visit'), row.lastVisit ? date(row.lastVisit.slice(0, 10)) : '–', 'bg-surface text-muted')}
    </div>
  );
}

function BarFrame({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section aria-label={t('entry.step.customer')} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
      <Link to="/app/orders" aria-label={t('entry.backToOrders')} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
        <ArrowLeft aria-hidden="true" size={18} />
      </Link>
      <h1 className="font-display text-xl font-bold">{t('nav.newOrder')}</h1>
      <span className="h-8 w-px bg-line" />
      {children}
    </section>
  );
}

/** C's bar: name and phone, a clear "Change Customer" button that opens a search menu, and D's facts on the right. */
function BarButton({ f }: { f: Form }) {
  const { t, number } = useI18n();
  const row = useChosenCustomer(f);
  const [open, setOpen] = useState(false);
  if (!row) return (<BarFrame><CustomerStrip f={f} /></BarFrame>);
  return (
    <BarFrame>
      <div className="flex items-center gap-3">
        <Avatar id={row.customer.id} name={row.customer.name} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-display text-lg font-bold leading-tight">{row.customer.name}</span>
          <span className="truncate text-sm text-muted">
            {row.customer.phone} · {t('entry.earlierOrders', { n: number(row.orderCount) })}
          </span>
        </div>
        <Popover
          open={open}
          setOpen={setOpen}
          button={
            <Button variant="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
              <ArrowLeftRight aria-hidden="true" size={16} />
              {f.L('কাস্টমার বদলান', 'Change Customer')}
            </Button>
          }
        >
          <CustomerSearch f={f} autoFocus onPicked={() => setOpen(false)} />
        </Popover>
      </div>
      <CustomerFacts f={f} />
    </BarFrame>
  );
}

/** D's bar: the customer itself is the switch: a card with a chevron that opens the search; facts as icon tiles. */
function BarCard({ f }: { f: Form }) {
  const { t, number } = useI18n();
  const row = useChosenCustomer(f);
  const [open, setOpen] = useState(false);
  if (!row) return (<BarFrame><CustomerStrip f={f} /></BarFrame>);
  return (
    <BarFrame>
      <Popover
        open={open}
        setOpen={setOpen}
        button={
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${row.customer.name} · ${f.L('কাস্টমার বদলান', 'Change Customer')}`}
            onClick={() => setOpen(!open)}
            className={`flex items-center gap-3 rounded-xl py-1.5 ps-1.5 pe-3 text-start ring-1 ring-inset focus-visible:outline-2 focus-visible:outline-focus ${
              open ? 'bg-brand-soft ring-brand' : 'ring-line hover:bg-surface'
            }`}
          >
            <Avatar id={row.customer.id} name={row.customer.name} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-display text-lg font-bold leading-tight">{row.customer.name}</span>
              <span className="truncate text-sm text-muted">
                {row.customer.phone} · {t('entry.earlierOrders', { n: number(row.orderCount) })}
              </span>
            </span>
            <ChevronsUpDown aria-hidden="true" size={18} className="ms-2 text-muted" />
          </button>
        }
      >
        <p className="mb-2 text-sm font-semibold text-muted">{f.L('অন্য কাস্টমার বেছে নিন', 'Pick another customer')}</p>
        <CustomerSearch f={f} autoFocus onPicked={() => setOpen(false)} />
      </Popover>
      <FactTiles f={f} />
    </BarFrame>
  );
}

/** E's bar: name with links to open their profile or change them, written out; facts as icon tiles. */
function BarLinks({ f }: { f: Form }) {
  const { number } = useI18n();
  const row = useChosenCustomer(f);
  const [open, setOpen] = useState(false);
  if (!row) return (<BarFrame><CustomerStrip f={f} /></BarFrame>);
  const action = 'inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus';
  return (
    <BarFrame>
      <div className="flex items-center gap-3">
        <Avatar id={row.customer.id} name={row.customer.name} size="lg" />
        <div className="flex min-w-0 flex-col">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-display text-lg font-bold leading-tight">{row.customer.name}</span>
            <span className="text-sm text-muted">{row.customer.phone}</span>
          </span>
          <span className="-ms-2 flex items-center gap-1">
            <Link to={`/app/customers/${row.customer.id}`} className={action}>
              <UserRound aria-hidden="true" size={15} />
              {f.L(`প্রোফাইল · ${number(row.orderCount)}টি অর্ডার`, `Profile · ${row.orderCount} orders`)}
            </Link>
            <Popover
              open={open}
              setOpen={setOpen}
              button={
                <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={action}>
                  <ArrowLeftRight aria-hidden="true" size={15} />
                  {f.L('কাস্টমার বদলান', 'Change Customer')}
                </button>
              }
            >
              <CustomerSearch f={f} autoFocus onPicked={() => setOpen(false)} />
            </Popover>
          </span>
        </div>
      </div>
      <FactTiles f={f} />
    </BarFrame>
  );
}

/** B's body with C's garment tiles: status pill, the editor, and the receipt with the full money fields. */
function TiledBody({ f }: { f: Form }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <section aria-label={t('entry.middle')} className={`${CARD} min-w-0 flex-1`}>
        <TileTabs f={f} />
        <div className="min-h-0 flex-1 overflow-auto p-5">{f.chosen ? <GarmentEditor f={f} item={f.chosen} /> : <EmptyGarment f={f} />}</div>
      </section>
      <Receipt f={f}>
        <MoneyFields entry={f.entry} errors={f.errors} />
      </Receipt>
    </div>
  );
}

/** C: B with garment tiles; the customer has a "Change Customer" button with a search menu, and what they owe beside. */
export function VariantC(props: Props) {
  const f = useForm(props);
  return (
    <div className={`flex flex-col gap-3 ${FULL}`}>
      <BarButton f={f} />
      <TiledBody f={f} />
      {f.discardDialog}
    </div>
  );
}

/** D: B with garment tiles; the customer card itself opens the switch, facts as icon tiles. */
export function VariantD(props: Props) {
  const f = useForm(props);
  return (
    <div className={`flex flex-col gap-3 ${FULL}`}>
      <BarCard f={f} />
      <TiledBody f={f} />
      {f.discardDialog}
    </div>
  );
}

/** E: B with garment tiles; Profile and Change Customer as links under the name, facts as icon tiles. */
export function VariantE(props: Props) {
  const f = useForm(props);
  return (
    <div className={`flex flex-col gap-3 ${FULL}`}>
      <BarLinks f={f} />
      <TiledBody f={f} />
      {f.discardDialog}
    </div>
  );
}
