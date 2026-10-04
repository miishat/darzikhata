import { profileKey, templateById } from '@darzikhata/domain';
import { ArrowLeft, Shirt } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Dialog } from '../../ui/Dialog';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
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

interface Props {
  entry: OrderEntry;
  /** Called with the new order's id once it is saved. */
  onSaved(orderId: string): void;
  /** Called after the draft was thrown away on purpose. Defaults to going back to the orders list. */
  onDiscarded?(): void;
}

function Column({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`flex min-w-0 flex-col gap-4 rounded-lg border border-line bg-panel p-4 ${className}`}>
      <h2 className="sr-only">{title}</h2>
      {children}
    </section>
  );
}

/** Order entry on one screen, for a desktop: customer and garments, the chosen garment's details, and the money. */
export function DesktopOrderForm({ entry, onSaved, onDiscarded }: Props) {
  const { t, label, money, number } = useI18n();
  const { config, state } = useSnapshot();
  const navigate = useNavigate();
  const title = useItemTitle(entry);
  const statusId = useId();
  const [chosenKey, setChosenKey] = useState<string | null>(
    () => entry.draft.items.find((i) => i.measurements.kind === 'saved')?.key ?? entry.draft.items[0]?.key ?? null,
  );
  const [showErrors, setShowErrors] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // Starting over replaces this whole form, so the button that was pressed is gone: land on the title.
  useEffect(() => {
    if (entry.generation > 0) heading.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const templates = (config?.templates ?? []).filter((tpl) => tpl.active);

  const errors = showErrors ? entry.errors : {};
  const errorText = useErrorText(errors);
  const items = entry.draft.items;
  const chosen = items.find((i) => i.key === chosenKey) ?? null;
  const hasErrors = Object.keys(errors).length > 0;
  const lineHasErrors = (key: string) => Object.keys(errors).some((path) => path.startsWith(`items.${key}.`));
  const customerId = entry.draft.customer?.kind === 'existing' ? entry.draft.customer.customerId : null;

  // A newly added line becomes the chosen one.
  const count = useRef(items.length);
  useEffect(() => {
    if (items.length > count.current) setChosenKey(items[items.length - 1]!.key);
    count.current = items.length;
  }, [items]);

  const statusLine = (item: DraftItem): { text: string; tone: string } | null => {
    const template = config ? templateById(config, item.templateId) : null;
    if (!template) return null;
    const m = item.measurements;
    // Saved values count only for people who may see them.
    const saved =
      m.kind === 'saved' && customerId && entry.canSeeMeasurements
        ? (state.profiles[profileKey(customerId, template.id)]?.versions.find((v) => v.id === m.versionId) ?? null)
        : null;
    const status = measureStatus(template, item, saved);
    if (status.kind === 'missing') return { text: t('entry.statusMissing', { n: number(status.missing) }), tone: 'text-warn-ink' };
    if (status.kind === 'confirm') return { text: t('entry.statusConfirm'), tone: 'text-warn-ink' };
    if (status.kind === 'filled' && status.filled > 0) return { text: t('entry.statusFilled', { n: number(status.filled) }), tone: 'text-ok' };
    return null;
  };

  // Counted from the same errors the fields show, so this line always agrees with them.
  const missing = missingCounts(errors, items);
  const missingText = items
    .filter((i) => missing[i.key])
    .map((i) => `${title(i)}: ${t('entry.statusMissing', { n: number(missing[i.key]!) })}`)
    .join(', ');

  const save = async () => {
    setProblem(null);
    const result = await entry.save();
    if (result.ok) {
      onSaved(result.orderId);
      return;
    }
    if (result.problem) {
      setProblem(result.problem);
      return;
    }
    const paths = Object.keys(entry.errors);
    if (paths.length > 0) {
      setShowErrors(true);
      const first = items.find((i) => paths.some((p) => p.startsWith(`items.${i.key}.`)));
      if (first) setChosenKey(first.key);
      return;
    }
    setProblem(t('entry.saveFailed'));
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          to="/app/orders"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          {t('entry.backToOrders')}
        </Link>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          {t('nav.newOrder')}
        </h1>
        <p className="text-sm text-muted">{t(entry.persists ? 'entry.newDraftNote' : 'entry.newOrderNote')}</p>
      </header>
      {entry.restored && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
          {t('entry.draftRestored')}
          <Button variant="ghost" onClick={entry.discard}>
            {t('entry.startFresh')}
          </Button>
        </p>
      )}
      <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <Column title={t('entry.left')} className="col-start-1 row-start-1">
          <CustomerPicker entry={entry} errors={errors} card />
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">{t('entry.itemsHeading')}</h3>
            {items.length > 0 && (
              <ul className="flex flex-col gap-2">
                {items.map((item) => {
                  const status = statusLine(item);
                  const selected = item.key === chosenKey;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={title(item)}
                        aria-describedby={`${statusId}-${item.key}`}
                        className={`flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                          selected ? 'border-2 border-brand bg-surface' : 'border-line'
                        }`}
                        onClick={() => setChosenKey(item.key)}
                      >
                        <Shirt aria-hidden="true" size={20} className="shrink-0 text-muted" />
                        <span id={`${statusId}-${item.key}`} className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-semibold">{title(item)}</span>
                            <span className="text-sm text-muted">{item.price === null ? '' : money(item.price * item.quantity)}</span>
                          </span>
                          {status && <span className={`text-xs font-semibold ${status.tone}`}>{status.text}</span>}
                          {lineHasErrors(item.key) && <span className="text-xs text-danger">{t('entry.itemHasErrors')}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div role="group" aria-label={t('entry.quickAddGroup')} data-tour="add-garment" className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className="min-h-9 rounded-lg border border-dashed border-line px-3 text-sm text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  onClick={() => entry.addItem(tpl.id)}
                >
                  {t('entry.quickAdd', { item: label(tpl.name) })}
                </button>
              ))}
            </div>
            {errorText('items') && <p className="text-sm text-danger">{errorText('items')}</p>}
          </div>
        </Column>

        <Column title={t('entry.middle')} className="col-start-2 row-span-2 row-start-1 xl:row-span-1">
          {chosen ? (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <h3 className="mr-auto text-lg font-semibold">{title(chosen)}</h3>
                <TextField
                  label={t('entry.wearer')}
                  className="w-56"
                  value={chosen.wearer}
                  onChange={(e) => entry.updateItem(chosen.key, { wearer: e.target.value })}
                  autoComplete="off"
                />
                {chosen.measurements.kind === 'new' && (
                  <SourceSwitch
                    value={chosen.measurements.source}
                    onChange={(source) => {
                      const m = chosen.measurements;
                      if (m.kind === 'new') entry.updateItem(chosen.key, { measurements: { ...m, source } });
                    }}
                  />
                )}
                <ItemHeader key={`${chosen.key}:header`} entry={entry} item={chosen} errors={errors} />
              </div>
              <ItemMeasurements key={`${chosen.key}:measurements`} entry={entry} item={chosen} errors={errors} />
              <ItemDetails key={`${chosen.key}:details`} entry={entry} item={chosen} desktop />
              <ItemSchedule key={`${chosen.key}:schedule`} entry={entry} item={chosen} errors={errors} />
            </>
          ) : (
            <p className="text-muted">{t('entry.chooseItem')}</p>
          )}
        </Column>

        <Column title={t('entry.summary')} className="sticky top-4 col-start-1 row-start-2 xl:col-start-3 xl:row-start-1">
          {items.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {items.map((item) => (
                <li key={item.key} className="flex justify-between gap-2">
                  <span>{title(item)}</span>
                  <span>{item.price === null ? '–' : money(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
          <MoneyFields entry={entry} errors={errors} />
          <DraftSummary totals={entry.totals} desktop />
          {(hasErrors || problem) && (
            <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
              {problem ?? t('entry.fixErrors')}
              {!problem && missingText && <span className="block">{missingText}</span>}
            </p>
          )}
          <Button size="lg" data-tour="save-order" disabled={entry.saving} onClick={() => void save()}>
            {entry.saving ? t('entry.saving') : t('entry.saveAndReceipt')}
          </Button>
          <Button variant="ghost" className="text-muted" onClick={() => (entry.dirty ? setConfirmDiscard(true) : navigate('/app/orders'))}>
            {t('entry.discardDraft')}
          </Button>
        </Column>
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
                (onDiscarded ?? (() => navigate('/app/orders')))();
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
