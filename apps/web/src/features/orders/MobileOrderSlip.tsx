import { ArrowLeft, ChevronRight, History, CircleAlert, MoreHorizontal, Plus, RotateCcw, Shirt, UserRound, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { ActionSheet, ActionSheetItem } from '../../ui/ActionSheet';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { HoldButton } from '../../ui/HoldButton';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { stepOf, type DraftErrors, type DraftItem } from './draft';
import { CustomerPicker } from './entry/CustomerPicker';
import { DraftSummary } from './entry/DraftSummary';
import { ItemDetails } from './entry/ItemDetails';
import { ItemHeader } from './entry/ItemHeader';
import { ItemMeasurements } from './entry/ItemMeasurements';
import { ItemMoney, MoneyFields } from './entry/MoneyFields';
import { SAVE_DOCK_SPACE, SaveDock } from './entry/SaveDock';
import { useErrorText, useItemTitle } from './entry/shared';
import type { OrderEntry } from './useOrderEntry';

interface Props {
  entry: OrderEntry;
  /** Called with the new order's id once it is saved. */
  onSaved(orderId: string): void;
}

type Tab = 'measure' | 'design' | 'price';
type Sheet = { kind: 'customer' } | { kind: 'add' } | { kind: 'payment' } | { kind: 'item'; key: string; tab: Tab } | null;

const ROW =
  'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus';

/** Where the sheet that holds the field an error path points at is, so a failed save can open it. */
export function sheetForError(path: string, items: DraftItem[]): Sheet {
  const area = stepOf(path);
  if (area === 'customer') return { kind: 'customer' };
  if (path === 'items') return { kind: 'add' };
  const key = /^items\.([^.]+)\./.exec(path)?.[1];
  const item = items.find((i) => i.key === key);
  if (item) return { kind: 'item', key: item.key, tab: area === 'garments' ? 'measure' : 'price' };
  return { kind: 'payment' };
}

/**
 * Order entry on a phone as a live order slip: the customer, one line per garment, the amounts and the payment, all on
 * one screen. Each part opens in a sheet to be edited; the save bar sits on the tab bar.
 */
export function MobileOrderSlip({ entry, onSaved }: Props) {
  const { t, money, number, date, label } = useI18n();
  const { state, config } = useSnapshot();
  const navigate = useNavigate();
  const title = useItemTitle(entry);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [restoredShown, setRestoredShown] = useState(true);
  const errors: DraftErrors = entry.attempted ? entry.errors : {};
  const errorText = useErrorText(errors);

  const { customer, items } = entry.draft;
  const customerName = customer?.kind === 'new' ? customer.name : customer ? (state.customers[customer.customerId]?.name ?? '') : '';
  const customerPhone = customer?.kind === 'new' ? customer.phone : customer ? (state.customers[customer.customerId]?.phone ?? '') : '';
  const item = sheet?.kind === 'item' ? items.find((i) => i.key === sheet.key) : undefined;
  const open = (next: Sheet) => {
    setRestoredShown(false);
    setSheet(next);
  };
  const close = () => setSheet(null);
  const closePayment = () => {
    if (!entry.draft.discount.unreadable && !entry.draft.advance.unreadable) close();
  };
  const hasError = (match: (path: string) => boolean) => Object.keys(errors).some(match);

  const leave = () => (window.history.length > 1 ? navigate(-1) : navigate('/app/orders'));

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
    const first = Object.keys(entry.errors)[0];
    if (first) setSheet(sheetForError(first, items));
    else setProblem(t('entry.saveFailed'));
  };

  return (
    <div className={`flex flex-col gap-4 ${SAVE_DOCK_SPACE}`}>
      <div className="-mt-2 flex items-center gap-1">
        <button
          type="button"
          aria-label={t('customerForm.back')}
          onClick={leave}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-muted focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft aria-hidden="true" size={20} />
        </button>
        <h1 className="min-w-0 flex-1 font-display text-xl font-bold">
          {t('nav.newOrder')}
          {/* Start over is in the menu beside it, so the badge only says why the slip is not empty. */}
          {entry.restored && restoredShown && (
            <span role="status" className="ms-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 align-middle text-xs font-semibold text-brand-strong">
              <History aria-hidden="true" size={12} />
              {t('entry.draftRestored')}
            </span>
          )}
        </h1>
        <ActionSheet label={t('nav.more')} icon={MoreHorizontal} title={t('nav.newOrder')}>
          {(done) => (
            <ActionSheetItem
              icon={RotateCcw}
              tone="warn"
              onClick={() => {
                done();
                entry.discard();
              }}
            >
              {t('entry.startFresh')}
            </ActionSheetItem>
          )}
        </ActionSheet>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
        <button type="button" data-tour="new-customer" className={`${ROW} border-b border-line`} onClick={() => open({ kind: 'customer' })}>
          <UserRound aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">{t('entry.step.customer')}</span>
            <span className="block truncate font-semibold">{customerName || '·'}</span>
            {customerPhone && <span className="block truncate text-sm text-muted">{customerPhone}</span>}
          </span>
          {hasError((p) => p.startsWith('customer')) ? (
            <CircleAlert aria-label={t('entry.fixErrors')} role="img" size={18} className="text-danger" />
          ) : (
            <ChevronRight aria-hidden="true" size={18} className="text-muted" />
          )}
        </button>

        <ul className="divide-y divide-line">
          {items.map((line) => {
            const bad = hasError((p) => p.startsWith(`items.${line.key}.`));
            return (
              <li key={line.key}>
                <button type="button" className={ROW} onClick={() => open({ kind: 'item', key: line.key, tab: 'measure' })}>
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
                    <Shirt size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {title(line)}
                      {line.quantity > 1 && <span className="font-normal text-muted">{` · ${t('entry.pieces', { n: number(line.quantity) })}`}</span>}
                    </span>
                    <span className="block truncate text-sm text-muted">{line.deliveryDate ? date(line.deliveryDate) : '·'}</span>
                  </span>
                  <span className="font-semibold">{line.price === null ? '' : money(line.price * line.quantity)}</span>
                  {bad ? (
                    <CircleAlert aria-label={t('entry.fixErrors')} role="img" size={18} className="text-danger" />
                  ) : (
                    <ChevronRight aria-hidden="true" size={18} className="text-muted" />
                  )}
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" data-tour="add-garment" className={`${ROW} text-brand-strong`} onClick={() => open({ kind: 'add' })}>
              <Plus aria-hidden="true" size={18} />
              <span className="font-semibold">{t('entry.addGarment')}</span>
            </button>
          </li>
        </ul>
        {errorText('items') && <p className="px-4 pb-3 text-sm text-danger">{errorText('items')}</p>}

        <div className="border-t border-line px-4 py-3">
          <DraftSummary totals={entry.totals} />
        </div>
        <button type="button" data-tour="advance" className={`${ROW} border-t border-line`} onClick={() => open({ kind: 'payment' })}>
          <Wallet aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
          <span className="min-w-0 flex-1 font-semibold">{t('entry.paymentRow')}</span>
          {hasError((p) => p.startsWith('discount') || p.startsWith('advance')) ? (
            <CircleAlert aria-label={t('entry.fixErrors')} role="img" size={18} className="text-danger" />
          ) : (
            <ChevronRight aria-hidden="true" size={18} className="text-muted" />
          )}
        </button>
      </div>

      {problem && (
        <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-danger">
          {problem}
        </p>
      )}
      <SaveDock totals={entry.totals} saving={entry.saving} onSave={() => void save()} />

      <Dialog open={sheet?.kind === 'customer'} title={t('entry.step.customer')} hideTitle onClose={close}>
        <div className="flex flex-col gap-3">
          <CustomerPicker entry={entry} errors={errors} />
          <Button onClick={close}>{t('work.done')}</Button>
        </div>
      </Dialog>

      <Dialog open={sheet?.kind === 'add'} title={t('entry.addGarment')} hideTitle onClose={close}>
        <div className="grid grid-cols-2 gap-2">
          {(config?.templates ?? [])
            .filter((tpl) => tpl.active)
            .map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  const key = entry.addItem(tpl.id);
                  setSheet(key ? { kind: 'item', key, tab: 'measure' } : null);
                }}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-panel px-3 text-start font-semibold focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
                  <Shirt size={18} />
                </span>
                <span className="min-w-0 flex-1">{label(tpl.name)}</span>
              </button>
            ))}
        </div>
      </Dialog>

      {/* The fields go when the sheet closes and take unreadable text with them, so it stays open until they read. */}
      <Dialog open={sheet?.kind === 'payment'} title={t('entry.paymentRow')} hideTitle onClose={closePayment}>
        <div className="flex flex-col gap-3">
          <MoneyFields entry={entry} errors={errors} />
          <Button onClick={closePayment}>{t('work.done')}</Button>
        </div>
      </Dialog>

      <Dialog open={Boolean(item)} title={item ? title(item) : ''} onClose={close}>
        {item && sheet?.kind === 'item' && (
          <ItemSheet
            key={item.key}
            entry={entry}
            item={item}
            errors={errors}
            tab={sheet.tab}
            onTab={(tab) => setSheet({ kind: 'item', key: item.key, tab })}
            onDone={close}
          />
        )}
      </Dialog>
    </div>
  );
}

/** One garment's quantity and measurements, design and photos, or price and dates, in tabs. */
function ItemSheet({
  entry,
  item,
  errors,
  tab,
  onTab,
  onDone,
}: {
  entry: OrderEntry;
  item: DraftItem;
  errors: DraftErrors;
  tab: Tab;
  onTab(tab: Tab): void;
  onDone(): void;
}) {
  const { t } = useI18n();
  const [keypadSpace, setKeypadSpace] = useState(0);
  const title = useItemTitle(entry);
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl<Tab>
        legend={title(item)}
        value={tab}
        onChange={onTab}
        options={[
          { value: 'measure', label: t('measure.section') },
          { value: 'design', label: t('print.designNotes') },
          { value: 'price', label: t('item.price') },
        ]}
      />
      {tab === 'measure' && (
        <div className="flex flex-col gap-3">
          <ItemHeader entry={entry} item={item} errors={errors} stepper />
          <ItemMeasurements entry={entry} item={item} errors={errors} tiles onDone={() => onTab('design')} onKeypadSpace={setKeypadSpace} />
        </div>
      )}
      {tab === 'design' && <ItemDetails entry={entry} item={item} />}
      {tab === 'price' && <ItemMoney entry={entry} item={item} errors={errors} />}
      {/* Remove sits apart from the quantity and needs a held press, so it is never mistaken for "× quantity" or hit by a stray tap. */}
      <div className="flex gap-2">
        <HoldButton
          label={t('entry.holdToRemove')}
          holdingLabel={t('entry.keepHolding')}
          accessibleLabel={t('entry.holdToRemoveItem', { item: title(item) })}
          onConfirm={() => entry.removeItem(item.key)}
          className="flex-1"
        />
        <Button onClick={onDone} className="flex-[1.3]">
          {t('work.done')}
        </Button>
      </div>
      {/* Room under the last button so it can be scrolled above the pinned keypad. */}
      {keypadSpace > 0 && <div aria-hidden="true" data-testid="keypad-space" style={{ height: keypadSpace }} />}
    </div>
  );
}
