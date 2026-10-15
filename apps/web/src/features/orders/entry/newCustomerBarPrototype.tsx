// PROTOTYPE (throwaway): five layouts for the desktop new order bar while a new customer is being typed in.
// Switch with ?variant=0|1|2|3|4|5 on /app/orders/new at desktop width, then press New Customer.
//   1 one slim row: boxes with the label inside as a placeholder, gender as a small switch, an icon to go back to search
//   2 two rows: title, a New Customer tag and the way back on top; the four fields spread across the full width below
//   3 only name and phone show, with More Details opening the other-language name and gender in the same row
//   4 looks like a picked customer: an avatar that fills in as the name is typed, the name in large type, the rest under it
//   5 one row of boxes with their label inside on the left, gender as a dropdown, an icon to go back to search
import type { Gender, Language } from '@darzikhata/domain';
import { ArrowLeftRight, ChevronDown, UserRoundPlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Avatar } from '../../../ui/Avatar';
import { Button } from '../../../ui/Button';
import { ChoiceGroup } from '../../../ui/ChoiceGroup';
import { Select } from '../../../ui/Select';
import { TextField } from '../../../ui/TextField';
import type { DraftErrors } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText } from './shared';

export const BAR_VARIANTS = {
  '0': 'Current',
  '1': 'One slim row, labels inside',
  '2': 'Two rows, fields across the width',
  '3': 'Name and phone, More Details',
  '4': 'Like a picked customer, with an avatar',
  '5': 'One row, labels at the left of each box',
} as const;
export const BAR_KEYS = Object.keys(BAR_VARIANTS);

const WORDS = {
  more: { bn: 'আরও তথ্য', en: 'More Details' },
  less: { bn: 'কম দেখান', en: 'Show Less' },
  pickGender: { bn: 'বেছে নিন', en: 'Choose' },
} as const;
const word = (language: Language, key: keyof typeof WORDS) => WORDS[key][language === 'bn' ? 'bn' : 'en'];

type NewCustomer = Extract<NonNullable<OrderEntry['draft']['customer']>, { kind: 'new' }>;

function useNewCustomer(entry: OrderEntry, errors: DraftErrors) {
  const { t } = useI18n();
  const errorText = useErrorText(errors);
  const customer = entry.draft.customer as NewCustomer;
  const set = (changes: Partial<NewCustomer>) => entry.setCustomer({ ...customer, ...changes });
  const genders: Array<{ value: Gender; label: string }> = [
    { value: 'male', label: t('gender.male') },
    { value: 'female', label: t('gender.female') },
    { value: 'other', label: t('gender.other') },
  ];
  return { customer, set, genders, nameError: errorText('customer.name'), phoneError: errorText('customer.phone') };
}

const BOX = 'min-h-11 rounded-lg border bg-panel px-3 text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus';

function Slim(props: { label: string; value: string; onChange(v: string): void; width: string; error?: string | undefined; tel?: boolean; big?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 ${props.width}`}>
      <input
        aria-label={props.label}
        placeholder={props.label}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={props.error ? true : undefined}
        autoComplete="off"
        type={props.tel ? 'tel' : 'text'}
        className={`${BOX} ${props.big ? 'font-display text-lg font-bold' : ''} ${props.error ? 'border-danger' : 'border-line'}`}
      />
      {props.error && <p className="text-xs text-danger">{props.error}</p>}
    </div>
  );
}

function Prefixed(props: { label: string; value: string; onChange(v: string): void; width: string; error?: string | undefined; tel?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 ${props.width}`}>
      <label
        className={`flex min-h-11 items-stretch overflow-hidden rounded-lg border bg-panel focus-within:outline-2 focus-within:outline-focus ${props.error ? 'border-danger' : 'border-line'}`}
      >
        <span className="flex shrink-0 items-center border-e border-line bg-surface px-3 text-sm text-muted">{props.label}</span>
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          aria-invalid={props.error ? true : undefined}
          autoComplete="off"
          type={props.tel ? 'tel' : 'text'}
          className="min-w-0 flex-1 bg-transparent px-3 text-ink outline-none"
        />
      </label>
      {props.error && <p className="text-xs text-danger">{props.error}</p>}
    </div>
  );
}

function GenderSwitch({ value, options, onChange, label }: { value: Gender | null; options: Array<{ value: Gender; label: string }>; onChange(g: Gender): void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex min-h-11 items-center gap-0.5 rounded-lg border border-line bg-panel p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
            value === o.value ? 'bg-brand-soft font-semibold text-brand-strong' : 'text-muted hover:bg-surface'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BackIcon({ entry }: { entry: OrderEntry }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => entry.setCustomer(null)}
      aria-label={t('entry.changeCustomer')}
      title={t('entry.changeCustomer')}
      className="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
    >
      <ArrowLeftRight aria-hidden="true" size={18} />
    </button>
  );
}

function BackButton({ entry, className = '' }: { entry: OrderEntry; className?: string }) {
  const { t } = useI18n();
  return (
    <Button variant="ghost" className={className} onClick={() => entry.setCustomer(null)}>
      <ArrowLeftRight aria-hidden="true" size={16} />
      {t('entry.changeCustomer')}
    </Button>
  );
}

/** Variants 1, 3 and 5: what goes beside the title in the usual one-row bar. */
export function NewCustomerRow({ variant, entry, errors }: { variant: string; entry: OrderEntry; errors: DraftErrors }) {
  const { t, language } = useI18n();
  const { customer, set, genders, nameError, phoneError } = useNewCustomer(entry, errors);
  const [more, setMore] = useState(false);

  if (variant === '1')
    return (
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <Slim label={t('customerForm.name')} value={customer.name} onChange={(name) => set({ name })} width="min-w-0 flex-[3]" error={nameError} />
        <Slim label={t('customerForm.nameAlt')} value={customer.nameAlt} onChange={(nameAlt) => set({ nameAlt })} width="min-w-0 flex-[3]" />
        <Slim label={t('customerForm.phone')} value={customer.phone} onChange={(phone) => set({ phone })} width="min-w-0 flex-[2]" error={phoneError} tel />
        <GenderSwitch label={t('customerForm.gender')} value={customer.gender} options={genders} onChange={(gender) => set({ gender })} />
        <span className="shrink-0">
          <BackIcon entry={entry} />
        </span>
      </div>
    );

  if (variant === '3')
    return (
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
        <TextField label={t('customerForm.name')} className="w-56" value={customer.name} onChange={(e) => set({ name: e.target.value })} error={nameError} autoComplete="off" />
        <TextField
          label={t('customerForm.phone')}
          className="w-44"
          value={customer.phone}
          onChange={(e) => set({ phone: e.target.value })}
          error={phoneError}
          type="tel"
          autoComplete="off"
        />
        {more && (
          <>
            <TextField label={t('customerForm.nameAlt')} className="w-52" value={customer.nameAlt} onChange={(e) => set({ nameAlt: e.target.value })} autoComplete="off" />
            <ChoiceGroup legend={t('customerForm.gender')} value={customer.gender} options={genders} onChange={(gender) => set({ gender })} />
          </>
        )}
        <Button variant="ghost" aria-expanded={more} onClick={() => setMore((v) => !v)}>
          <ChevronDown aria-hidden="true" size={16} className={more ? 'rotate-180' : ''} />
          {word(language, more ? 'less' : 'more')}
        </Button>
        <BackButton entry={entry} className="ms-auto" />
      </div>
    );

  // 5
  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <Prefixed label={t('customerForm.name')} value={customer.name} onChange={(name) => set({ name })} width="min-w-0 flex-[3]" error={nameError} />
      <Prefixed label={t('customerForm.phone')} value={customer.phone} onChange={(phone) => set({ phone })} width="min-w-0 flex-[2]" error={phoneError} tel />
      <Prefixed label={t('customerForm.nameAlt')} value={customer.nameAlt} onChange={(nameAlt) => set({ nameAlt })} width="min-w-0 flex-[3]" />
      <Select
        label={t('customerForm.gender')}
        size="lg"
        value={customer.gender ?? ''}
        options={[{ value: '', label: `${t('customerForm.gender')}: ${word(language, 'pickGender')}` }, ...genders.map((g) => ({ value: g.value, label: `${t('customerForm.gender')}: ${g.label}` }))]}
        onChange={(g) => set({ gender: g === '' ? null : (g as Gender) })}
      />
      <span className="shrink-0">
        <BackIcon entry={entry} />
      </span>
    </div>
  );
}

/** Variants 2 and 4: the whole bar, laid out differently from the usual one row. */
export function NewCustomerSection({ variant, entry, errors, heading }: { variant: string; entry: OrderEntry; errors: DraftErrors; heading: ReactNode }) {
  const { t } = useI18n();
  const { customer, set, genders, nameError, phoneError } = useNewCustomer(entry, errors);
  const SECTION = 'flex flex-col gap-3 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm';

  if (variant === '2')
    return (
      <section aria-label={t('entry.step.customer')} className={SECTION}>
        <div className="flex items-center gap-3">
          {heading}
          <span aria-hidden="true" className="h-8 w-px bg-line" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-sm font-semibold text-brand-strong">
            <UserRoundPlus aria-hidden="true" size={15} />
            {t('customers.new')}
          </span>
          <BackButton entry={entry} className="ms-auto" />
        </div>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.5fr)_auto] items-start gap-3">
          <TextField label={t('customerForm.name')} value={customer.name} onChange={(e) => set({ name: e.target.value })} error={nameError} autoComplete="off" />
          <TextField label={t('customerForm.nameAlt')} value={customer.nameAlt} onChange={(e) => set({ nameAlt: e.target.value })} autoComplete="off" />
          <TextField label={t('customerForm.phone')} value={customer.phone} onChange={(e) => set({ phone: e.target.value })} error={phoneError} type="tel" autoComplete="off" />
          <ChoiceGroup legend={t('customerForm.gender')} value={customer.gender} options={genders} onChange={(gender) => set({ gender })} />
        </div>
      </section>
    );

  // 4
  return (
    <section aria-label={t('entry.step.customer')} className="flex items-center gap-4 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
      {heading}
      <span aria-hidden="true" className="h-8 w-px bg-line" />
      {customer.name.trim() ? (
        <Avatar id="new-customer" name={customer.name} size="lg" />
      ) : (
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-dashed border-line text-muted">
          <UserRoundPlus size={20} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <Slim label={t('customerForm.name')} value={customer.name} onChange={(name) => set({ name })} width="w-64" error={nameError} big />
          <Slim label={t('customerForm.phone')} value={customer.phone} onChange={(phone) => set({ phone })} width="w-44" error={phoneError} tel />
        </div>
        <div className="flex items-center gap-2">
          <Slim label={t('customerForm.nameAlt')} value={customer.nameAlt} onChange={(nameAlt) => set({ nameAlt })} width="w-64" />
          <GenderSwitch label={t('customerForm.gender')} value={customer.gender} options={genders} onChange={(gender) => set({ gender })} />
        </div>
      </div>
      <BackButton entry={entry} className="self-start" />
    </section>
  );
}
