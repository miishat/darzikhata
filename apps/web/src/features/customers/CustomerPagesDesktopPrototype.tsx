// PROTOTYPE (throwaway): desktop layouts for the customer form and the measurement page, switched with ?variant=.
import {
  currentVersion,
  formatMeasurement,
  missingRequiredFields,
  parseMeasurement,
  profileKey,
  staffById,
  type Customer,
  type GarmentTemplate,
  type Gender,
  type MeasurementSource,
  type MeasurementValue,
  type MeasurementVersion,
} from '@darzikhata/domain';
import { ArrowLeft, CalendarDays, ClipboardList, History, Ruler, Shirt, UsersRound, Wallet, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useCurrentStaff, useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { SelectField } from '../../ui/SelectField';
import { TextAreaField } from '../../ui/TextAreaField';
import { TextField } from '../../ui/TextField';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan } from '../common/hooks';
import { problemText } from '../common/problemText';
import {
  customerEvents,
  customerInputFrom,
  emptyCustomerInput,
  NEW_HOUSEHOLD,
  rebaseCustomerInput,
  validateCustomerInput,
  type CustomerInput,
  type CustomerInputErrors,
} from './customerInput';
import { directoryRows } from './directoryView';
import { changedFromPrevious, deltaText, fieldGroups, groupLabel } from './measurementView';
import { useMeasurementTemplates } from './MobileMeasurements';

export const CUSTOMER_FORM_VARIANTS = {
  A: 'Current form',
  B: 'Form + live profile preview',
  C: 'Settings rows, household tiles',
  D: 'Details bar + measure next',
} as const;

export const MEASURE_VARIANTS = {
  A: 'Current form',
  B: 'Table: before | new | change',
  C: 'Big tiles + side panel',
  D: 'History grid, copy a version',
} as const;

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const PAGE = 'h-[calc(100dvh-6.5rem)] min-h-96';

function useVariantSearch() {
  const [params] = useSearchParams();
  const v = params.get('variant');
  return v ? `?variant=${v}` : '';
}

function PageHead({ back, title, sub }: { back: string; title: string; sub?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <Link
        to={back}
        aria-label={t('common.cancel')}
        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
      >
        <ArrowLeft aria-hidden="true" size={18} />
      </Link>
      <div className="flex flex-col">
        <h1 className="font-display text-xl font-bold leading-tight">{title}</h1>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2">
      <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon size={16} />
      </span>
      <span className="flex flex-col">
        <span className="text-xs text-muted">{label}</span>
        <span className="font-display font-bold leading-tight">{value}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Customer form
// ---------------------------------------------------------------------------------------------------------------

function useCustomerForm(customer: Customer | null) {
  const { t, language } = useI18n();
  const store = useStore();
  const { state } = useSnapshot();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<CustomerInput>(() => (customer ? customerInputFrom(customer) : emptyCustomerInput()));
  const [baseVersion, setBaseVersion] = useState<number | null>(() => customer?.version ?? null);
  const [input, setInput] = useState<CustomerInput>(initial);
  const [errors, setErrors] = useState<CustomerInputErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(input) !== JSON.stringify(initial);
  const { dialog, allowNextNavigation } = useUnsavedGuard(dirty);
  const backTo = customer ? `/app/customers/${customer.id}` : '/app/customers';
  const set = <K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) => setInput((c) => ({ ...c, [key]: value }));
  const households = Object.values(state.households).sort((a, b) => a.label.localeCompare(b.label));
  const members = (householdId: string | null) =>
    householdId ? Object.values(state.customers).filter((c) => c.householdId === householdId && c.id !== customer?.id) : [];
  const genderOptions: Array<{ value: Gender; label: string }> = [
    { value: 'male', label: t('gender.male') },
    { value: 'female', label: t('gender.female') },
    { value: 'other', label: t('gender.other') },
  ];
  const errorText = (kind: 'name' | 'phone' | 'household', key: keyof CustomerInputErrors) =>
    errors[key] ? t(`customerForm.error.${kind}`) : undefined;

  async function save(then?: (customerId: string) => string) {
    if (saving) return;
    const found = validateCustomerInput(input);
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length > 0) return;
    const { customerId, events } = customerEvents(input, { existing: customer, start: initial, baseVersion, newId: () => store.createId() });
    if (events.length > 0) {
      setSaving(true);
      const outcome = await store.dispatchBatch(events);
      setSaving(false);
      if (!outcome.ok) {
        const current = customer ? store.getSnapshot().state.customers[customer.id] : undefined;
        if (outcome.outcome.kind === 'conflict' && current) {
          const rebased = rebaseCustomerInput(input, initial, current);
          setInitial(rebased.start);
          setInput(rebased.input);
          setBaseVersion(current.version);
          setProblem(t('customerForm.conflict'));
          return;
        }
        setProblem(problemText(outcome.outcome, language));
        return;
      }
    }
    allowNextNavigation();
    navigate(then ? then(customerId) : `/app/customers/${customerId}`);
  }

  return { customer, input, set, errors, errorText, problem, saving, save, dirty, dialog, backTo, households, members, genderOptions };
}

type CustomerFormState = ReturnType<typeof useCustomerForm>;

function NameFields({ f }: { f: CustomerFormState }) {
  const { t } = useI18n();
  return (
    <>
      <TextField label={t('customerForm.name')} value={f.input.name} onChange={(e) => f.set('name', e.target.value)} error={f.errorText('name', 'name')} autoComplete="off" />
      <TextField label={t('customerForm.nameAlt')} value={f.input.nameAlt} onChange={(e) => f.set('nameAlt', e.target.value)} autoComplete="off" />
    </>
  );
}

function PhoneField({ f, className }: { f: CustomerFormState; className?: string }) {
  const { t } = useI18n();
  return (
    <TextField
      label={t('customerForm.phone')}
      className={className}
      value={f.input.phone}
      onChange={(e) => f.set('phone', e.target.value)}
      error={f.errorText('phone', 'phone')}
      type="tel"
      inputMode="tel"
      autoComplete="off"
    />
  );
}

function GenderField({ f }: { f: CustomerFormState }) {
  const { t } = useI18n();
  return <ChoiceGroup legend={t('customerForm.gender')} value={f.input.gender} options={f.genderOptions} onChange={(g) => f.set('gender', g)} />;
}

function HouseholdSelect({ f }: { f: CustomerFormState }) {
  const { t } = useI18n();
  const options = [
    { value: '', label: t('customerForm.noHousehold') },
    ...f.households.map((h) => ({ value: h.id, label: h.label })),
    { value: NEW_HOUSEHOLD, label: t('customerForm.newHousehold') },
  ];
  return (
    <>
      <SelectField label={t('customerForm.household')} value={f.input.householdId ?? ''} options={options} onChange={(v) => f.set('householdId', v === '' ? null : v)} />
      {f.input.householdId === NEW_HOUSEHOLD && (
        <TextField
          label={t('customerForm.householdName')}
          value={f.input.newHousehold}
          onChange={(e) => f.set('newHousehold', e.target.value)}
          error={f.errorText('household', 'newHousehold')}
          autoComplete="off"
        />
      )}
    </>
  );
}

function Footer({ f, children }: { f: CustomerFormState; children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 border-t border-line px-5 py-3">
      {f.problem ? (
        <p role="alert" className="me-auto text-sm text-danger">
          {f.problem}
        </p>
      ) : (
        <p className="me-auto text-sm text-muted">{f.dirty ? 'পরিবর্তন এখনো সেভ হয়নি' : f.customer ? 'কোনো পরিবর্তন নেই' : ''}</p>
      )}
      {children}
      <Link to={f.backTo} className={buttonClasses('secondary', 'lg')}>
        {t('common.cancel')}
      </Link>
      <Button type="submit" size="lg" disabled={f.saving}>
        {t('common.save')}
      </Button>
    </div>
  );
}

function Section({ title, children, cols = 2 }: { title: string; children: ReactNode; cols?: 1 | 2 }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-xs font-bold tracking-wide text-muted uppercase">{title}</legend>
      <div className={cols === 2 ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}>{children}</div>
    </fieldset>
  );
}

function useCustomerFacts(customer: Customer | null) {
  const scoped = useScopedState();
  return useMemo(() => (customer ? directoryRows([customer], Object.values(scoped.orders))[0] : undefined), [customer, scoped.orders]);
}

function MeasuredGarments({ customerId }: { customerId: string }) {
  const { label, date } = useI18n();
  const { state } = useSnapshot();
  const templates = useMeasurementTemplates();
  return (
    <ul className="flex flex-col">
      {templates.map((tpl) => {
        const profile = state.profiles[profileKey(customerId, tpl.id)];
        const v = profile ? currentVersion(profile) : null;
        return (
          <li key={tpl.id} className="flex items-center gap-2 border-b border-dotted border-line py-2 text-sm">
            <Shirt aria-hidden="true" size={15} className="text-muted" />
            <span className="me-auto">{label(tpl.name)}</span>
            <span className={v ? 'text-ink' : 'text-muted'}>{v ? date(v.takenAt.slice(0, 10)) : 'নেওয়া হয়নি'}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** B: the form in sections on the left, and on the right a live preview of the profile as it will look. */
export function CustomerVariantB({ customer }: { customer: Customer | null }) {
  const { t, money, number, date } = useI18n();
  const can = useCan();
  const f = useCustomerForm(customer);
  const row = useCustomerFacts(customer);
  const household = f.input.householdId && f.input.householdId !== NEW_HOUSEHOLD ? f.households.find((h) => h.id === f.input.householdId) : null;
  const householdName = f.input.householdId === NEW_HOUSEHOLD ? f.input.newHousehold : household?.label;
  const others = f.members(household?.id ?? null);
  const gender = f.genderOptions.find((g) => g.value === f.input.gender)?.label;
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void f.save();
      }}
      className={`flex gap-4 ${PAGE}`}
    >
      <section className={`${CARD} min-w-0 flex-1`}>
        <div className="border-b border-line px-5 py-4">
          <PageHead back={f.backTo} title={customer ? t('customerForm.editTitle') : t('customerForm.newTitle')} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-auto px-6 py-5">
          <Section title="নাম">
            <NameFields f={f} />
          </Section>
          <Section title="যোগাযোগ">
            <PhoneField f={f} />
            <GenderField f={f} />
          </Section>
          <Section title="পরিবার">
            <HouseholdSelect f={f} />
          </Section>
          <Section title="নোট" cols={1}>
            <TextAreaField label={t('customerForm.notes')} value={f.input.notes} onChange={(e) => f.set('notes', e.target.value)} />
          </Section>
        </div>
        <Footer f={f} />
      </section>
      <aside aria-label="প্রিভিউ" className={`${CARD} w-[340px] shrink-0`}>
        <div className="flex flex-col items-center gap-2 border-b border-line bg-surface/60 px-5 py-6 text-center">
          <p className="text-xs font-semibold text-muted">প্রোফাইলে যেভাবে দেখাবে</p>
          <Avatar id={customer?.id ?? 'new'} name={f.input.name || '?'} size="xl" />
          <p className={`font-display text-xl font-bold ${f.input.name ? '' : 'text-muted'}`}>{f.input.name || 'নাম লিখুন'}</p>
          {f.input.nameAlt && <p className="-mt-1 text-sm text-muted">{f.input.nameAlt}</p>}
          <p className="text-sm">{f.input.phone || <span className="text-muted">ফোন নেই</span>}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {gender && <span className="rounded-full bg-panel px-2.5 py-0.5 text-xs font-semibold ring-1 ring-line">{gender}</span>}
            {householdName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
                <UsersRound aria-hidden="true" size={12} />
                {householdName}
              </span>
            )}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-5 py-4">
          {others.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-muted">একই পরিবারে</p>
              {others.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <Avatar id={m.id} name={m.name} size="sm" />
                  <span className="truncate">{m.name}</span>
                </div>
              ))}
            </div>
          )}
          {customer && row ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Fact icon={ClipboardList} label="অর্ডার" value={number(row.orderCount)} tone="bg-brand-soft text-brand-strong" />
                <Fact icon={ClipboardList} label={t('entry.fact.open')} value={number(row.openCount)} tone="bg-brand-soft text-brand-strong" />
                {can('money.view') && (
                  <Fact icon={Wallet} label="বাকি" value={money(row.owed)} tone={row.owed > 0 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'} />
                )}
                <Fact icon={CalendarDays} label={t('entry.fact.lastVisit')} value={row.lastVisit ? date(row.lastVisit.slice(0, 10)) : '–'} tone="bg-panel text-muted" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-bold text-muted">মাপ</p>
                <MeasuredGarments customerId={customer.id} />
              </div>
            </>
          ) : (
            <p className="rounded-xl bg-surface p-3 text-sm text-muted">সেভ করার পর এই কাস্টমারের মাপ নেওয়া আর অর্ডার দেওয়া যাবে।</p>
          )}
        </div>
      </aside>
      {f.dialog}
    </form>
  );
}

function Row({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[220px_1fr] gap-8 px-7 py-5">
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{title}</p>
        {help && <p className="text-sm text-muted">{help}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </div>
  );
}

/** C: one centred card of settings-style rows (what it is on the left, the field on the right); households as tiles. */
export function CustomerVariantC({ customer }: { customer: Customer | null }) {
  const { t } = useI18n();
  const f = useCustomerForm(customer);
  const [filter, setFilter] = useState('');
  const shown = f.households.filter((h) => h.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const tile = (on: boolean) =>
    `flex min-h-14 flex-col items-start justify-center rounded-xl px-3 py-2 text-start ring-inset focus-visible:outline-2 focus-visible:outline-focus ${
      on ? 'bg-brand-soft ring-2 ring-brand' : 'ring-1 ring-line hover:bg-surface'
    }`;
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void f.save();
      }}
      className={`mx-auto w-full max-w-4xl ${CARD} ${PAGE}`}
    >
      <div className="border-b border-line px-5 py-4">
        <PageHead
          back={f.backTo}
          title={customer ? t('customerForm.editTitle') : t('customerForm.newTitle')}
          sub={customer ? customer.name : 'শুধু নাম দরকার, বাকিগুলো পরে দিলেও চলবে'}
        />
      </div>
      <div className="min-h-0 flex-1 divide-y divide-line overflow-auto">
        <Row title="নাম" help="বাংলা আর ইংরেজি দুই নামেই খোঁজা যাবে।">
          <div className="grid grid-cols-2 gap-4">
            <NameFields f={f} />
          </div>
        </Row>
        <Row title={t('customerForm.phone')} help="১১ ডিজিটের মোবাইল নম্বর। না থাকলে ফাঁকা রাখুন।">
          <PhoneField f={f} className="max-w-64" />
        </Row>
        <Row title={t('customerForm.gender')}>
          <GenderField f={f} />
        </Row>
        <Row title={t('customerForm.household')} help="একই বাসার লোকজন, যেমন এক ফোন নম্বরে পরিবার। কাস্টমার আলাদাই থাকেন।">
          {f.households.length > 6 && (
            <TextField label="পরিবার খুঁজুন" value={filter} onChange={(e) => setFilter(e.target.value)} autoComplete="off" className="max-w-64" />
          )}
          <div role="radiogroup" aria-label={t('customerForm.household')} className="grid max-h-72 grid-cols-3 gap-2 overflow-auto p-0.5">
            <button type="button" role="radio" aria-checked={f.input.householdId === null} onClick={() => f.set('householdId', null)} className={tile(f.input.householdId === null)}>
              <span className="font-semibold">{t('customerForm.noHousehold')}</span>
            </button>
            {shown.map((h) => {
              const names = f.members(h.id).map((m) => m.name);
              return (
                <button key={h.id} type="button" role="radio" aria-checked={f.input.householdId === h.id} onClick={() => f.set('householdId', h.id)} className={tile(f.input.householdId === h.id)}>
                  <span className="font-semibold">{h.label}</span>
                  <span className="line-clamp-1 text-xs text-muted">{names.length ? names.join(', ') : 'কেউ নেই'}</span>
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={f.input.householdId === NEW_HOUSEHOLD}
              onClick={() => f.set('householdId', NEW_HOUSEHOLD)}
              className={`${tile(f.input.householdId === NEW_HOUSEHOLD)} border-2 border-dashed border-line font-semibold text-brand-strong`}
            >
              + {t('customerForm.newHousehold')}
            </button>
          </div>
          {f.input.householdId === NEW_HOUSEHOLD && (
            <TextField
              label={t('customerForm.householdName')}
              className="max-w-80"
              value={f.input.newHousehold}
              onChange={(e) => f.set('newHousehold', e.target.value)}
              error={f.errorText('household', 'newHousehold')}
              autoComplete="off"
            />
          )}
        </Row>
        <Row title={t('customerForm.notes')} help="শুধু দোকানের জন্য, রসিদে ছাপা হয় না।">
          <TextAreaField label={t('customerForm.notes')} value={f.input.notes} onChange={(e) => f.set('notes', e.target.value)} />
        </Row>
      </div>
      <Footer f={f} />
      {f.dialog}
    </form>
  );
}

/** D: the details in one bar like the new order form, then the garments to measure next (saving first). */
export function CustomerVariantD({ customer }: { customer: Customer | null }) {
  const { t, label, date, number } = useI18n();
  const { state } = useSnapshot();
  const can = useCan();
  const templates = useMeasurementTemplates();
  const f = useCustomerForm(customer);
  const search = useVariantSearch();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void f.save();
      }}
      className={`flex flex-col gap-3 ${PAGE}`}
    >
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel px-5 py-4 shadow-sm">
        <PageHead back={f.backTo} title={customer ? t('customerForm.editTitle') : t('customerForm.newTitle')} />
        <div className="grid grid-cols-[1fr_1fr_14rem_auto] items-start gap-4">
          <NameFields f={f} />
          <PhoneField f={f} />
          <GenderField f={f} />
        </div>
        <div className="grid grid-cols-[18rem_1fr] items-start gap-4">
          <div className="flex flex-col gap-3">
            <HouseholdSelect f={f} />
          </div>
          <TextField label={t('customerForm.notes')} value={f.input.notes} onChange={(e) => f.set('notes', e.target.value)} autoComplete="off" />
        </div>
      </section>
      <section className={`${CARD} flex-1`}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <Ruler aria-hidden="true" size={18} className="text-brand-strong" />
          <h2 className="font-display text-lg font-bold">মাপ</h2>
          <p className="text-sm text-muted">{customer ? 'যে পোশাকের মাপ নেবেন সেটি বেছে নিন।' : 'সেভ করে সাথে সাথে মাপ নিতে একটি পোশাক বেছে নিন।'}</p>
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-min gap-3 overflow-auto p-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {templates.map((tpl) => {
            const profile = customer ? state.profiles[profileKey(customer.id, tpl.id)] : undefined;
            const v = profile ? currentVersion(profile) : null;
            return (
              <button
                key={tpl.id}
                type="button"
                disabled={!can('measurements.edit') || f.saving}
                onClick={() => void f.save((id) => `/app/customers/${id}/measure/${tpl.id}${search}`)}
                className="flex flex-col items-start gap-2 rounded-xl p-4 text-start ring-1 ring-line ring-inset hover:bg-brand-soft hover:ring-2 hover:ring-brand focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
              >
                <span aria-hidden="true" className={`grid size-10 place-items-center rounded-lg ${v ? 'bg-ok-soft text-ok' : 'bg-surface text-muted'}`}>
                  <Shirt size={20} />
                </span>
                <span className="font-display text-lg font-bold">{label(tpl.name)}</span>
                <span className="text-sm text-muted">
                  {v ? `শেষ মাপ ${date(v.takenAt.slice(0, 10))} · ${number(profile!.versions.length)} বার` : `${number(tpl.fields.length)}টি মাপ · এখনো নেওয়া হয়নি`}
                </span>
                <span className="mt-auto text-sm font-semibold text-brand-strong">{f.dirty || !customer ? 'সেভ করে মাপ নিন →' : 'মাপ নিন →'}</span>
              </button>
            );
          })}
        </div>
        <Footer f={f} />
      </section>
      {f.dialog}
    </form>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Measurement page
// ---------------------------------------------------------------------------------------------------------------

function numbers(v: MeasurementVersion | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(v?.values ?? {})) out[key] = value.value;
  return out;
}

function useMeasureForm(customerId: string, template: GarmentTemplate) {
  const { t, language } = useI18n();
  const store = useStore();
  const { state } = useSnapshot();
  const current = useCurrentStaff();
  const navigate = useNavigate();
  const profile = state.profiles[profileKey(customerId, template.id)];
  const versions = profile?.versions ?? [];
  const [last] = useState(() => (profile ? currentVersion(profile) : null));
  const [previous] = useState(() => numbers(last));
  const [values, setValues] = useState<Record<string, number>>(previous);
  const [generation, setGeneration] = useState(0);
  const [source, setSource] = useState<MeasurementSource>('body');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(previous) || notes !== '' || source !== 'body';
  const { dialog, allowNextNavigation } = useUnsavedGuard(dirty);
  const backTo = `/app/customers/${customerId}?tab=${template.id}`;

  const setOne = (key: string, value: number | null) =>
    setValues((cur) => {
      const next = { ...cur };
      if (value === null) delete next[key];
      else next[key] = value;
      return next;
    });
  const load = (v: MeasurementVersion) => {
    setValues(numbers(v));
    setGeneration((g) => g + 1);
  };
  const withUnits = () => {
    const out: Record<string, MeasurementValue> = {};
    for (const field of template.fields) {
      const value = values[field.key];
      if (value !== undefined) out[field.key] = { value, unit: field.unit };
    }
    return out;
  };
  const missing = missingRequiredFields(template.fields, withUnits());
  const changed = template.fields.filter((fl) => changedFromPrevious(values[fl.key] ?? null, previous[fl.key])).length;

  async function save() {
    if (saving || !current) return;
    const units = withUnits();
    const gaps = missingRequiredFields(template.fields, units);
    setErrors(Object.fromEntries(gaps.map((key) => [key, t('measure.required')])));
    setProblem(null);
    if (gaps.length > 0) return;
    setSaving(true);
    const outcome = await store.dispatch({
      type: 'measurement.recorded',
      customerId,
      templateId: template.id,
      version: { id: store.createId(), takenAt: new Date().toISOString(), takenBy: current.staff.id, source, notes: notes.trim(), values: units },
    });
    setSaving(false);
    const failure = problemText(outcome, language);
    if (failure) {
      setProblem(failure);
      return;
    }
    allowNextNavigation();
    navigate(backTo);
  }

  return { template, last, versions, previous, values, setOne, load, generation, source, setSource, notes, setNotes, errors, problem, saving, save, dialog, backTo, missing, changed };
}

type MeasureState = ReturnType<typeof useMeasureForm>;

/** A bare measurement input that keeps its own text; Enter moves to the next one. */
function MInput({ label, value, onChange, error, className }: { label: string; value: number | null; onChange(v: number | null): void; error?: string | undefined; className: string }) {
  const { language } = useI18n();
  const [text, setText] = useState(() => (value === null ? '' : formatMeasurement(value, language)));
  const [bad, setBad] = useState(false);
  return (
    <input
      data-mfield
      aria-label={label}
      aria-invalid={Boolean(error) || bad}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (!raw.trim()) {
          setBad(false);
          onChange(null);
          return;
        }
        const parsed = parseMeasurement(raw);
        setBad(parsed === null);
        onChange(parsed);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const all = Array.from(e.currentTarget.form?.querySelectorAll<HTMLInputElement>('[data-mfield]') ?? []);
        all[all.indexOf(e.currentTarget) + 1]?.focus();
      }}
      className={`${className} ${error || bad ? 'border-danger ring-1 ring-danger' : ''}`}
    />
  );
}

function Delta({ now, before }: { now: number | null; before: number | undefined }) {
  const { language } = useI18n();
  if (now === null || before === undefined || now === before) return null;
  return (
    <span className="rounded-md bg-warn-soft px-1.5 text-xs font-semibold text-warn-ink ring-1 ring-warn-line ring-inset">
      {deltaText(Math.round((now - before) * 1000) / 1000, language)}
    </span>
  );
}

function SourceSwitch({ m }: { m: MeasureState }) {
  const { t } = useI18n();
  const options = [
    { value: 'body', label: t('source.body') },
    { value: 'sample', label: t('source.sample') },
  ] as const;
  return (
    <div role="group" aria-label={t('measure.source')} className="flex self-start rounded-xl bg-surface p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={m.source === o.value}
          onClick={() => m.setSource(o.value)}
          className={`min-h-9 rounded-[9px] px-3 text-sm focus-visible:outline-2 focus-visible:outline-focus ${m.source === o.value ? 'bg-panel font-semibold text-ink shadow-sm' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Across the top: back, title, the customer, and tabs for the customer's other garments. */
function MeasureBar({ customer, m }: { customer: Customer; m: MeasureState }) {
  const { t, label, date } = useI18n();
  const { state } = useSnapshot();
  const templates = useMeasurementTemplates();
  const search = useVariantSearch();
  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
      <PageHead back={m.backTo} title={t('measure.title', { garment: label(m.template.name) })} />
      <span aria-hidden="true" className="h-8 w-px bg-line" />
      <div className="flex items-center gap-2.5">
        <Avatar id={customer.id} name={customer.name} size="md" />
        <div className="flex flex-col">
          <span className="font-bold leading-tight">{customer.name}</span>
          <span className="text-sm text-muted">{customer.phone ?? ''}</span>
        </div>
      </div>
      <nav aria-label={t('measure.garments')} className="ms-auto flex flex-wrap gap-1.5">
        {templates.map((tpl) => {
          const profile = state.profiles[profileKey(customer.id, tpl.id)];
          const v = profile ? currentVersion(profile) : null;
          const on = tpl.id === m.template.id;
          return (
            <Link
              key={tpl.id}
              to={`/app/customers/${customer.id}/measure/${tpl.id}${search}`}
              aria-current={on ? 'page' : undefined}
              className={`flex flex-col rounded-xl px-3 py-1.5 text-sm ring-inset focus-visible:outline-2 focus-visible:outline-focus ${on ? 'bg-brand-soft ring-2 ring-brand' : 'ring-1 ring-line hover:bg-surface'}`}
            >
              <span className={`font-semibold ${on ? 'text-brand-strong' : ''}`}>{label(tpl.name)}</span>
              <span className="text-xs text-muted">{v ? date(v.takenAt.slice(0, 10)) : 'নতুন'}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

/** The side of B and C: where it was measured from, notes, a count of what changed and what is missing, and save. */
function SavePanel({ m, children }: { m: MeasureState; children?: ReactNode }) {
  const { t, number, date } = useI18n();
  const { config } = useSnapshot();
  const taker = m.last && config ? staffById(config, m.last.takenBy) : null;
  return (
    <aside aria-label="সেভ" className={`${CARD} w-80 shrink-0`}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
        <div className="rounded-xl bg-surface p-3 text-sm">
          {m.last ? (
            <>
              <p className="font-semibold">আগের মাপ {date(m.last.takenAt.slice(0, 10), { year: true })}</p>
              <p className="text-muted">
                {t(m.last.source === 'sample' ? 'source.sample' : 'source.body')} · {t('measure.takenBy', { name: taker?.name ?? m.last.takenBy })}
              </p>
              <p className="text-muted">আগের মাপ বসানো আছে, শুধু যা বদলেছে তা লিখুন।</p>
            </>
          ) : (
            <p className="text-muted">এই পোশাকের প্রথম মাপ।</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold">{t('measure.source')}</p>
          <SourceSwitch m={m} />
        </div>
        <TextAreaField label={t('measure.notes')} value={m.notes} onChange={(e) => m.setNotes(e.target.value)} />
        {children}
      </div>
      <div className="flex flex-col gap-3 border-t border-line p-4">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-warn-soft px-2 py-2">
            <p className="font-display text-xl font-bold text-warn-ink">{number(m.changed)}</p>
            <p className="text-xs text-warn-ink">বদলেছে</p>
          </div>
          <div className={`rounded-xl px-2 py-2 ${m.missing.length ? 'bg-surface' : 'bg-ok-soft'}`}>
            <p className={`font-display text-xl font-bold ${m.missing.length ? '' : 'text-ok'}`}>{number(m.missing.length)}</p>
            <p className="text-xs text-muted">বাকি</p>
          </div>
        </div>
        {m.problem && (
          <p role="alert" className="text-sm text-danger">
            {m.problem}
          </p>
        )}
        <Button type="submit" size="lg" disabled={m.saving}>
          {t('measure.save')}
        </Button>
        <Link to={m.backTo} className={buttonClasses('ghost', 'md')}>
          {t('common.cancel')}
        </Link>
      </div>
    </aside>
  );
}

function MeasureForm({ m, customer, children }: { m: MeasureState; customer: Customer; children: ReactNode }) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void m.save();
      }}
      className={`flex flex-col gap-3 ${PAGE}`}
    >
      <MeasureBar customer={customer} m={m} />
      <div className="flex min-h-0 flex-1 gap-4">{children}</div>
      {m.dialog}
    </form>
  );
}

/** B: a table, one row per measurement: the value before, the new one, and how much it changed. */
export function MeasureVariantB({ customer, template }: { customer: Customer; template: GarmentTemplate }) {
  const { t, label, language, date } = useI18n();
  const m = useMeasureForm(customer.id, template);
  return (
    <MeasureForm m={m} customer={customer}>
      <section aria-label={t('measure.section')} className={`${CARD} min-w-0 flex-1`}>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-panel text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-2.5 text-start font-semibold">মাপ</th>
                <th className="px-3 py-2.5 text-end font-semibold">আগে {m.last ? `(${date(m.last.takenAt.slice(0, 10))})` : ''}</th>
                <th className="w-48 px-3 py-2.5 text-start font-semibold">নতুন</th>
                <th className="w-28 px-5 py-2.5 text-start font-semibold">পার্থক্য</th>
              </tr>
            </thead>
            {fieldGroups(template.fields).map((group) => (
              <tbody key={group.group}>
                <tr>
                  <th colSpan={4} className="bg-surface/70 px-5 py-1.5 text-start text-xs font-bold text-muted">
                    {groupLabel(group.group, t)}
                  </th>
                </tr>
                {group.fields.map((field) => {
                  const now = m.values[field.key] ?? null;
                  const before = m.previous[field.key];
                  const unit = t(field.unit === 'cm' ? 'unit.cm' : 'unit.inch');
                  return (
                    <tr key={field.key} className={`border-b border-line ${changedFromPrevious(now, before) ? 'bg-warn-soft/40' : ''}`}>
                      <td className="px-5 py-1.5 font-medium">
                        {label(field.label)}
                        {field.required && <span className="text-danger"> *</span>}
                        {m.errors[field.key] && <span className="block text-xs text-danger">{m.errors[field.key]}</span>}
                      </td>
                      <td className="px-3 py-1.5 text-end text-muted">{before === undefined ? '–' : `${formatMeasurement(before, language)} ${unit}`}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <MInput
                            key={`${field.key}-${m.generation}`}
                            label={label(field.label)}
                            value={now}
                            onChange={(v) => m.setOne(field.key, v)}
                            error={m.errors[field.key]}
                            className="h-9 w-28 rounded-lg border border-line bg-panel px-2.5 text-end font-display text-base font-semibold focus:outline-2 focus:outline-focus"
                          />
                          <span className="text-xs text-muted">{unit}</span>
                        </div>
                      </td>
                      <td className="px-5 py-1.5">
                        <Delta now={now} before={before} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </section>
      <SavePanel m={m} />
    </MeasureForm>
  );
}

/** C: one big tile per measurement, grouped, the old value and change under the number; a side panel with history. */
export function MeasureVariantC({ customer, template }: { customer: Customer; template: GarmentTemplate }) {
  const { t, label, language, date } = useI18n();
  const m = useMeasureForm(customer.id, template);
  const history = [...m.versions].reverse();
  return (
    <MeasureForm m={m} customer={customer}>
      <section aria-label={t('measure.section')} className={`${CARD} min-w-0 flex-1`}>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-5">
          <p className="text-sm text-muted">Enter চাপলে পরের মাপে যাবে। ৩৮.৫ বা ৩৮ ১/২ দুটোই চলে।</p>
          {fieldGroups(template.fields).map((group) => (
            <fieldset key={group.group} className="flex flex-col gap-2">
              <legend className="mb-2 text-xs font-bold text-muted">{groupLabel(group.group, t)}</legend>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {group.fields.map((field) => {
                  const now = m.values[field.key] ?? null;
                  const before = m.previous[field.key];
                  const changed = changedFromPrevious(now, before);
                  const error = m.errors[field.key];
                  return (
                    <label
                      key={field.key}
                      className={`flex flex-col gap-1 rounded-xl px-3 pt-2 pb-2.5 ring-inset focus-within:ring-2 focus-within:ring-brand ${
                        error ? 'ring-2 ring-danger' : changed ? 'bg-warn-soft/60 ring-1 ring-warn-line' : 'bg-surface/60 ring-1 ring-line'
                      }`}
                    >
                      <span className="flex items-center justify-between text-sm font-medium text-muted">
                        <span>
                          {label(field.label)}
                          {field.required && <span className="text-danger"> *</span>}
                        </span>
                        <span className="text-xs">{t(field.unit === 'cm' ? 'unit.cm' : 'unit.inch')}</span>
                      </span>
                      <MInput
                        key={`${field.key}-${m.generation}`}
                        label={label(field.label)}
                        value={now}
                        onChange={(v) => m.setOne(field.key, v)}
                        error={error}
                        className="w-full bg-transparent font-display text-3xl font-bold outline-none"
                      />
                      <span className="flex min-h-5 items-center gap-1.5 text-xs text-muted">
                        {error ? (
                          <span className="text-danger">{error}</span>
                        ) : before !== undefined ? (
                          <>
                            আগে {formatMeasurement(before, language)} <Delta now={now} before={before} />
                          </>
                        ) : (
                          'আগে ছিল না'
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>
      <SavePanel m={m}>
        {history.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <History aria-hidden="true" size={15} /> আগের মাপগুলো
            </p>
            {history.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => m.load(v)}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span>
                  {date(v.takenAt.slice(0, 10), { year: true })}
                  {i === 0 && <span className="ms-1.5 rounded-full bg-brand-soft px-1.5 text-xs font-semibold text-brand-strong">{t('measure.current')}</span>}
                </span>
                <span className="text-xs font-semibold text-brand-strong">বসান</span>
              </button>
            ))}
          </div>
        )}
      </SavePanel>
    </MeasureForm>
  );
}

/** D: one grid, the new values beside every earlier version (newest first), changes tinted; any version can be copied in. */
export function MeasureVariantD({ customer, template }: { customer: Customer; template: GarmentTemplate }) {
  const { t, label, language, date, number } = useI18n();
  const m = useMeasureForm(customer.id, template);
  const history = [...m.versions].reverse().slice(0, 5);
  return (
    <MeasureForm m={m} customer={customer}>
      <section aria-label={t('measure.section')} className={`${CARD} min-w-0 flex-1`}>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-panel text-xs">
              <tr className="border-b border-line">
                <th className="px-5 py-2 text-start font-semibold text-muted">মাপ</th>
                <th className="w-44 bg-brand-soft px-3 py-2 text-start font-bold text-brand-strong">নতুন মাপ</th>
                {history.map((v, i) => (
                  <th key={v.id} className="px-3 py-2 text-end font-semibold text-muted">
                    <span className="block text-ink">{date(v.takenAt.slice(0, 10), { year: true })}</span>
                    <span className="block font-normal">{i === 0 ? t('measure.current') : t(v.source === 'sample' ? 'source.sample' : 'source.body')}</span>
                    <button type="button" onClick={() => m.load(v)} className="mt-0.5 font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                      এগুলো বসান
                    </button>
                  </th>
                ))}
                {history.length === 0 && <th className="px-3 py-2 text-start font-normal text-muted">আগের কোনো মাপ নেই</th>}
              </tr>
            </thead>
            {fieldGroups(template.fields).map((group) => (
              <tbody key={group.group}>
                <tr>
                  <th colSpan={2 + Math.max(history.length, 1)} className="bg-surface/70 px-5 py-1.5 text-start text-xs font-bold text-muted">
                    {groupLabel(group.group, t)}
                  </th>
                </tr>
                {group.fields.map((field) => {
                  const now = m.values[field.key] ?? null;
                  return (
                    <tr key={field.key} className="border-b border-line">
                      <td className="px-5 py-1.5 font-medium">
                        {label(field.label)}
                        {field.required && <span className="text-danger"> *</span>}
                      </td>
                      <td className="bg-brand-soft/40 px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <MInput
                            key={`${field.key}-${m.generation}`}
                            label={label(field.label)}
                            value={now}
                            onChange={(v) => m.setOne(field.key, v)}
                            error={m.errors[field.key]}
                            className="h-9 w-24 rounded-lg border border-line bg-panel px-2.5 text-end font-display text-base font-semibold focus:outline-2 focus:outline-focus"
                          />
                          <Delta now={now} before={m.previous[field.key]} />
                        </div>
                      </td>
                      {history.map((v, i) => {
                        const value = v.values[field.key];
                        const older = history[i + 1]?.values[field.key];
                        const moved = value && older && value.value !== older.value;
                        return (
                          <td key={v.id} className={`px-3 py-1.5 text-end ${moved ? 'font-semibold text-warn-ink' : 'text-muted'}`}>
                            {value ? formatMeasurement(value.value, language) : '–'}
                          </td>
                        );
                      })}
                      {history.length === 0 && <td />}
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
        <div className="flex flex-wrap items-end gap-4 border-t border-line px-5 py-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold">{t('measure.source')}</p>
            <SourceSwitch m={m} />
          </div>
          <TextField label={t('measure.notes')} className="min-w-64 flex-1" value={m.notes} onChange={(e) => m.setNotes(e.target.value)} autoComplete="off" />
          <p className="text-sm text-muted">
            {number(m.changed)}টি বদলেছে · {number(m.missing.length)}টি বাকি
          </p>
          {m.problem && (
            <p role="alert" className="text-sm text-danger">
              {m.problem}
            </p>
          )}
          <Link to={m.backTo} className={buttonClasses('secondary', 'lg')}>
            {t('common.cancel')}
          </Link>
          <Button type="submit" size="lg" disabled={m.saving}>
            {t('measure.save')}
          </Button>
        </div>
      </section>
    </MeasureForm>
  );
}
