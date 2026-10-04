import { templateById, type Gender } from '@darzikhata/domain';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { addDays } from '../../lib/dates';
import { useCan, useMeasurementAccess, useToday } from '../common/hooks';
import { problemText } from '../common/problemText';
import { assignees } from '../work/workList';
import {
  buildOrderEvents,
  draftFromOrder,
  draftTotals,
  emptyDraft,
  initialMeasurements,
  newDraftItem,
  validateDraft,
  type DraftCustomer,
  type DraftErrors,
  type DraftItem,
  type DraftTotals,
  type OrderDraft,
} from './draft';
import { clearDraft, draftKey, readDraft, restoreDraft, writeDraft } from './draftStorage';

export type SaveResult = { ok: true; orderId: string } | { ok: false; problem: string | null };

export interface OrderEntry {
  draft: OrderDraft;
  /** Every current problem, whether or not it is shown yet. */
  errors: DraftErrors;
  /** True after a save was attempted; layouts then show every error. */
  attempted: boolean;
  totals: DraftTotals;
  /** Something differs from the starting draft. */
  dirty: boolean;
  /** Whether the signed-in person may see the chosen customer's measurements. */
  canSeeMeasurements: boolean;
  saving: boolean;
  /** Active people the garments of this order can be given to, in this branch. */
  workers: Array<{ id: string; name: string }>;
  /** Whether the signed-in person may give garments to a worker. */
  canAssign: boolean;
  /** The draft was brought back from an earlier visit rather than started now. */
  /** Whether this entry owns the stored draft. False for ?repeat= and ?customer= starts. */
  persists: boolean;
  restored: boolean;
  /** Changes when the draft is replaced wholesale, so fields that keep their own text start over. */
  generation: number;
  /** Throws the draft away, here and in storage, and starts an empty one. */
  discard(): void;
  setCustomer(customer: DraftCustomer | null): void;
  addItem(templateId: string): void;
  updateItem(key: string, changes: Partial<DraftItem>): void;
  removeItem(key: string): void;
  update(changes: Partial<Pick<OrderDraft, 'discount' | 'advance' | 'notes'>>): void;
  /** Records whether the discount or advance field holds text that could not be read as an amount. */
  setUnreadable(field: 'discount' | 'advance', unreadable: boolean): void;
  save(): Promise<SaveResult>;
}

const DELIVERY_DAYS = 7;
/** How long the draft must stay unchanged before it is written to storage. */
export const DRAFT_SAVE_DELAY_MS = 500;

/** The order being entered, with its problems and totals, and the one save that writes it. */
export function useOrderEntry(): OrderEntry {
  const store = useStore();
  const { config, state } = useSnapshot();
  const { language } = useI18n();
  const today = useToday();
  const mayView = useMeasurementAccess();
  const can = useCan();
  const [params] = useSearchParams();
  const { kind } = useShell();
  // The phone's order form has no worker field, so it must not carry or save one from a desktop draft.
  const canAssign = can('work.assign') && kind !== 'mobile';
  const keepMeasurements = can('measurements.view.female');
  const session = store.getSnapshot().session;
  const device = config?.devices.find((d) => d.id === store.getSnapshot().deviceId);
  const branchId = device?.branchId ?? null;
  const storageKey = session?.staffId && branchId ? draftKey(session.shopKey, branchId, session.staffId) : null;
  const workers = useMemo(
    () => (config && branchId ? assignees(config, [branchId]).map((s) => ({ id: s.id, name: s.name })) : []),
    [config, branchId],
  );

  const [start] = useState<{ base: OrderDraft; kept: OrderDraft | null; plain: boolean; sanitised: boolean }>(() => {
    const snapshot = store.getSnapshot();
    const repeat = params.get('repeat');
    const order = repeat ? snapshot.state.orders[repeat] : undefined;
    if (order && snapshot.config) {
      const gender = snapshot.state.customers[order.customerId]?.gender ?? null;
      const base = draftFromOrder(order, {
        config: snapshot.config,
        state: snapshot.state,
        canSee: mayView({ gender }),
        newKey: store.createId,
        deliveryDate: addDays(today, DELIVERY_DAYS),
      });
      return { base, kept: null, plain: false, sanitised: false };
    }
    const customerId = params.get('customer');
    if (customerId && snapshot.state.customers[customerId]) {
      return { base: { ...emptyDraft(), customer: { kind: 'existing', customerId } }, kept: null, plain: false, sanitised: false };
    }
    // Plain "new order": bring back what was being typed before, if anything.
    const base = emptyDraft();
    const stored = storageKey ? readDraft(storageKey) : null;
    if (!stored || !snapshot.config) return { base, kept: null, plain: true, sanitised: false };
    const kept = restoreDraft(stored, {
      config: snapshot.config,
      state: snapshot.state,
      keepMeasurements,
      workers: canAssign ? workers.map((w) => w.id) : [],
    });
    return { base, kept: JSON.stringify(kept) === JSON.stringify(base) ? null : kept, plain: true, sanitised: !keepMeasurements };
  });
  const initial = start.base;
  // Only a plain new order owns the stored draft. One started from ?repeat= or ?customer= leaves it alone.
  const persistKey = start.plain ? storageKey : null;
  const [draft, setDraft] = useState<OrderDraft>(start.kept ?? start.base);
  const [restored, setRestored] = useState(start.kept !== null);
  const [generation, setGeneration] = useState(0);
  const firstDraft = useRef(draft);
  const stopSaving = useRef(false);
  const latest = useRef({ draft, keepMeasurements, storageKey: persistKey });
  latest.current = { draft, keepMeasurements, storageKey: persistKey };
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const genderOf = (customer: DraftCustomer | null): Gender | null => {
    if (!customer) return null;
    if (customer.kind === 'new') return customer.gender;
    return state.customers[customer.customerId]?.gender ?? null;
  };
  const canSeeMeasurements = mayView({ gender: genderOf(draft.customer) });

  const errors: DraftErrors = config
    ? validateDraft(draft, {
        config,
        state,
        today,
        canSeeMeasurements: (gender) => mayView({ gender }),
        canAssign,
        ...(branchId ? { branchId } : {}),
      })
    : {};
  const totals = useMemo(() => draftTotals(draft), [draft]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  // Keep the draft in this browser a moment after the last change, and once more on the way out.
  const persist = () => {
    const { draft: current, keepMeasurements: keep, storageKey: key } = latest.current;
    if (!key || stopSaving.current || current === firstDraft.current) return;
    if (JSON.stringify(current) === JSON.stringify(initial)) clearDraft(key);
    else writeDraft(key, current, { keepMeasurements: keep });
  };
  useEffect(() => {
    const timer = setTimeout(persist, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  // A draft restored without values this person may not see is rewritten at once, not on the next edit.
  useEffect(() => {
    if (!start.sanitised || !persistKey) return;
    if (start.kept) writeDraft(persistKey, start.kept, { keepMeasurements });
    else clearDraft(persistKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => persist, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Closing the tab runs no unmount, so write what is pending when the page is hidden or leaves.
  useEffect(() => {
    const onHide = () => persist();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const discard = () => {
    // The unmount write must not bring the old draft back, whatever order React commits in.
    latest.current = { ...latest.current, draft: initial };
    if (persistKey) clearDraft(persistKey);
    setDraft(initial);
    setAttempted(false);
    setRestored(false);
    setGeneration((n) => n + 1);
  };

  const setCustomer = (customer: DraftCustomer | null) => {
    const customerId = customer?.kind === 'existing' ? customer.customerId : null;
    const canSee = mayView({ gender: genderOf(customer) });
    setDraft((d) => ({
      ...d,
      customer,
      items: d.items.map((item) => {
        const m = item.measurements;
        if (m.kind === 'new' && Object.keys(m.values).length > 0) return item;
        const template = config ? templateById(config, item.templateId) : null;
        if (!template) return item;
        return { ...item, measurements: initialMeasurements(template, customerId, state, canSee) };
      }),
    }));
  };

  const addItem = (templateId: string) => {
    const template = config ? templateById(config, templateId) : null;
    if (!template) return;
    const customerId = draft.customer?.kind === 'existing' ? draft.customer.customerId : null;
    const item = newDraftItem(template, store.createId(), {
      customerId,
      state,
      canSee: canSeeMeasurements,
      deliveryDate: addDays(today, DELIVERY_DAYS),
    });
    setDraft((d) => ({ ...d, items: [...d.items, item] }));
  };

  const updateItem = (key: string, changes: Partial<DraftItem>) =>
    setDraft((d) => ({ ...d, items: d.items.map((i) => (i.key === key ? { ...i, ...changes } : i)) }));

  const removeItem = (key: string) => setDraft((d) => ({ ...d, items: d.items.filter((i) => i.key !== key) }));

  const update = (changes: Partial<Pick<OrderDraft, 'discount' | 'advance' | 'notes'>>) =>
    setDraft((d) => ({ ...d, ...changes }));

  const setUnreadable = (field: 'discount' | 'advance', unreadable: boolean) =>
    setDraft((d) => {
      if (Boolean(d[field].unreadable) === unreadable) return d;
      const { unreadable: _old, ...rest } = d[field];
      return { ...d, [field]: unreadable ? { ...rest, unreadable } : rest };
    });

  const save = async (): Promise<SaveResult> => {
    if (inFlight.current) return { ok: false, problem: null };
    const snapshot = store.getSnapshot();
    if (!snapshot.config || !snapshot.session?.staffId) return { ok: false, problem: null };
    if (Object.keys(errors).length > 0) {
      setAttempted(true);
      return { ok: false, problem: null };
    }
    const device = snapshot.config.devices.find((d) => d.id === snapshot.deviceId);
    if (!device) return { ok: false, problem: null };

    inFlight.current = true;
    setSaving(true);
    try {
      const { orderId, events } = buildOrderEvents(draft, {
        config: snapshot.config,
        state: snapshot.state,
        newId: store.createId,
        number: store.nextOrderNumber(),
        branchId: device.branchId,
        staffId: snapshot.session.staffId,
        now: new Date().toISOString(),
        canAssign,
      });
      const outcome = await store.dispatchBatch(events);
      if (outcome.ok) {
        stopSaving.current = true;
        if (persistKey) clearDraft(persistKey);
        return { ok: true, orderId };
      }
      return { ok: false, problem: problemText(outcome.outcome, language) };
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return { persists: persistKey !== null, draft, errors, attempted, totals, dirty, canSeeMeasurements, saving, workers, canAssign, restored, generation, discard, setCustomer, addItem, updateItem, removeItem, update, setUnreadable, save };
}
