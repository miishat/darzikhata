import { templateById, type Gender } from '@darzikhata/domain';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { addDays } from '../../lib/dates';
import { useMeasurementAccess, useToday } from '../common/hooks';
import { problemText } from '../common/problemText';
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
  setCustomer(customer: DraftCustomer | null): void;
  addItem(templateId: string): void;
  updateItem(key: string, changes: Partial<DraftItem>): void;
  removeItem(key: string): void;
  update(changes: Partial<Pick<OrderDraft, 'discount' | 'advance' | 'notes'>>): void;
  save(): Promise<SaveResult>;
}

const DELIVERY_DAYS = 7;

/** The order being entered, with its problems and totals, and the one save that writes it. */
export function useOrderEntry(): OrderEntry {
  const store = useStore();
  const { config, state } = useSnapshot();
  const { language } = useI18n();
  const today = useToday();
  const mayView = useMeasurementAccess();
  const [params] = useSearchParams();

  const [initial] = useState<OrderDraft>(() => {
    const snapshot = store.getSnapshot();
    const repeat = params.get('repeat');
    const order = repeat ? snapshot.state.orders[repeat] : undefined;
    if (order && snapshot.config) {
      const gender = snapshot.state.customers[order.customerId]?.gender ?? null;
      return draftFromOrder(order, {
        config: snapshot.config,
        state: snapshot.state,
        canSee: mayView({ gender }),
        newKey: store.createId,
        deliveryDate: addDays(today, DELIVERY_DAYS),
      });
    }
    const customerId = params.get('customer');
    if (customerId && snapshot.state.customers[customerId]) {
      return { ...emptyDraft(), customer: { kind: 'existing', customerId } };
    }
    return emptyDraft();
  });
  const [draft, setDraft] = useState<OrderDraft>(initial);
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
    ? validateDraft(draft, { config, state, today, canSeeMeasurements: (gender) => mayView({ gender }) })
    : {};
  const totals = useMemo(() => draftTotals(draft), [draft]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

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
      });
      const outcome = await store.dispatchBatch(events);
      if (outcome.ok) return { ok: true, orderId };
      return { ok: false, problem: problemText(outcome.outcome, language) };
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return { draft, errors, attempted, totals, dirty, canSeeMeasurements, saving, setCustomer, addItem, updateItem, removeItem, update, save };
}
