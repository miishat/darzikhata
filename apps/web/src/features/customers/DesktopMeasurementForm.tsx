import {
  currentVersion,
  formatMeasurement,
  parseMeasurement,
  profileKey,
  type Customer,
  type GarmentTemplate,
  type MeasurementSource,
} from '@darzikhata/domain';
import { ArrowLeft } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { TextField } from '../../ui/TextField';
import { changedFromPrevious, deltaText, fieldGroups, groupLabel } from './measurementView';
import { useMeasurementTemplates } from './MobileMeasurements';

type Values = Record<string, number>;

export interface DesktopMeasurementProps {
  customer: Customer;
  template: GarmentTemplate;
  /** The current version's values, which the form starts from. */
  previous: Values;
  values: Values;
  onValues: Dispatch<SetStateAction<Values>>;
  /** Replaces values from outside the fields (copying an earlier value), so the fields show them. */
  onReplace(values: Values): void;
  /** Changes whenever values are replaced from outside, to reset the fields' typed text. */
  generation: number;
  errors: Record<string, string>;
  missing: number;
  source: MeasurementSource;
  onSource(source: MeasurementSource): void;
  notes: string;
  onNotes(notes: string): void;
  problem: string | null;
  saving: boolean;
  backTo: string;
}

/** A bare measurement input that keeps its own text, so "৩৮." can be typed; Enter moves to the next one. */
function MeasureCell({ label, value, error, onChange }: { label: string; value: number | null; error?: string | undefined; onChange(value: number | null): void }) {
  const { language } = useI18n();
  const [text, setText] = useState(() => (value === null ? '' : formatMeasurement(value, language)));
  const [unreadable, setUnreadable] = useState(false);
  return (
    <input
      data-measure-cell
      aria-label={label}
      aria-invalid={Boolean(error) || unreadable}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = raw.trim() ? parseMeasurement(raw) : null;
        setUnreadable(raw.trim() !== '' && parsed === null);
        onChange(parsed);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const cells = Array.from(e.currentTarget.form?.querySelectorAll<HTMLInputElement>('[data-measure-cell]') ?? []);
        cells[cells.indexOf(e.currentTarget) + 1]?.focus();
      }}
      className={`h-9 w-24 rounded-lg border bg-panel px-2.5 text-end font-display text-base font-semibold focus:outline-2 focus:outline-focus ${
        error || unreadable ? 'border-danger' : 'border-line'
      }`}
    />
  );
}

function Delta({ now, before }: { now: number | null; before: number | undefined }) {
  const { t, language } = useI18n();
  if (!changedFromPrevious(now, before)) return null;
  return (
    <span className="rounded-md bg-warn-soft px-1.5 text-xs font-semibold text-warn-ink ring-1 ring-warn-line ring-inset">
      <span className="sr-only">{`${t('measure.changeFromPrev')} `}</span>
      {deltaText(Math.round((now! - before!) * 1000) / 1000, language)}
    </span>
  );
}

/** Back, the title, the customer, and a tab for each garment with when it was last measured. */
function MeasureBar({ customer, template, backTo }: { customer: Customer; template: GarmentTemplate; backTo: string }) {
  const { t, label, date } = useI18n();
  const { state } = useSnapshot();
  const templates = useMeasurementTemplates();
  return (
    <section aria-label={t('measure.customerBar')} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Link
          to={backTo}
          aria-label={t('customerForm.back')}
          title={t('customerForm.back')}
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft aria-hidden="true" size={18} />
        </Link>
        <h1 className="font-display text-xl font-bold">{t('measure.title', { garment: label(template.name) })}</h1>
      </div>
      <span aria-hidden="true" className="h-8 w-px bg-line" />
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar id={customer.id} name={customer.name} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bold leading-tight">{customer.name}</span>
          {customer.phone && <span className="text-sm text-muted">{customer.phone}</span>}
        </div>
      </div>
      <nav aria-label={t('measure.garments')} className="ms-auto flex flex-wrap gap-1.5">
        {templates.map((tpl) => {
          const profile = state.profiles[profileKey(customer.id, tpl.id)];
          const version = profile ? currentVersion(profile) : null;
          const on = tpl.id === template.id;
          return (
            <Link
              key={tpl.id}
              to={`/app/customers/${customer.id}/measure/${tpl.id}`}
              aria-current={on ? 'page' : undefined}
              className={`flex flex-col rounded-xl px-3 py-1.5 text-sm ring-inset focus-visible:outline-2 focus-visible:outline-focus ${
                on ? 'bg-brand-soft ring-2 ring-brand' : 'ring-1 ring-line hover:bg-surface'
              }`}
            >
              <span className={`font-semibold ${on ? 'text-brand-strong' : ''}`}>{label(tpl.name)}</span>
              <span className="text-xs text-muted">{version ? date(version.takenAt.slice(0, 10)) : t('measure.tabNone')}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

const HISTORY = 5;

/**
 * Desktop measurements: a bar with the customer and their garments, then one grid with the new values beside the
 * earlier versions (newest first). Any earlier value can be clicked to copy it in, or a whole version from its column.
 */
export function DesktopMeasurementForm(props: DesktopMeasurementProps) {
  const { customer, template, previous, values, onValues, onReplace, generation, errors, missing } = props;
  const { t, label, language, date, number } = useI18n();
  const { state } = useSnapshot();
  const profile = state.profiles[profileKey(customer.id, template.id)];
  const history = [...(profile?.versions ?? [])].reverse().slice(0, HISTORY);
  const changed = template.fields.filter((f) => changedFromPrevious(values[f.key] ?? null, previous[f.key])).length;
  const columns = 2 + Math.max(history.length, 1);
  const unit = (u: string) => t(u === 'cm' ? 'unit.cm' : 'unit.inch');

  const setOne = (key: string, value: number | null) =>
    onValues((current) => {
      const next = { ...current };
      if (value === null) delete next[key];
      else next[key] = value;
      return next;
    });

  return (
    <>
      <MeasureBar customer={customer} template={template} backTo={props.backTo} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
        {history.length > 0 && <p className="border-b border-line px-5 py-2 text-sm text-muted">{t('measure.pickHint')}</p>}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('measure.title', { garment: label(template.name) })}</caption>
            <thead className="sticky top-0 z-10 bg-panel text-xs">
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-2 text-start align-bottom font-semibold text-muted">
                  {t('measure.colField')}
                </th>
                <th scope="col" className="w-48 bg-brand-soft px-3 py-2 text-start align-bottom font-bold text-brand-strong">
                  {t('measure.colNew')}
                </th>
                {history.map((v, i) => (
                  <th key={v.id} scope="col" className="px-3 py-2 text-end align-bottom font-semibold text-muted">
                    <span className="block text-ink">{date(v.takenAt.slice(0, 10), { year: true })}</span>
                    <span className="block font-normal">{i === 0 ? t('measure.current') : t(v.source === 'sample' ? 'source.sample' : 'source.body')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next: Values = {};
                        for (const [key, value] of Object.entries(v.values)) next[key] = value.value;
                        onReplace(next);
                      }}
                      className="mt-0.5 font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      {t('measure.useSet')}
                    </button>
                  </th>
                ))}
                {history.length === 0 && (
                  <th scope="col" className="px-3 py-2 text-start align-bottom font-normal text-muted">
                    {t('measure.noHistory')}
                  </th>
                )}
              </tr>
            </thead>
            {fieldGroups(template.fields).map((group) => (
              <tbody key={group.group}>
                <tr>
                  <th colSpan={columns} scope="colgroup" className="bg-surface/70 px-5 py-1.5 text-start text-xs font-bold text-muted">
                    {groupLabel(group.group, t)}
                  </th>
                </tr>
                {group.fields.map((field) => {
                  const now = values[field.key] ?? null;
                  const name = label(field.label);
                  return (
                    <tr key={field.key} className="border-b border-line">
                      <th scope="row" className="px-5 py-1.5 text-start font-medium">
                        {name}
                        {field.required && <span aria-hidden="true" className="text-danger"> *</span>}
                        {errors[field.key] && <span className="block text-xs font-normal text-danger">{errors[field.key]}</span>}
                      </th>
                      <td className="bg-brand-soft/40 px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <MeasureCell key={`${field.key}-${generation}`} label={name} value={now} error={errors[field.key]} onChange={(v) => setOne(field.key, v)} />
                          <span className="text-xs text-muted">{unit(field.unit)}</span>
                          <Delta now={now} before={previous[field.key]} />
                        </div>
                      </td>
                      {history.map((v, i) => {
                        const value = v.values[field.key];
                        if (!value) {
                          return (
                            <td key={v.id} className="px-3 py-1.5 text-end text-muted">
                              –
                            </td>
                          );
                        }
                        const older = history[i + 1]?.values[field.key];
                        const moved = older !== undefined && older.unit === value.unit && older.value !== value.value;
                        const text = formatMeasurement(value.value, language);
                        const inUse = now === value.value && value.unit === field.unit;
                        return (
                          <td key={v.id} className="px-3 py-1.5 text-end">
                            <button
                              type="button"
                              aria-label={t('measure.useOne', { field: name, value: text })}
                              title={t('measure.useOne', { field: name, value: text })}
                              onClick={() => onReplace({ ...values, [field.key]: value.value })}
                              className={`rounded-md px-2 py-0.5 hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-focus ${
                                moved ? 'font-semibold text-warn-ink' : 'text-muted'
                              } ${inUse ? 'ring-1 ring-brand ring-inset' : ''}`}
                            >
                              {text}
                            </button>
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
          <ChoiceGroup
            legend={t('measure.source')}
            value={props.source}
            options={[
              { value: 'body', label: t('source.body') },
              { value: 'sample', label: t('source.sample') },
            ]}
            onChange={props.onSource}
          />
          <TextField label={t('measure.notes')} className="min-w-64 flex-1" value={props.notes} onChange={(e) => props.onNotes(e.target.value)} autoComplete="off" />
          <div className="flex flex-col items-end gap-2">
            {props.problem && (
              <p role="alert" className="text-sm text-danger">
                {props.problem}
              </p>
            )}
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted">{t('measure.counts', { changed: number(changed), missing: number(missing) })}</p>
              <Link to={props.backTo} className={buttonClasses('secondary', 'lg')}>
                {t('common.cancel')}
              </Link>
              <Button type="submit" size="lg" disabled={props.saving}>
                {t('measure.save')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
