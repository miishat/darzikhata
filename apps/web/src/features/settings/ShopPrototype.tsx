// PROTOTYPE (throwaway): other desktop layouts for the shop settings body, behind ?variant=.
import { toBanglaDigits, toEnglishDigits, type Language } from '@darzikhata/domain';
import { Link2, Phone, ReceiptText, ShieldCheck, Store } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Switch } from '../../ui/Switch';
import { TextField } from '../../ui/TextField';

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);

export interface ShopFields {
  nameBn: string;
  nameEn: string;
  phone: string;
  address: string;
  days: string;
  restrict: boolean;
}

export interface ShopProtoProps {
  variant: string;
  input: ShopFields;
  set<K extends keyof ShopFields>(key: K, value: ShopFields[K]): void;
  nameError?: string | undefined;
  daysError?: string | undefined;
  shownName: string;
}

function useFields({ input, set, nameError, daysError }: ShopProtoProps) {
  const { t } = useI18n();
  return {
    nameBn: <TextField label={t('settings.shop.nameBn')} value={input.nameBn} onChange={(e) => set('nameBn', e.target.value)} error={nameError} autoComplete="off" />,
    nameEn: <TextField label={t('settings.shop.nameEn')} value={input.nameEn} onChange={(e) => set('nameEn', e.target.value)} autoComplete="off" />,
    phone: <TextField label={t('settings.shop.phone')} value={input.phone} onChange={(e) => set('phone', e.target.value)} type="tel" inputMode="tel" autoComplete="off" />,
    address: <TextField label={t('settings.shop.address')} value={input.address} onChange={(e) => set('address', e.target.value)} autoComplete="off" />,
    days: (
      <TextField
        label={t('settings.shop.linkDays')}
        value={input.days}
        onChange={(e) => set('days', e.target.value)}
        error={daysError}
        inputMode="numeric"
        autoComplete="off"
        className="max-w-48"
      />
    ),
  };
}

function ReceiptTop({ name, input }: { name: string; input: ShopFields }) {
  return (
    <>
      <p className="font-display text-xl font-bold">{name}</p>
      <p className="text-sm text-muted">{[input.address.trim(), input.phone.trim()].filter(Boolean).join(' · ')}</p>
    </>
  );
}

function Row({ icon: Icon, title, hint, children }: { icon: typeof Store; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[18rem_1fr] gap-8 border-b border-line py-6 last:border-0">
      <div className="flex gap-3">
        <Icon size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" />
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted">{hint}</p>
        </div>
      </div>
      <div className="flex max-w-xl flex-col gap-3">{children}</div>
    </div>
  );
}

function LabeledSwitch(props: { on: boolean; onChange(v: boolean): void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{props.label}</span>
      <Switch {...props} />
    </div>
  );
}

function H({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold tracking-wide text-muted">{children}</h3>;
}

/** B: settings rows, the title and hint on the left, the fields on the right. */
function Rows(props: ShopProtoProps) {
  const { t } = useI18n();
  const f = useFields(props);
  return (
    <div className="mx-auto max-w-5xl px-2">
      <Row icon={Store} title={t('settings.shop.nameCard')} hint={t('settings.shop.nameCardHint')}>
        <div className="grid grid-cols-2 gap-3">
          {f.nameBn}
          {f.nameEn}
        </div>
      </Row>
      <Row icon={Phone} title={t('settings.shop.contact')} hint={t('settings.shop.contactHint')}>
        {f.phone}
        {f.address}
      </Row>
      <Row icon={ReceiptText} title={t('settings.shop.preview')} hint={t('settings.shop.previewHint')}>
        <div className="rounded-lg border border-dashed border-line bg-surface/60 p-4 text-center">
          <ReceiptTop name={props.shownName} input={props.input} />
        </div>
      </Row>
      <Row icon={Link2} title={t('settings.shop.links')} hint={t('settings.shop.linkDaysHint')}>
        {f.days}
      </Row>
      <Row icon={ShieldCheck} title={t('settings.shop.privacy')} hint={t('settings.shop.privacyHint')}>
        <LabeledSwitch on={props.input.restrict} onChange={(v) => props.set('restrict', v)} label={t('settings.shop.restrict')} />
      </Row>
    </div>
  );
}

/** C: the form on the left, a live receipt and status-link preview on the right. */
function Preview(props: ShopProtoProps) {
  const { t, language, date } = useI18n();
  const f = useFields(props);
  const days = Number(toEnglishDigits(props.input.days.trim())) || 0;
  return (
    <div className="grid grid-cols-[1fr_22rem] gap-8">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <H>{t('settings.shop.nameCard')}</H>
          <div className="grid grid-cols-2 gap-3">
            {f.nameBn}
            {f.nameEn}
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <H>{t('settings.shop.contact')}</H>
          <div className="grid grid-cols-[14rem_1fr] gap-3">
            {f.phone}
            {f.address}
          </div>
        </section>
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <H>{pick(language, 'নিয়ম', 'Rules')}</H>
          <div className="flex items-start gap-4">
            {f.days}
            <p className="pt-8 text-sm text-muted">{t('settings.shop.linkDaysHint')}</p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <LabeledSwitch on={props.input.restrict} onChange={(v) => props.set('restrict', v)} label={t('settings.shop.restrict')} />
          </div>
        </section>
      </div>
      <aside aria-label={t('settings.shop.preview')} className="flex flex-col gap-3">
        <H>{t('settings.shop.preview')}</H>
        <div className="rounded-lg border border-line bg-white p-5 text-center text-[#0e1630] shadow-md">
          <ReceiptTop name={props.shownName} input={props.input} />
          <div className="my-3 border-t border-dashed border-line" />
          <div className="flex justify-between text-sm">
            <span>{pick(language, 'অর্ডার A-0001', 'Order A-0001')}</span>
            <span>{date(new Date().toISOString())}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-muted">
            <span>{pick(language, 'পাঞ্জাবি ×১', 'Panjabi ×1')}</span>
            <span>{pick(language, '৳১,২০০', '৳1,200')}</span>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface/60 p-4 text-sm">
          <p className="font-semibold">{t('settings.shop.links')}</p>
          <p className="text-muted">
            {days > 0
              ? pick(language, `ডেলিভারির ${toBanglaDigits(String(days))} দিন পর কাস্টমারের লিংক আর খুলবে না।`, `A customer’s link stops opening ${days} days after delivery.`)
              : '…'}
          </p>
        </div>
      </aside>
    </div>
  );
}

/** D: two cards, who the shop is and the shop's rules, with quick picks for the days and a switch. */
function TwoCards(props: ShopProtoProps) {
  const { t, language, number } = useI18n();
  const f = useFields(props);
  const presets = [7, 15, 30, 60, 90];
  const current = Number(toEnglishDigits(props.input.days.trim()));
  return (
    <div className="grid grid-cols-[3fr_2fr] gap-4">
      <section className="flex flex-col gap-4 rounded-xl border border-line p-5">
        <div className="flex items-center gap-3">
          <Store size={20} aria-hidden="true" className="text-brand-strong" />
          <h3 className="font-display text-lg font-bold">{pick(language, 'দোকানের পরিচয়', 'About the Shop')}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {f.nameBn}
          {f.nameEn}
          {f.phone}
          {f.address}
        </div>
        <div className="flex items-center gap-4 rounded-lg bg-surface/60 p-4">
          <ReceiptText size={20} aria-hidden="true" className="shrink-0 text-muted" />
          <div className="min-w-0 flex-1 text-center">
            <ReceiptTop name={props.shownName} input={props.input} />
          </div>
          <span className="text-xs text-muted">{t('settings.shop.preview')}</span>
        </div>
      </section>
      <section className="flex flex-col gap-5 rounded-xl border border-line p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} aria-hidden="true" className="text-brand-strong" />
          <h3 className="font-display text-lg font-bold">{pick(language, 'নিয়ম', 'Rules')}</h3>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-semibold">{t('settings.shop.links')}</p>
          <p className="text-sm text-muted">{t('settings.shop.linkDaysHint')}</p>
          <div role="group" aria-label={t('settings.shop.linkDays')} className="flex flex-wrap items-center gap-2">
            {presets.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={current === d}
                onClick={() => props.set('days', toBanglaDigits(String(d)))}
                className={`min-h-9 rounded-full border px-3 text-sm ${current === d ? 'border-brand bg-brand-soft font-semibold text-brand-strong' : 'border-line'}`}
              >
                {pick(language, `${number(d)} দিন`, `${d} days`)}
              </button>
            ))}
          </div>
          {f.days}
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="font-semibold">{t('settings.shop.privacy')}</p>
          <LabeledSwitch on={props.input.restrict} onChange={(v) => props.set('restrict', v)} label={t('settings.shop.restrict')} />
        </div>
      </section>
    </div>
  );
}

/** E: a read-only summary, each line with its own Change button that opens its fields in place. */
function Summary(props: ShopProtoProps) {
  const { t, language, number } = useI18n();
  const f = useFields(props);
  const [open, setOpen] = useState<string | null>(props.nameError ? 'name' : props.daysError ? 'days' : null);
  const { input } = props;
  const days = Number(toEnglishDigits(input.days.trim()));
  const rows: Array<{ id: string; icon: typeof Store; title: string; value: ReactNode; edit?: ReactNode }> = [
    {
      id: 'name',
      icon: Store,
      title: t('settings.shop.nameCard'),
      value: (
        <>
          <span className="font-semibold">{input.nameBn || '—'}</span>
          <span className="text-muted"> · {input.nameEn || '—'}</span>
        </>
      ),
      edit: (
        <div className="grid grid-cols-2 gap-3">
          {f.nameBn}
          {f.nameEn}
        </div>
      ),
    },
    { id: 'phone', icon: Phone, title: t('settings.shop.phone'), value: input.phone || '—', edit: f.phone },
    { id: 'address', icon: ReceiptText, title: t('settings.shop.address'), value: input.address || '—', edit: f.address },
    {
      id: 'days',
      icon: Link2,
      title: t('settings.shop.links'),
      value: days ? pick(language, `অর্ডার শেষের ${number(days)} দিন পর বন্ধ`, `Close ${days} days after an order is finished`) : '—',
      edit: f.days,
    },
    {
      id: 'restrict',
      icon: ShieldCheck,
      title: t('settings.shop.privacy'),
      value: input.restrict ? pick(language, 'শুধু অনুমতি থাকা স্টাফ', 'Permitted staff only') : pick(language, 'সব স্টাফ', 'All staff'),
    },
  ];
  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <div className="mb-4 rounded-xl border border-line bg-surface/60 p-5 text-center">
        <ReceiptTop name={props.shownName} input={input} />
        <p className="mt-1 text-xs text-muted">{t('settings.shop.preview')}</p>
      </div>
      <ul className="m-0 flex list-none flex-col rounded-xl border border-line p-0">
        {rows.map((row) => (
          <li key={row.id} className="border-b border-line px-4 py-3 last:border-0">
            <div className="flex items-center gap-4">
              <row.icon size={18} aria-hidden="true" className="shrink-0 text-muted" />
              <span className="w-44 shrink-0 text-sm text-muted">{row.title}</span>
              <span className="min-w-0 flex-1 truncate">{row.value}</span>
              {row.edit ? (
                <Button variant="secondary" aria-expanded={open === row.id} onClick={() => setOpen(open === row.id ? null : row.id)}>
                  {open === row.id ? pick(language, 'বন্ধ', 'Done') : pick(language, 'বদলান', 'Change')}
                </Button>
              ) : (
                <Switch on={input.restrict} onChange={(v) => props.set('restrict', v)} label={t('settings.shop.restrict')} />
              )}
            </div>
            {open === row.id && row.edit && <div className="mt-3 ps-[13.5rem]">{row.edit}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShopPrototype(props: ShopProtoProps) {
  if (props.variant === 'B') return <Rows {...props} />;
  if (props.variant === 'C') return <Preview {...props} />;
  if (props.variant === 'D') return <TwoCards {...props} />;
  return <Summary {...props} />;
}
