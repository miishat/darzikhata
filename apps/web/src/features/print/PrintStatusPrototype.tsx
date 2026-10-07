// PROTOTYPE (throwaway): desktop print page and status page variants behind ?variant=. A is the current pages; B to E are takes on the chosen C.
import { type Language, type PublicOrderView, type SummaryGroup } from '@darzikhata/domain';
import { ArrowLeft, Ban, Check, FileText, PackageCheck, Phone, Printer, Scissors, Share2, Tag, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { formatDate, formatMoney, translate } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { LanguageToggle } from '../../shell/ShellParts';
import { useShell } from '../../shell/ShellPreference';
import { initialsOf } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import type { ReceiptModel } from './receipt';

export const STATUS_VARIANTS = {
  A: 'Current page',
  B: 'Two columns: navy order card, garment cards',
  C: 'Navy banner, garment rows with trackers',
  D: 'Light header, progress ring, garments as a table',
  E: 'Banner and trackers, dates under the steps',
  F: 'Banner and trackers, Call beside the shop',
  G: 'Banner, garment cards with upright timelines',
};
const KEYS = Object.keys(STATUS_VARIANTS);

/** The print pages use the chosen layout (D: memo with a tear-off stub) on a desktop and stay as they are on a phone. */
export function useProtoVariant(): string {
  const { kind } = useShell();
  return kind === 'desktop' ? 'D' : 'A';
}

/** The status page variant: always A on a phone, so phones stay unchanged. */
export function useStatusVariant(): string {
  const { kind } = useShell();
  const v = useVariant(KEYS);
  return kind === 'desktop' ? v : 'A';
}

export function ProtoSwitcher() {
  const { kind } = useShell();
  return kind === 'desktop' ? <PrototypeSwitcher variants={STATUS_VARIANTS} /> : null;
}

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);

type DocKey = 'receipt' | 'job' | 'tags';
const DOCS: Array<{ key: DocKey; icon: LucideIcon; label: Parameters<typeof translate>[1] }> = [
  { key: 'receipt', icon: FileText, label: 'receipt.title' },
  { key: 'job', icon: Scissors, label: 'print.jobSlip' },
  { key: 'tags', icon: Tag, label: 'print.tags' },
];

/** Which order document this is, and links to its siblings that keep the variant. */
function useDocs() {
  const { orderId } = useParams();
  const { pathname, search } = useLocation();
  const current = DOCS.find((d) => pathname.startsWith(`/print/${d.key}/`))?.key ?? null;
  const to = (key: DocKey) => `/print/${key}/${orderId}${search}`;
  return { current: orderId ? current : null, to };
}

export interface ProtoFrameProps {
  variant: string;
  back: { to: string; label: string };
  title: string;
  language: Language;
  onLanguage(language: Language): void;
  onShare?: () => void;
  notice?: string | null;
  children: ReactNode;
}

const LANGS: Array<{ value: Language; label: string }> = [
  { value: 'bn', label: 'বাংলা' },
  { value: 'en', label: 'English' },
];

/** An A4 sheet on screen, plain paper when printed. */
function Sheet({ language, children }: { language: Language; children: ReactNode }) {
  return (
    <main
      lang={language}
      className="mx-auto w-[210mm] min-h-[297mm] bg-panel p-[14mm] text-ink shadow-xl ring-1 ring-line print:w-auto print:min-h-0 print:p-0 print:shadow-none print:ring-0"
    >
      {children}
    </main>
  );
}

function DocTabs({ dark = false }: { dark?: boolean }) {
  const { t } = useI18n();
  const docs = useDocs();
  if (!docs.current) return <span />;
  return (
    <nav aria-label={t('receipt.title')} className={`flex w-fit rounded-xl p-1 ${dark ? 'bg-navy-raised' : 'bg-line/60'}`}>
      {DOCS.map((d) => {
        const Icon = d.icon;
        const on = d.key === docs.current;
        const look = on
          ? dark
            ? 'bg-on-navy font-semibold text-navy shadow-sm'
            : 'bg-panel font-semibold text-brand-strong shadow-sm'
          : dark
            ? 'text-on-navy-muted hover:text-on-navy'
            : 'text-muted';
        return (
          <Link key={d.key} to={docs.to(d.key)} aria-current={on ? 'page' : undefined} className={`flex min-h-9 items-center gap-2 rounded-lg px-4 text-sm ${look}`}>
            <Icon size={16} aria-hidden="true" />
            {t(d.label)}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The top toolbar, in three takes: B and D put the tabs in the middle, C puts them beside the title,
 * E is the same as B on navy. Share now comes before the language choice.
 */
export function ProtoPrintFrame({ variant, back, title, language, onLanguage, onShare, notice, children }: ProtoFrameProps) {
  const { t } = useI18n();
  const dark = variant === 'E';
  const tabsLeft = variant === 'C';
  const backLink = (
    <Link
      to={back.to}
      aria-label={back.label}
      className={dark ? 'flex size-10 items-center justify-center rounded-xl text-on-navy ring-1 ring-white/30 hover:bg-white/15' : buttonClasses('secondary')}
    >
      <ArrowLeft size={16} aria-hidden="true" />
    </Link>
  );
  const actions = (
    <div className="flex items-center justify-end gap-2">
      {notice && (
        <p role="status" className={`text-sm font-semibold ${dark ? 'text-on-navy' : 'text-brand-strong'}`}>
          {notice}
        </p>
      )}
      {onShare && (
        <Button variant="secondary" onClick={onShare}>
          <Share2 size={16} aria-hidden="true" />
          {t('print.share')}
        </Button>
      )}
      <div className={`w-44 ${dark ? 'rounded-xl bg-panel' : ''}`}>
        <SegmentedControl legend={t('more.language')} value={language} options={LANGS} onChange={onLanguage} />
      </div>
      <Button onClick={() => window.print()}>
        <Printer size={16} aria-hidden="true" />
        {t('print.print')}
      </Button>
    </div>
  );
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header
        className={`no-print sticky top-0 z-10 items-center gap-4 px-5 py-3 ${dark ? 'bg-navy text-on-navy' : 'border-b border-line bg-panel/95 backdrop-blur'} ${
          tabsLeft ? 'flex' : 'grid grid-cols-[1fr_auto_1fr]'
        }`}
      >
        <div className={`flex min-w-0 items-center gap-3 ${tabsLeft ? 'flex-1' : ''}`}>
          {backLink}
          <span className="truncate font-display text-lg font-bold">{title}</span>
          {tabsLeft && (
            <>
              <span className="mx-1 h-6 w-px bg-line" />
              <DocTabs />
            </>
          )}
        </div>
        {!tabsLeft && <DocTabs dark={dark} />}
        {actions}
      </header>
      <div className="p-10 pb-28 print:p-0">
        <Sheet language={language}>{children}</Sheet>
      </div>
    </div>
  );
}

/* ---------------- Receipts: takes on the cash memo ---------------- */

function useDocT(language: Language) {
  return (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
}

function moneyRows(model: ReceiptModel, language: Language) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const rows: Array<{ key: string; label: string; note?: string; amount: number }> = [{ key: 'subtotal', label: t('money.subtotal'), amount: model.subtotal }];
  if (model.discount) rows.push({ key: 'discount', label: t('money.discount'), note: model.discount.reason, amount: -model.discount.amount });
  if (model.adjustments.length > 0)
    rows.push({ key: 'adjustments', label: t('money.adjustments'), note: model.adjustments.map((a) => a.reason).join(', '), amount: model.adjustmentsTotal });
  return rows;
}

function due(model: ReceiptModel, language: Language) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return model.creditDue > 0 ? { label: t('money.creditDue'), amount: model.creditDue } : { label: t('money.balance'), amount: model.balance };
}

function ShopTile({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-2xl bg-navy font-display font-bold text-on-navy ${className}`}>
      {initialsOf(name.split(/\s+/)[0] ?? '')}
    </span>
  );
}

const LEADER = 'min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-muted';

function PaymentsTable({ model, language, className = '' }: { model: ReceiptModel; language: Language; className?: string }) {
  const t = useDocT(language);
  return (
    <section className={className}>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('receipt.payments')}</h2>
      <table aria-label={t('receipt.payments')} className="w-full border-collapse text-left text-sm">
        <tbody>
          {model.payments.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <td className="py-1.5 pr-3">{formatDate(p.at, language)}</td>
              <td className="py-1.5 pr-3">{t(`receipt.kind.${p.kind}`)}</td>
              <td className="py-1.5 pr-3">{t(`method.${p.method}`)}</td>
              <td className="py-1.5 pr-3 text-muted">{p.reference}</td>
              <td className="py-1.5 text-right tabular-nums">{formatMoney(p.effect, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** The memo's top: B and D centre the shop, C puts it on a navy letterhead band, E splits shop and order details. */
function MemoHeader({ variant, model, language }: { variant: string; model: ReceiptModel; language: Language }) {
  const t = useDocT(language);
  if (variant === 'C') {
    return (
      <header className="flex items-center gap-4 rounded-2xl bg-navy px-6 py-5 text-on-navy print:rounded-none print:border-b-4 print:border-double print:border-ink print:bg-transparent print:px-0 print:text-ink">
        <ShopTile name={model.shop.name} className="size-14 bg-on-navy! text-2xl text-navy!" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl font-bold">{model.shop.name}</p>
          <p className="text-sm text-on-navy-muted print:text-muted">{[model.shop.address, model.shop.phone].filter(Boolean).join(' · ')}</p>
        </div>
        <h1 className="rounded-full border-2 border-current px-5 py-0.5 text-sm font-bold uppercase tracking-[0.2em]">{t('receipt.title')}</h1>
      </header>
    );
  }
  if (variant === 'E') {
    return (
      <header className="flex items-start justify-between gap-6 border-b-4 border-double border-ink pb-4">
        <div>
          <p className="font-display text-3xl font-bold">{model.shop.name}</p>
          {model.shop.address && <p className="text-muted">{model.shop.address}</p>}
          {model.shop.phone && <p className="text-muted">{model.shop.phone}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-muted">{t('receipt.title')}</h1>
          <p className="font-display text-3xl font-bold">{model.orderNumber}</p>
          <p className="text-sm">{formatDate(model.createdAt, language)}</p>
        </div>
      </header>
    );
  }
  return (
    <header className="text-center">
      <p className="font-display text-4xl font-bold">{model.shop.name}</p>
      {model.shop.address && <p className="mt-1 text-muted">{model.shop.address}</p>}
      {model.shop.phone && <p className="text-muted">{model.shop.phone}</p>}
      <h1 className="mx-auto mt-4 w-fit rounded-full border-2 border-ink px-5 py-0.5 text-sm font-bold uppercase tracking-[0.2em]">{t('receipt.title')}</h1>
    </header>
  );
}

/** The cash memo: shop, order and customer, dotted lines out to each price, the amount owed boxed, signatures or a stub. */
export function ProtoReceipt({ variant, model, language }: { variant: string; model: ReceiptModel; language: Language }) {
  const t = useDocT(language);
  const owed = due(model, language);
  const stub = variant === 'D';
  const orderLabel = t('receipt.orderNumber', { number: '' }).trim();
  return (
    <div className="mx-auto flex min-h-[269mm] max-w-[150mm] flex-col print:min-h-0">
      <MemoHeader variant={variant} model={model} language={language} />
      <div className={`grid grid-cols-2 gap-x-6 gap-y-1 py-3 text-sm ${variant === 'E' ? 'border-b border-ink' : 'mt-6 border-y-4 border-double border-ink'}`}>
        {variant !== 'E' && (
          <>
            <p>
              <span className="text-muted">{orderLabel}: </span>
              <b>{model.orderNumber}</b>
            </p>
            <p className="text-right">
              <span className="text-muted">{t('receipt.date')}: </span>
              <b>{formatDate(model.createdAt, language)}</b>
            </p>
          </>
        )}
        <p>
          <span className="text-muted">{pick(language, 'নাম', 'Name')}: </span>
          <b>{model.customer.name}</b>
        </p>
        <p className="text-right">{model.customer.phone}</p>
      </div>

      <ul aria-label={t('receipt.garments')} className="mt-4 space-y-3">
        {model.lines.map((line) => (
          <li key={line.itemId} className="print-block">
            <div className="flex items-end gap-2">
              <span className={`font-semibold ${line.cancelled ? 'line-through' : ''}`}>{line.garment}</span>
              {line.cancelled && <span className="text-xs font-semibold">({t('receipt.cancelled')})</span>}
              <span className={LEADER} />
              <span className={`tabular-nums ${line.cancelled ? 'line-through' : ''}`}>{formatMoney(line.price, language)}</span>
            </div>
            <p className="text-sm text-muted">
              {[line.wearer, line.deliveryDate && `${t('receipt.delivery')}: ${formatDate(line.deliveryDate, language)}`].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ul>

      <dl className="print-block mt-6 space-y-1.5 border-t-2 border-ink pt-3">
        {moneyRows(model, language).map((row) => (
          <div key={row.key} className="flex items-end gap-2">
            <dt>
              {row.label}
              {row.note && <span className="ml-1 text-xs text-muted">({row.note})</span>}
            </dt>
            <span className={LEADER} />
            <dd className="tabular-nums">{formatMoney(row.amount, language)}</dd>
          </div>
        ))}
        <div className="flex items-end gap-2 font-semibold">
          <dt>{t('money.total')}</dt>
          <span className={LEADER} />
          <dd className="tabular-nums">{formatMoney(model.total, language)}</dd>
        </div>
        <div className="flex items-end gap-2">
          <dt>{t('money.paid')}</dt>
          <span className={LEADER} />
          <dd className="tabular-nums">{formatMoney(model.paid, language)}</dd>
        </div>
        <div
          data-tour="receipt-balance"
          className={`!mt-3 flex items-center justify-between px-3 py-2 text-lg font-bold ${
            variant === 'C' ? 'rounded-lg bg-navy text-on-navy print:border-2 print:border-ink print:bg-transparent print:text-ink' : 'border-2 border-ink'
          }`}
        >
          <dt>{owed.label}</dt>
          <dd className="tabular-nums">{formatMoney(owed.amount, language)}</dd>
        </div>
      </dl>

      {model.payments.length > 0 && <PaymentsTable model={model} language={language} className="mt-6" />}

      {stub ? (
        <section aria-label={pick(language, 'গ্রাহকের অংশ', "Customer's slip")} className="print-block mt-auto pt-10">
          <div className="flex items-center gap-2 text-muted">
            <Scissors size={16} aria-hidden="true" />
            <span className="flex-1 border-t-2 border-dashed border-muted" />
          </div>
          <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-6 rounded-xl border-2 border-ink p-4">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{orderLabel}</p>
              <p className="font-display text-3xl font-bold">{model.orderNumber}</p>
            </div>
            <div className="text-sm">
              <p className="font-semibold">{model.customer.name}</p>
              <p>
                {model.lines.filter((l) => !l.cancelled).length} {pick(language, 'টি পোশাক', 'garments')}
              </p>
              {model.nextDelivery && (
                <p>
                  {t('receipt.delivery')}: <b>{formatDate(model.nextDelivery, language)}</b>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{owed.label}</p>
              <p className="font-display text-2xl font-bold tabular-nums">{formatMoney(owed.amount, language)}</p>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            {pick(language, 'পোশাক নিতে আসার সময় এই অংশটি সঙ্গে আনুন।', 'Bring this slip when you collect your garments.')}
          </p>
        </section>
      ) : (
        <div className="mt-auto grid grid-cols-2 gap-16 pt-16 text-center text-sm text-muted">
          <p className="border-t border-ink pt-1">{pick(language, 'গ্রাহকের স্বাক্ষর', "Customer's signature")}</p>
          <p className="border-t border-ink pt-1">{pick(language, 'দোকানের পক্ষে', 'For the shop')}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Status page: takes on the banner with trackers ---------------- */

export interface ProtoStatusProps {
  variant: string;
  view: PublicOrderView;
  headline: string;
  languageToggle: ReactNode;
}

type Item = PublicOrderView['items'][number];

function Bars({ counted }: { counted: Item[] }) {
  return (
    <div aria-hidden="true" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${counted.length}, minmax(0, 1fr))` }}>
      {counted.map((item, i) => (
        <span key={i} className={`h-2 rounded-full ${item.group === 'ready' || item.group === 'delivered' ? 'bg-tone-ready-dot' : 'bg-navy-raised'}`} />
      ))}
    </div>
  );
}

const reached = (group: SummaryGroup) => (group === 'delivered' ? 2 : group === 'ready' ? 1 : group === 'unfinished' ? 0 : -1);

function Dot({ s, at }: { s: number; at: number }) {
  return (
    <span
      className={`relative flex size-6 shrink-0 items-center justify-center rounded-full ${s <= at ? 'bg-tone-ready-dot text-white' : 'bg-line text-muted'} ${s === at ? 'ring-4 ring-tone-ready-bg' : ''}`}
    >
      {s < at || (s === at && at > 0) ? <Check size={14} aria-hidden="true" /> : <span className="size-2 rounded-full bg-current" />}
    </span>
  );
}

/**
 * The navy banner with each garment's three-step tracker. B is C as chosen; C adds the dates under the steps;
 * D splits the banner into two lines with the call button beside the shop; E shows garments as cards with an upright timeline.
 */
/** The status mockups: B and D are the first round's layouts, C, E, F and G are the banner with trackers and its takes. */
export function ProtoStatus(props: ProtoStatusProps) {
  if (props.variant === 'B') return <StatusTwoColumn {...props} />;
  if (props.variant === 'D') return <StatusTable {...props} />;
  const take = ({ C: 'B', E: 'C', F: 'D', G: 'E' } as Record<string, string>)[props.variant] ?? 'B';
  return <BannerStatus {...props} variant={take} />;
}

function BannerStatus({ variant, view, headline }: ProtoStatusProps) {
  const { t, label, date, dateTime, language } = useI18n();
  const counted = view.items.filter((item) => item.group !== 'cancelled');
  const stateText = (item: Item) =>
    item.group === 'unfinished' ? t('status.state.unfinished', { stage: label(item.stageLabel) }) : t(`status.group.${item.group}`);
  const steps = [pick(language, 'তৈরি হচ্ছে', 'Making'), pick(language, 'রেডি', 'Ready'), pick(language, 'ডেলিভারি', 'Delivered')];
  const stepDate = (item: Item, s: number) => (s === 0 && item.trialDate ? t('item.trial', { date: date(item.trialDate) }) : s === 2 && item.deliveryDate ? date(item.deliveryDate) : null);
  const call = view.shop.phone ? (
    <a href={`tel:${view.shop.phone}`} className={`${buttonClasses('primary', 'lg')} shrink-0 rounded-2xl! bg-on-navy! text-navy!`}>
      <Phone aria-hidden="true" size={20} />
      {t('status.call')}
    </a>
  ) : null;
  const shop = (
    <>
      <ShopTile name={view.shop.name} className="size-11 bg-on-navy! text-xl text-navy!" />
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-lg font-semibold">{view.shop.name}</h1>
        {view.shop.address && <p className="text-sm text-on-navy-muted">{view.shop.address}</p>}
      </div>
    </>
  );
  const width = variant === 'E' ? 'max-w-5xl' : 'max-w-4xl';

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="bg-navy text-on-navy">
        <div className={`mx-auto ${width} px-8 pt-6 pb-10`}>
          <div className="flex items-center gap-3">
            {shop}
            {variant === 'D' && call}
            <LanguageToggle onDark />
          </div>
          <div className="mt-10 flex items-end justify-between gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-on-navy-muted">{t('status.yourOrder', { number: view.orderNumber })}</p>
              <h2 className="mb-4 font-display text-4xl leading-tight font-bold">{headline}</h2>
              {counted.length > 0 && <Bars counted={counted} />}
            </div>
            {variant !== 'D' && call}
          </div>
        </div>
      </header>
      <main className={`mx-auto -mt-4 ${width} px-8 pb-10`}>
        {variant === 'E' ? (
          <ul aria-label={t('status.garments')} className="grid grid-cols-3 gap-3">
            {view.items.map((item, i) => {
              const at = reached(item.group);
              return (
                <li key={i} className="rounded-2xl bg-panel p-5 shadow-sm ring-1 ring-line">
                  <p className="text-lg font-semibold">{label(item.garmentName)}</p>
                  <p className="text-sm text-muted">{item.wearer ?? stateText(item)}</p>
                  {at < 0 ? (
                    <p className="mt-4 font-semibold text-muted">{t('status.group.cancelled')}</p>
                  ) : (
                    <ol aria-label={stateText(item)} className="mt-4">
                      {steps.map((step, s) => (
                        <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
                          {s < 2 && <span className={`absolute left-3 top-6 h-full w-0.5 -translate-x-1/2 ${s < at ? 'bg-tone-ready-dot' : 'bg-line'}`} />}
                          <Dot s={s} at={at} />
                          <div className="text-sm">
                            <p className={s === at ? 'font-semibold' : 'text-muted'}>{s === at && s === 0 ? stateText(item) : step}</p>
                            {stepDate(item, s) && <p className="text-xs text-muted">{stepDate(item, s)}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <ul aria-label={t('status.garments')} className="flex flex-col gap-3">
            {view.items.map((item, i) => {
              const at = reached(item.group);
              const withDates = variant === 'C';
              return (
                <li key={i} className="grid grid-cols-[1fr_360px] items-center gap-8 rounded-2xl bg-panel p-5 shadow-sm ring-1 ring-line">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{label(item.garmentName)}</p>
                    <p className="text-sm text-muted">{[item.wearer, stateText(item)].filter(Boolean).join(' · ')}</p>
                    {!withDates && (
                      <p className="text-sm text-muted">
                        {[item.trialDate && t('item.trial', { date: date(item.trialDate) }), item.deliveryDate && t('item.delivery', { date: date(item.deliveryDate) })]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  {at < 0 ? (
                    <p className="text-center font-semibold text-muted">{t('status.group.cancelled')}</p>
                  ) : (
                    <ol aria-label={stateText(item)} className="grid grid-cols-3">
                      {steps.map((step, s) => (
                        <li key={s} className="relative flex flex-col items-center gap-1.5 text-center text-xs">
                          {s > 0 && <span className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${s <= at ? 'bg-tone-ready-dot' : 'bg-line'}`} />}
                          <Dot s={s} at={at} />
                          <span className={s === at ? 'font-semibold' : 'text-muted'}>{step}</span>
                          {withDates && stepDate(item, s) && <span className="text-muted">{stepDate(item, s)}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-center text-sm text-muted">
          {t('status.updated', { date: dateTime(view.lastUpdatedAt) })}. {t('status.privacy')}
        </p>
        {variant === 'D' && view.shop.phone && <p className="mt-1 text-center text-sm text-muted">{t('status.phone', { phone: view.shop.phone })}</p>}
      </main>
    </div>
  );
}

const LOOK: Record<SummaryGroup, { icon: LucideIcon; chip: string }> = {
  unfinished: { icon: Scissors, chip: 'bg-tone-working-bg text-tone-working-fg' },
  ready: { icon: Check, chip: 'bg-tone-ready-bg text-tone-ready-fg' },
  delivered: { icon: PackageCheck, chip: 'bg-tone-done-bg text-tone-done-fg' },
  cancelled: { icon: Ban, chip: 'bg-tone-cancelled-bg text-tone-cancelled-fg' },
};

function useStatusText(view: PublicOrderView) {
  const { t, label } = useI18n();
  const counted = view.items.filter((item) => item.group !== 'cancelled');
  const done = counted.filter((item) => item.group === 'ready' || item.group === 'delivered').length;
  const stateText = (item: PublicOrderView['items'][number]) =>
    item.group === 'unfinished' ? t('status.state.unfinished', { stage: label(item.stageLabel) }) : t(`status.group.${item.group}`);
  return { counted, done, stateText };
}

function CallButton({ phone, className = '' }: { phone: string; className?: string }) {
  const { t } = useI18n();
  return (
    <a href={`tel:${phone}`} className={`${buttonClasses('primary', 'lg')} ${className}`}>
      <Phone aria-hidden="true" size={20} />
      {t('status.call')}
    </a>
  );
}

/** B: the navy order card stays on the left with the call button; the garments are cards on the right. */
function StatusTwoColumn({ view, headline, languageToggle }: ProtoStatusProps) {
  const { t, label, date, dateTime } = useI18n();
  const { counted, stateText } = useStatusText(view);
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <main className="mx-auto grid max-w-6xl grid-cols-[400px_1fr] items-start gap-8 px-8 py-10">
        <section className="sticky top-10 rounded-[28px] bg-navy p-7 text-on-navy ring-1 ring-inset ring-navy-line">
          <div className="flex items-center gap-3">
            <ShopTile name={view.shop.name} className="size-12 bg-on-navy! text-xl text-navy!" />
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold">{view.shop.name}</h1>
              {view.shop.address && <p className="text-sm text-on-navy-muted">{view.shop.address}</p>}
            </div>
          </div>
          <p className="mt-8 text-sm text-on-navy-muted">{t('status.yourOrder', { number: view.orderNumber })}</p>
          <h2 className="mb-4 font-display text-3xl leading-tight font-bold">{headline}</h2>
          {counted.length > 0 && <Bars counted={counted} />}
          {view.shop.phone && (
            <>
              <CallButton phone={view.shop.phone} className="mt-8 w-full rounded-2xl!" />
              <p className="mt-2 text-center text-sm text-on-navy-muted">{view.shop.phone}</p>
            </>
          )}
        </section>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">{t('status.garments')}</h2>
            {languageToggle}
          </div>
          <ul aria-label={t('status.garments')} className="grid grid-cols-2 gap-3">
            {view.items.map((item, i) => {
              const look = LOOK[item.group];
              const Icon = look.icon;
              return (
                <li key={i} className="flex flex-col gap-3 rounded-2xl bg-panel p-5 ring-1 ring-line">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-full ${look.chip}`}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{label(item.garmentName)}</p>
                      {item.wearer && <p className="text-sm text-muted">{item.wearer}</p>}
                    </div>
                  </div>
                  <p className="font-semibold">{stateText(item)}</p>
                  <div className="flex gap-4 text-sm text-muted">
                    {item.trialDate && <span>{t('item.trial', { date: date(item.trialDate) })}</span>}
                    {item.deliveryDate && <span>{t('item.delivery', { date: date(item.deliveryDate) })}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-sm text-muted">
            {t('status.updated', { date: dateTime(view.lastUpdatedAt) })}. {t('status.privacy')}
          </p>
        </div>
      </main>
    </div>
  );
}

/** C: a full-width navy banner, then each garment with a three-step tracker. */
/** D: a light header with the call button, a progress ring beside the headline, and the garments as one table. */
function StatusTable({ view, headline, languageToggle }: ProtoStatusProps) {
  const { t, label, date, dateTime, number, language } = useI18n();
  const { counted, done, stateText } = useStatusText(view);
  const share = counted.length ? done / counted.length : 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-8 py-4">
          <ShopTile name={view.shop.name} className="size-10 text-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold leading-tight">{view.shop.name}</h1>
            {view.shop.address && <p className="text-sm text-muted">{view.shop.address}</p>}
          </div>
          {languageToggle}
          {view.shop.phone && <CallButton phone={view.shop.phone} className="rounded-xl!" />}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-8 py-10">
        <section className="flex items-center gap-6">
          <svg viewBox="0 0 80 80" className="size-24 shrink-0 -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-line" />
            <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * share} ${c}`} className="stroke-tone-ready-dot" />
            <text x="40" y="40" textAnchor="middle" dominantBaseline="central" className="rotate-90 fill-ink text-lg font-bold" style={{ transformOrigin: '40px 40px' }}>
              {number(done)}/{number(counted.length)}
            </text>
          </svg>
          <div>
            <p className="text-muted">{t('status.yourOrder', { number: view.orderNumber })}</p>
            <h2 className="font-display text-4xl leading-tight font-bold">{headline}</h2>
          </div>
        </section>
        <div className="mt-8 overflow-hidden rounded-2xl bg-panel ring-1 ring-line">
          <table aria-label={t('status.garments')} className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">{t('receipt.garment')}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{t('receipt.wearer')}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{pick(language, 'অবস্থা', 'Status')}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{t('print.trial')}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{t('receipt.delivery')}</th>
              </tr>
            </thead>
            <tbody>
              {view.items.map((item, i) => {
                const look = LOOK[item.group];
                const Icon = look.icon;
                return (
                  <tr key={i} className="border-t border-line">
                    <td className="px-5 py-4 font-semibold">{label(item.garmentName)}</td>
                    <td className="px-5 py-4 text-muted">{item.wearer ?? ''}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${look.chip}`}>
                        <Icon size={14} aria-hidden="true" />
                        {stateText(item)}
                      </span>
                    </td>
                    <td className="px-5 py-4">{item.trialDate ? date(item.trialDate) : ''}</td>
                    <td className="px-5 py-4">{item.deliveryDate ? date(item.deliveryDate) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted">
          {t('status.updated', { date: dateTime(view.lastUpdatedAt) })}. {t('status.privacy')}
        </p>
      </main>
    </div>
  );
}
