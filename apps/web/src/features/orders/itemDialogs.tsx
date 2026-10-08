import { moneySummary, type EventBody, type ItemChanges, type Order, type OrderItem } from '@darzikhata/domain';
import { PackageCheck, Shirt, Wallet } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/NumberField';
import { SelectField } from '../../ui/SelectField';
import { TextAreaField } from '../../ui/TextAreaField';
import { TextField } from '../../ui/TextField';
import { useCan } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { problemText } from '../common/problemText';
import { stageMoves } from './stageMoves';
import { useShellKind } from '../../shell/ShellPreference';

export interface ItemDialogProps {
  order: Order;
  item: OrderItem;
  onClose(): void;
}

/** Saves one event; closes on success, otherwise keeps the dialog open and says why. */
export function useSave(onClose: () => void) {
  const store = useStore();
  const { language } = useI18n();
  const [problem, setProblem] = useState<string | null>(null);
  const busy = useRef(false);
  const [working, setWorking] = useState(false);

  const save = async (body: EventBody) => {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setProblem(null);
    try {
      const outcome = await store.dispatch(body);
      const text = problemText(outcome, language);
      if (text) setProblem(text);
      else onClose();
    } finally {
      busy.current = false;
      setWorking(false);
    }
  };
  return { problem, working, save };
}

interface ShellProps {
  title: string;
  onClose(): void;
  onSave(): void;
  working: boolean;
  problem: string | null;
  saveLabel?: string;
  children?: ReactNode;
}

/** The dialog frame: cancel and save buttons and the failure message. Not a form, so Enter saves nothing. */
export function Shell({ title, onClose, onSave, working, problem, saveLabel, children }: ShellProps) {
  const { t } = useI18n();
  return (
    <Dialog
      open
      title={title}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={working} onClick={onSave}>
            {saveLabel ?? t('common.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-ink">
        {children}
        {problem && (
          <p role="alert" className="text-danger">
            {problem}
          </p>
        )}
      </div>
    </Dialog>
  );
}

/** Asks before a garment goes to the customer, and says what the order still owes. */
export function HandOverDialog({ order, item, onClose }: ItemDialogProps) {
  const { t, language, money } = useI18n();
  const can = useCan();
  const { problem, working, save } = useSave(onClose);
  const target = stageMoves(item).find((m) => m.stage.group === 'delivered')?.stage.key;
  const balance = moneySummary(order).balance;
  const kind = useShellKind();
  const { state } = useSnapshot();
  const confirm = () => {
    if (target) void save({ type: 'item.stageChanged', orderId: order.id, itemId: item.id, to: target, reason: '' });
  };

  // On a desktop the garment speaks for itself: no visible title, the garment and customer, and any balance called out.
  if (kind === 'desktop') {
    const customer = state.customers[order.customerId];
    return (
      <Dialog
        open
        hideTitle
        title={t('item.handOverTitle')}
        onClose={onClose}
        actions={
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button disabled={working} onClick={confirm}>
              <PackageCheck size={18} aria-hidden="true" />
              {t('item.handOver')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-ink">
          <div className="flex items-center gap-3 rounded-xl border border-line p-3">
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
              <Shirt size={22} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold">{itemTitle(order, item, language)}</p>
              <p className="truncate text-sm text-muted">{[customer?.name, order.number].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          {can('money.view') && balance > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-warn-soft px-4 py-3 text-warn-ink ring-1 ring-warn-line ring-inset">
              <Wallet size={20} aria-hidden="true" />
              <span className="flex-1 text-sm font-semibold">{t('item.stillOwed')}</span>
              <span className="font-display text-xl font-bold">{money(balance)}</span>
            </div>
          )}
          {problem && (
            <p role="alert" className="text-danger">
              {problem}
            </p>
          )}
        </div>
      </Dialog>
    );
  }

  return (
    <Shell
      title={t('item.handOverTitle')}
      onClose={onClose}
      working={working}
      problem={problem}
      saveLabel={t('common.confirm')}
      onSave={confirm}
    >
      <p>{t('item.handOverBody', { item: itemTitle(order, item, language) })}</p>
      {can('money.view') && balance > 0 && <p className="font-semibold">{t('item.balanceDue', { amount: money(balance) })}</p>}
    </Shell>
  );
}

/** Moves a garment to any stage it may go to; going back needs a reason. */
export function ChangeStageDialog({ order, item, onClose }: ItemDialogProps) {
  const { t, label } = useI18n();
  const { problem, working, save } = useSave(onClose);
  const moves = stageMoves(item);
  const [to, setTo] = useState(() => (moves.find((m) => m.kind === 'forward') ?? moves[0])?.stage.key ?? '');
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const move = moves.find((m) => m.stage.key === to);
  const rework = move?.kind === 'rework';

  const submit = () => {
    if (!move) return;
    if (rework && !reason.trim()) {
      setMissing(true);
      return;
    }
    if (move.stage.group === 'delivered') {
      setConfirming(true);
      return;
    }
    void save({ type: 'item.stageChanged', orderId: order.id, itemId: item.id, to, reason: rework ? reason.trim() : '' });
  };

  if (confirming) return <HandOverDialog order={order} item={item} onClose={onClose} />;

  return (
    <Shell title={t('item.changeStage')} onClose={onClose} working={working} problem={problem} onSave={submit}>
      <SelectField
        label={t('item.newStage')}
        value={to}
        options={moves.map((m) => ({ value: m.stage.key, label: label(m.stage.label) }))}
        onChange={(value) => {
          setTo(value);
          setMissing(false);
        }}
      />
      {rework && (
        <TextAreaField
          label={t('item.reworkReason')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={missing ? t('item.reasonRequired') : undefined}
        />
      )}
    </Shell>
  );
}

/** A note about what to change at the fitting. The frozen measurements stay as they were. */
export function AdjustmentDialog({ order, item, onClose }: ItemDialogProps) {
  const { t } = useI18n();
  const { problem, working, save } = useSave(onClose);
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState(false);

  const submit = () => {
    if (!note.trim()) {
      setMissing(true);
      return;
    }
    void save({
      type: 'item.adjustmentAdded',
      orderId: order.id,
      itemId: item.id,
      adjustment: { id: crypto.randomUUID(), note: note.trim() },
    });
  };

  return (
    <Shell title={t('item.addAdjustment')} onClose={onClose} working={working} problem={problem} onSave={submit}>
      <TextAreaField
        label={t('item.adjustmentNote')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={missing ? t('item.reasonRequired') : undefined}
      />
    </Shell>
  );
}

/** Price, dates and notes. The edit carries the version this dialog opened with and only what changed. */
export function EditItemDialog({ order, item, onClose }: ItemDialogProps) {
  const { t } = useI18n();
  const can = useCan();
  const { problem, working, save } = useSave(onClose);
  const opened = useRef(item);
  const [price, setPrice] = useState<number | null>(item.price);
  const [trialDate, setTrialDate] = useState(item.trialDate ?? '');
  const [deliveryDate, setDeliveryDate] = useState(item.deliveryDate ?? '');
  const [designNotes, setDesignNotes] = useState(item.designNotes);
  const [fabricNote, setFabricNote] = useState(item.fabricNote);
  const [priceError, setPriceError] = useState(false);
  const showPrice = can('money.view');

  const submit = () => {
    const from = opened.current;
    const changes: ItemChanges = {};
    if (showPrice) {
      if (price === null) {
        setPriceError(true);
        return;
      }
      if (price !== from.price) changes.price = price;
    }
    if (trialDate !== (from.trialDate ?? '')) changes.trialDate = trialDate || null;
    if (deliveryDate !== (from.deliveryDate ?? '')) changes.deliveryDate = deliveryDate || null;
    if (designNotes !== from.designNotes) changes.designNotes = designNotes;
    if (fabricNote !== from.fabricNote) changes.fabricNote = fabricNote;
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    void save({ type: 'item.updated', orderId: order.id, itemId: item.id, baseVersion: from.version, changes });
  };

  return (
    <Shell title={t('item.edit')} onClose={onClose} working={working} problem={problem} onSave={submit}>
      {showPrice && (
        <NumberField
          label={t('item.price')}
          kind="money"
          initialValue={item.price}
          onValueChange={(value) => {
            setPrice(value);
            setPriceError(false);
          }}
          error={priceError ? t('input.invalidMoney') : undefined}
        />
      )}
      <TextField label={t('entry.trialDate')} type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} />
      <TextField
        label={t('entry.deliveryDate')}
        type="date"
        value={deliveryDate}
        onChange={(e) => setDeliveryDate(e.target.value)}
      />
      <TextAreaField label={t('entry.designNotes')} value={designNotes} onChange={(e) => setDesignNotes(e.target.value)} />
      <TextAreaField label={t('entry.fabricNote')} value={fabricNote} onChange={(e) => setFabricNote(e.target.value)} />
    </Shell>
  );
}

/** Takes a garment out of the order, with the reason. */
export function CancelItemDialog({ order, item, onClose }: ItemDialogProps) {
  const { t } = useI18n();
  const { problem, working, save } = useSave(onClose);
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);

  const submit = () => {
    if (!reason.trim()) {
      setMissing(true);
      return;
    }
    void save({ type: 'item.cancelled', orderId: order.id, itemId: item.id, reason: reason.trim() });
  };

  return (
    <Shell title={t('item.cancel')} onClose={onClose} working={working} problem={problem} onSave={submit}>
      <TextAreaField
        label={t('item.cancelReason')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={missing ? t('item.reasonRequired') : undefined}
      />
    </Shell>
  );
}
