import type { Customer, Gender } from '@darzikhata/domain';
import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Button, buttonClasses } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { SelectField } from '../../ui/SelectField';
import { TextAreaField } from '../../ui/TextAreaField';
import { TextField } from '../../ui/TextField';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
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
import { CustomerPreview } from './CustomerPreview';

const NO_HOUSEHOLD = '';
const NEW_FORM = 'new';

/**
 * Add a customer, or correct one's details. One form serves both routes. On a desktop the form is a card as tall as the
 * window with a live preview of the profile beside it.
 */
export function CustomerForm() {
  const { t } = useI18n();
  const { customerId } = useParams();
  const { state } = useSnapshot();
  const customer = customerId ? state.customers[customerId] : undefined;

  if (customerId && !customer) {
    return (
      <p role="alert" className="text-danger">
        {t('customers.notFound')}
      </p>
    );
  }
  return <Form key={customerId ?? NEW_FORM} customer={customer ?? null} />;
}

function Form({ customer }: { customer: Customer | null }) {
  const { t, language } = useI18n();
  const store = useStore();
  const { state } = useSnapshot();
  const navigate = useNavigate();
  const { kind } = useShell();

  // What edits are diffed against, and the version they are based on. Both move forward after a conflict.
  const [initial, setInitial] = useState<CustomerInput>(() => (customer ? customerInputFrom(customer) : emptyCustomerInput()));
  const [baseVersion, setBaseVersion] = useState<number | null>(() => customer?.version ?? null);
  const [input, setInput] = useState<CustomerInput>(initial);
  const [errors, setErrors] = useState<CustomerInputErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(input) !== JSON.stringify(initial);
  const { dialog, allowNextNavigation } = useUnsavedGuard(dirty);
  const backTo = customer ? `/app/customers/${customer.id}` : '/app/customers';

  const set = <K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const households = Object.values(state.households).sort((a, b) => a.label.localeCompare(b.label));
  const householdOptions = [
    { value: NO_HOUSEHOLD, label: t('customerForm.noHousehold') },
    ...households.map((h) => ({ value: h.id, label: h.label })),
    { value: NEW_HOUSEHOLD, label: t('customerForm.newHousehold') },
  ];
  const genderOptions: Array<{ value: Gender; label: string }> = [
    { value: 'male', label: t('gender.male') },
    { value: 'female', label: t('gender.female') },
    { value: 'other', label: t('gender.other') },
  ];

  const errorText = (kind: 'name' | 'phone' | 'household', key: keyof CustomerInputErrors) =>
    errors[key] ? t(`customerForm.error.${kind}`) : undefined;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const found = validateCustomerInput(input);
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length > 0) return;

    const { customerId, events } = customerEvents(input, {
      existing: customer,
      start: initial,
      baseVersion,
      newId: () => store.createId(),
    });
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
    navigate(`/app/customers/${customerId}`);
  }

  const title = customer ? t('customerForm.editTitle') : t('customerForm.newTitle');
  const nameField = (
    <TextField
      label={t('customerForm.name')}
      value={input.name}
      onChange={(e) => set('name', e.target.value)}
      error={errorText('name', 'name')}
      autoComplete="off"
    />
  );
  const nameAltField = (
    <TextField label={t('customerForm.nameAlt')} value={input.nameAlt} onChange={(e) => set('nameAlt', e.target.value)} autoComplete="off" />
  );
  const phoneField = (
    <TextField
      label={t('customerForm.phone')}
      value={input.phone}
      onChange={(e) => set('phone', e.target.value)}
      error={errorText('phone', 'phone')}
      type="tel"
      inputMode="tel"
      autoComplete="off"
    />
  );
  const genderField = (
    <ChoiceGroup legend={t('customerForm.gender')} value={input.gender} options={genderOptions} onChange={(gender) => set('gender', gender)} />
  );
  const householdField = (
    <SelectField
      label={t('customerForm.household')}
      value={input.householdId ?? NO_HOUSEHOLD}
      options={householdOptions}
      onChange={(value) => set('householdId', value === NO_HOUSEHOLD ? null : value)}
    />
  );
  const newHouseholdField = input.householdId === NEW_HOUSEHOLD && (
    <TextField
      label={t('customerForm.householdName')}
      value={input.newHousehold}
      onChange={(e) => set('newHousehold', e.target.value)}
      error={errorText('household', 'newHousehold')}
      autoComplete="off"
    />
  );
  const notesField = <TextAreaField label={t('customerForm.notes')} value={input.notes} onChange={(e) => set('notes', e.target.value)} />;
  const problemLine = problem && (
    <p role="alert" className="text-danger">
      {problem}
    </p>
  );
  const saveButton = (
    <Button type="submit" size="lg" disabled={saving}>
      {t('common.save')}
    </Button>
  );
  const cancelLink = (
    <Link to={backTo} className={buttonClasses('secondary', 'lg')}>
      {t('common.cancel')}
    </Link>
  );

  if (kind === 'desktop') {
    return (
      <form onSubmit={save} noValidate className="flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <Link
              to={backTo}
              aria-label={t('customerForm.back')}
              title={t('customerForm.back')}
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
            >
              <ArrowLeft aria-hidden="true" size={18} />
            </Link>
            <h1 className="font-display text-xl font-bold">{title}</h1>
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 items-start gap-5 overflow-auto px-6 py-5">
            {nameField}
            {nameAltField}
            {phoneField}
            {genderField}
            {householdField}
            {newHouseholdField || <span />}
            <div className="col-span-2">{notesField}</div>
          </div>
          <div className="flex items-center gap-3 border-t border-line px-5 py-3">
            <div className="me-auto text-sm">
              {problemLine || <p className="text-muted">{dirty ? t('customerForm.unsaved') : customer ? t('customerForm.noChanges') : null}</p>}
            </div>
            {cancelLink}
            {saveButton}
          </div>
        </div>
        <CustomerPreview customer={customer} input={input} />
        {dialog}
      </form>
    );
  }

  return (
    <form onSubmit={save} noValidate className="flex max-w-xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {nameField}
      {nameAltField}
      {phoneField}
      {genderField}
      {householdField}
      {newHouseholdField}
      {notesField}
      {problemLine}
      <div className="flex gap-2">
        {saveButton}
        {cancelLink}
      </div>
      {dialog}
    </form>
  );
}
