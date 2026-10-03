import {
  currentVersion,
  missingRequiredFields,
  profileKey,
  templateById,
  type GarmentTemplate,
  type MeasurementSource,
  type MeasurementValue,
} from '@darzikhata/domain';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useCurrentStaff, useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, buttonClasses } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { NumberField } from '../../ui/NumberField';
import { TextAreaField } from '../../ui/TextAreaField';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { useMeasurementAccess } from '../common/hooks';
import { problemText } from '../common/problemText';
import { fieldGroups, groupLabel } from './measurementView';

export interface MeasurementInputsProps {
  template: GarmentTemplate;
  values: Record<string, number>;
  errors?: Record<string, string>;
  onChange(values: Record<string, number>): void;
}

/** One number field per template field, grouped; reused by order entry. */
export function MeasurementInputs({ template, values, errors = {}, onChange }: MeasurementInputsProps) {
  const { t, label } = useI18n();
  // NumberField keeps its own text, so the latest values are tracked here and passed up whole.
  const [latest] = useState<{ values: Record<string, number> }>(() => ({ values: { ...values } }));

  const change = (key: string, value: number | null) => {
    const next = { ...latest.values };
    if (value === null) delete next[key];
    else next[key] = value;
    latest.values = next;
    onChange(next);
  };

  return (
    <>
      {fieldGroups(template.fields).map((group) => (
        <fieldset key={group.group} className="flex flex-col gap-3">
          <legend className="mb-2 font-semibold">{groupLabel(group.group, t)}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1">
                <NumberField
                  label={label(field.label)}
                  kind="measurement"
                  initialValue={values[field.key] ?? null}
                  onValueChange={(value) => change(field.key, value)}
                  suffix={<span className="pr-3 text-sm text-muted">{t(field.unit === 'cm' ? 'unit.cm' : 'unit.inch')}</span>}
                />
                {errors[field.key] && <p className="text-sm text-danger">{errors[field.key]}</p>}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}

/** Take new measurements for one customer and garment. Adds a version; orders keep their frozen copies. */
export function MeasurementForm() {
  const { t } = useI18n();
  const { customerId = '', templateId = '' } = useParams();
  const { state, config } = useSnapshot();
  const hasAccess = useMeasurementAccess();
  const customer = state.customers[customerId];
  const template = config ? templateById(config, templateId) : null;

  if (!customer || !template) {
    return (
      <p role="alert" className="text-danger">
        {t('customers.notFound')}
      </p>
    );
  }
  if (!hasAccess(customer)) return <p className="text-muted">{t('measure.hidden')}</p>;
  return <Form customerId={customer.id} template={template} />;
}

function Form({ customerId, template }: { customerId: string; template: GarmentTemplate }) {
  const { t, language, label } = useI18n();
  const store = useStore();
  const { state } = useSnapshot();
  const current = useCurrentStaff();
  const navigate = useNavigate();

  const [previous] = useState(() => {
    const profile = state.profiles[profileKey(customerId, template.id)];
    const version = profile ? currentVersion(profile) : null;
    const numbers: Record<string, number> = {};
    for (const [key, v] of Object.entries(version?.values ?? {})) numbers[key] = v.value;
    return numbers;
  });
  const [values, setValues] = useState<Record<string, number>>(previous);
  const [source, setSource] = useState<MeasurementSource>('body');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(values) !== JSON.stringify(previous) || notes !== '' || source !== 'body';
  const { dialog, allowNextNavigation } = useUnsavedGuard(dirty);
  const backTo = `/app/customers/${customerId}?tab=${template.id}`;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving || !current) return;
    const withUnits: Record<string, MeasurementValue> = {};
    for (const field of template.fields) {
      const value = values[field.key];
      if (value !== undefined) withUnits[field.key] = { value, unit: field.unit };
    }
    const missing = missingRequiredFields(template.fields, withUnits);
    setErrors(Object.fromEntries(missing.map((key) => [key, t('measure.required')])));
    setProblem(null);
    if (missing.length > 0) return;

    setSaving(true);
    const outcome = await store.dispatch({
      type: 'measurement.recorded',
      customerId,
      templateId: template.id,
      version: {
        id: store.createId(),
        takenAt: new Date().toISOString(),
        takenBy: current.staff.id,
        source,
        notes: notes.trim(),
        values: withUnits,
      },
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

  return (
    <form onSubmit={save} noValidate className="flex max-w-xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('measure.title', { garment: label(template.name) })}</h1>
      <MeasurementInputs template={template} values={previous} errors={errors} onChange={setValues} />
      <ChoiceGroup
        legend={t('measure.source')}
        value={source}
        options={[
          { value: 'body', label: t('source.body') },
          { value: 'sample', label: t('source.sample') },
        ]}
        onChange={setSource}
      />
      <TextAreaField label={t('measure.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={saving}>
          {t('measure.save')}
        </Button>
        <Link to={backTo} className={buttonClasses('secondary', 'lg')}>
          {t('common.cancel')}
        </Link>
      </div>
      {dialog}
    </form>
  );
}
