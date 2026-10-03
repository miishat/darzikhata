import type { Customer, Gender } from '@darzikhata/domain';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
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

const NO_HOUSEHOLD = '';
const NEW_FORM = 'new';

/** Add a customer, or correct one's details. One form serves both routes. */
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

  return (
    <form onSubmit={save} noValidate className="flex max-w-xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{customer ? t('customerForm.editTitle') : t('customerForm.newTitle')}</h1>
      <TextField
        label={t('customerForm.name')}
        value={input.name}
        onChange={(e) => set('name', e.target.value)}
        error={errorText('name', 'name')}
        autoComplete="off"
      />
      <TextField
        label={t('customerForm.nameAlt')}
        value={input.nameAlt}
        onChange={(e) => set('nameAlt', e.target.value)}
        autoComplete="off"
      />
      <TextField
        label={t('customerForm.phone')}
        value={input.phone}
        onChange={(e) => set('phone', e.target.value)}
        error={errorText('phone', 'phone')}
        type="tel"
        inputMode="tel"
        autoComplete="off"
      />
      <ChoiceGroup
        legend={t('customerForm.gender')}
        value={input.gender}
        options={genderOptions}
        onChange={(gender) => set('gender', gender)}
      />
      <SelectField
        label={t('customerForm.household')}
        value={input.householdId ?? NO_HOUSEHOLD}
        options={householdOptions}
        onChange={(value) => set('householdId', value === NO_HOUSEHOLD ? null : value)}
      />
      {input.householdId === NEW_HOUSEHOLD && (
        <TextField
          label={t('customerForm.householdName')}
          value={input.newHousehold}
          onChange={(e) => set('newHousehold', e.target.value)}
          error={errorText('household', 'newHousehold')}
          autoComplete="off"
        />
      )}
      <TextAreaField label={t('customerForm.notes')} value={input.notes} onChange={(e) => set('notes', e.target.value)} />

      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={saving}>
          {t('common.save')}
        </Button>
        <Link to={backTo} className={buttonClasses('secondary', 'lg')}>
          {t('common.cancel')}
        </Link>
      </div>
      {dialog}
    </form>
  );
}
