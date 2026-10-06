import { profileKey, templateById } from '@darzikhata/domain';
import { AlertCircle, ArrowLeft, Shirt } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Dialog } from '../../ui/Dialog';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import type { DraftItem } from './draft';
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

interface Props {
  entry: OrderEntry;
  /** Called with the new order's id once it is saved. */
  onSaved(orderId: string): void;
  /** Called after the draft was thrown away on purpose. Defaults to going back to the orders list. */
  onDiscarded?(): void;
}

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const TONE = { warn: 'bg-warn-soft text-warn-ink', ok: 'bg-ok-soft text-ok' } as const;

function Card({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`${CARD} ${className}`}>
      <h2 className="sr-only">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Order entry on one screen, for a desktop: the customer in a bar across the top, the garments as tiles over the
 * chosen one's measurements and details, and a receipt beside them that fills in as you type, with the money and save.
 */
export function DesktopOrderForm({ entry, onSaved, onDiscarded }: Props) {
  const { t, money, number } = useI18n();
  const { config, state } = useSnapshot();
  const navigate = useNavigate();
  const title = useItemTitle(entry);
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

  const errors = showErrors ? entry.errors : {};
  const errorText = useErrorText(errors);
  const items = entry.draft.items;
  const chosen = items.find((i) => i.key === chosenKey) ?? null;
  const hasErrors = Object.keys(errors).length > 0;
  const lineHasErrors = (key: string) => Object.keys(errors).some((path) => path.startsWith(`items.${key}.`));
  const customerId = entry.draft.customer?.kind === 'existing' ? entry.draft.customer.customerId : null;

  const statusLine = (item: DraftItem): LineStatus | null => {
    const template = config ? templateById(config, item.templateId) : null;
    if (!template) return null;
    const m = item.measurements;
    // Saved values count only for people who may see them.
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

  // Counted from the same errors the fields show, so this line always agrees with them.
  const missing = missingCounts(errors, items);
  const missingText = items
    .filter((i) => missing[i.key])
    .map((i) => `${title(i)}: ${t('entry.statusMissing', { n: number(missing[i.key]!) })}`)
    .join(', ');

  // A newly added line becomes the chosen one in the same render, so typing never lands in the previous one.
  const add = (templateId: string) => {
    const key = entry.addItem(templateId);
    if (key) setChosenKey(key);
  };

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

  const chosenStatus = chosen ? statusLine(chosen) : null;

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-3">
      <CustomerBar
        entry={entry}
        errors={errors}
        heading={
          <div className="flex items-center gap-2">
            <Link
              to="/app/orders"
              aria-label={t('entry.backToOrders')}
              title={t('entry.backToOrders')}
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
            >
              <ArrowLeft aria-hidden="true" size={18} />
            </Link>
            <h1 ref={heading} tabIndex={-1} className="font-display text-xl font-bold outline-none">
              {t('nav.newOrder')}
            </h1>
          </div>
        }
      />
      <div className="flex min-h-0 flex-1 gap-4">
        <Card title={t('entry.step.garments')} className="min-w-0 flex-1">
          {items.length > 0 && (
            <GarmentTiles entry={entry} chosenKey={chosenKey} onChoose={setChosenKey} onAdd={add} status={statusLine} hasErrors={lineHasErrors} />
          )}
          <div className="min-h-0 flex-1 overflow-auto p-5">
            {chosen ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="me-auto flex flex-col items-start gap-1">
                    {chosenStatus && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[chosenStatus.tone]}`}>{chosenStatus.text}</span>
                    )}
                    <h3 className="font-display text-xl font-bold">{title(chosen)}</h3>
                  </div>
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
              </div>
            ) : (
              <div className="grid h-full place-items-center">
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
            )}
          </div>
        </Card>

        <Card title={t('entry.summary')} className="w-80 shrink-0 xl:w-[340px]">
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="flex flex-col gap-1 border-b border-dashed border-line px-5 py-4 text-center">
              <p className="text-xs font-semibold text-muted">{t('receipt.title')}</p>
              <p className="font-display text-lg font-bold">{t('nav.newOrder')}</p>
              <p className="text-xs text-muted">{t(entry.persists ? 'entry.newDraftNote' : 'entry.newOrderNote')}</p>
              {entry.restored && (
                <p role="status" className="text-xs text-muted">
                  {t('entry.draftRestored')}{' '}
                  <button
                    type="button"
                    onClick={entry.discard}
                    className="font-semibold text-brand-strong underline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    {t('entry.startFresh')}
                  </button>
                </p>
              )}
            </div>
            <ul className="flex flex-col px-5 py-2 text-sm">
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
            <div className="px-5 pt-2 pb-4">
              <MoneyFields entry={entry} errors={errors} />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line p-4">
            <DraftSummary totals={entry.totals} desktop />
            {(hasErrors || problem) && (
              <p role="alert" className="flex gap-2 rounded-lg border border-danger px-3 py-2 text-sm text-danger">
                <AlertCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                <span>
                  {problem ?? t('entry.fixErrors')}
                  {!problem && missingText && <span className="block">{missingText}</span>}
                </span>
              </p>
            )}
            <Button size="lg" data-tour="save-order" disabled={entry.saving} onClick={() => void save()}>
              {entry.saving ? t('entry.saving') : t('entry.saveAndReceipt')}
            </Button>
            <Button variant="ghost" className="text-muted" onClick={() => (entry.dirty ? setConfirmDiscard(true) : navigate('/app/orders'))}>
              {t('entry.discardDraft')}
            </Button>
          </div>
        </Card>
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
