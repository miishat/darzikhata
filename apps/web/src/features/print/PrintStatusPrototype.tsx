// PROTOTYPE (throwaway): desktop print page and status page variants behind ?variant=. A is the current pages.
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

export const PROTO_VARIANTS = {
  A: 'Current pages',
  B: 'Side rail + A4 sheet, two-column status',
  C: 'Top tabs + cash memo, banner status with trackers',
  D: 'Floating toolbar + invoice, status as a table',
};
const KEYS = Object.keys(PROTO_VARIANTS);

/** The variant to show: always A on a phone, so phones stay unchanged. */
export function useProtoVariant(): string {
  const { kind } = useShell();
  const v = useVariant(KEYS);
  return kind === 'desktop' ? v : 'A';
}

export function ProtoSwitcher() {
  const { kind } = useShell();
  return kind === 'desktop' ? <PrototypeSwitcher variants={PROTO_VARIANTS} /> : null;
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
function Sheet({ language, children, className = '' }: { language: Language; children: ReactNode; className?: string }) {
  return (
    <main
      lang={language}
      className={`mx-auto w-[210mm] min-h-[297mm] bg-panel p-[14mm] text-ink shadow-xl ring-1 ring-line print:w-auto print:min-h-0 print:p-0 print:shadow-none print:ring-0 ${className}`}
    >
      {children}
    </main>
  );
}

export function ProtoPrintFrame(props: ProtoFrameProps) {
  if (props.variant === 'B') return <RailFrame {...props} />;
  if (props.variant === 'C') return <TabsFrame {...props} />;
  return <FloatFrame {...props} />;
}

/** B: a left rail with the documents, language and actions; the sheet sits on a desk. */
function RailFrame({ back, title, language, onLanguage, onShare, notice, children }: ProtoFrameProps) {
  const { t } = useI18n();
  const docs = useDocs();
  return (
    <div className="flex h-dvh bg-surface text-ink print:block print:h-auto">
      <aside className="no-print flex w-72 shrink-0 flex-col gap-5 border-r border-line bg-panel p-5">
        <Link to={back.to} className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {docs.current && (
          <nav aria-label={t('receipt.title')} className="flex flex-col gap-1">
            {DOCS.map((d) => {
              const Icon = d.icon;
              const on = d.key === docs.current;
              return (
                <Link
                  key={d.key}
                  to={docs.to(d.key)}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${on ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:bg-surface'}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {t(d.label)}
                </Link>
              );
            })}
          </nav>
        )}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{t('more.language')}</p>
          <SegmentedControl legend={t('more.language')} value={language} options={LANGS} onChange={onLanguage} />
        </div>
        <div className="mt-auto flex flex-col gap-2">
          {notice && (
            <p role="status" className="text-center text-sm font-semibold text-brand-strong">
              {notice}
            </p>
          )}
          {onShare && (
            <Button variant="secondary" className="w-full" onClick={onShare}>
              <Share2 size={16} aria-hidden="true" />
              {t('print.share')}
            </Button>
          )}
          <Button size="lg" className="w-full" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            {t('print.print')}
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-auto p-10 pb-28 print:overflow-visible print:p-0">
        <Sheet language={language}>{children}</Sheet>
      </div>
    </div>
  );
}

/** C: one toolbar along the top with the documents as tabs in the middle. */
function TabsFrame({ back, title, language, onLanguage, onShare, notice, children }: ProtoFrameProps) {
  const { t } = useI18n();
  const docs = useDocs();
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="no-print sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-panel/95 px-5 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={back.to} aria-label={back.label} className={buttonClasses('secondary')}>
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
          <span className="truncate font-display text-lg font-bold">{title}</span>
        </div>
        {docs.current ? (
          <nav aria-label={t('receipt.title')} className="flex rounded-xl bg-line/60 p-1">
            {DOCS.map((d) => {
              const Icon = d.icon;
              const on = d.key === docs.current;
              return (
                <Link
                  key={d.key}
                  to={docs.to(d.key)}
                  aria-current={on ? 'page' : undefined}
                  className={`flex min-h-9 items-center gap-2 rounded-lg px-4 text-sm ${on ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted'}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {t(d.label)}
                </Link>
              );
            })}
          </nav>
        ) : (
          <span />
        )}
        <div className="flex items-center justify-end gap-2">
          {notice && (
            <p role="status" className="text-sm font-semibold text-brand-strong">
              {notice}
            </p>
          )}
          <div className="w-44">
            <SegmentedControl legend={t('more.language')} value={language} options={LANGS} onChange={onLanguage} />
          </div>
          {onShare && (
            <Button variant="secondary" onClick={onShare}>
              <Share2 size={16} aria-hidden="true" />
              {t('print.share')}
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            {t('print.print')}
          </Button>
        </div>
      </header>
      <div className="p-10 pb-28 print:p-0">
        <Sheet language={language}>{children}</Sheet>
      </div>
    </div>
  );
}

/** D: no chrome around the paper, just a floating pill in the top corner. */
function FloatFrame({ back, title, language, onLanguage, onShare, notice, children }: ProtoFrameProps) {
  const { t } = useI18n();
  const docs = useDocs();
  return (
    <div className="min-h-dvh bg-panel text-ink">
      <div className="no-print fixed left-5 top-5 z-10">
        <Link to={back.to} className={`${buttonClasses('secondary')} rounded-full! shadow-lg`}>
          <ArrowLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      </div>
      <div
        role="toolbar"
        aria-label={title}
        className="no-print fixed right-5 top-5 z-10 flex items-center gap-1 rounded-full bg-panel-raised p-1.5 shadow-xl ring-1 ring-line"
      >
        {docs.current &&
          DOCS.map((d) => {
            const Icon = d.icon;
            const on = d.key === docs.current;
            return (
              <Link
                key={d.key}
                to={docs.to(d.key)}
                aria-current={on ? 'page' : undefined}
                title={t(d.label)}
                className={`flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold ${on ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:bg-surface'}`}
              >
                <Icon size={16} aria-hidden="true" />
                {on && t(d.label)}
              </Link>
            );
          })}
        {docs.current && <span className="mx-1 h-6 w-px bg-line" />}
        <button
          type="button"
          onClick={() => onLanguage(language === 'bn' ? 'en' : 'bn')}
          className="h-9 rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface"
        >
          {language === 'bn' ? 'English' : 'বাংলা'}
        </button>
        {onShare && (
          <button type="button" aria-label={t('print.share')} onClick={onShare} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface">
            <Share2 size={16} aria-hidden="true" />
          </button>
        )}
        <Button className="rounded-full!" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" />
          {t('print.print')}
        </Button>
      </div>
      {notice && (
        <p role="status" className="no-print fixed right-6 top-20 z-10 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-panel">
          {notice}
        </p>
      )}
      <main lang={language} className="mx-auto max-w-[210mm] px-[14mm] pt-24 pb-28 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}

/* ---------------- Receipts ---------------- */

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

export function ProtoReceipt({ variant, model, language }: { variant: string; model: ReceiptModel; language: Language }) {
  if (variant === 'B') return <ReceiptB model={model} language={language} />;
  if (variant === 'C') return <ReceiptC model={model} language={language} />;
  return <ReceiptD model={model} language={language} />;
}

/** B: a branded header, the customer, a clean garment table and a totals card with the balance highlighted. */
function ReceiptB({ model, language }: { model: ReceiptModel; language: Language }) {
  const t = useDocT(language);
  const owed = due(model, language);
  return (
    <div className="flex min-h-[269mm] flex-col print:min-h-0">
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-5">
        <div className="flex items-center gap-4">
          <ShopTile name={model.shop.name} className="size-14 text-2xl" />
          <div>
            <p className="font-display text-2xl font-bold">{model.shop.name}</p>
            {model.shop.address && <p className="text-sm text-muted">{model.shop.address}</p>}
            {model.shop.phone && <p className="text-sm text-muted">{model.shop.phone}</p>}
          </div>
        </div>
        <div className="text-right">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-brand-strong">{t('receipt.title')}</h1>
          <p className="mt-1 font-semibold">{t('receipt.orderNumber', { number: model.orderNumber })}</p>
          <p className="text-sm text-muted">{formatDate(model.createdAt, language)}</p>
        </div>
      </header>

      <section className="mt-5 rounded-xl bg-surface p-4 print:border print:border-line">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{pick(language, 'গ্রাহক', 'Customer')}</p>
        <p className="text-lg font-semibold">{model.customer.name}</p>
        {model.customer.phone && <p className="text-sm text-muted">{model.customer.phone}</p>}
      </section>

      <table aria-label={t('receipt.garments')} className="mt-6 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-ink text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="py-2 pr-3 font-semibold">{t('receipt.garment')}</th>
            <th scope="col" className="py-2 pr-3 font-semibold">{t('receipt.wearer')}</th>
            <th scope="col" className="py-2 pr-3 font-semibold">{t('receipt.delivery')}</th>
            <th scope="col" className="py-2 text-right font-semibold">{t('receipt.price')}</th>
          </tr>
        </thead>
        <tbody>
          {model.lines.map((line) => (
            <tr key={line.itemId} className="border-b border-line">
              <td className="py-3 pr-3 font-semibold">
                <span className={line.cancelled ? 'line-through' : ''}>{line.garment}</span>
                {line.cancelled && <span className="ml-2 rounded bg-surface px-1.5 text-xs">{t('receipt.cancelled')}</span>}
              </td>
              <td className="py-3 pr-3">{line.wearer ?? ''}</td>
              <td className="py-3 pr-3">{line.deliveryDate ? formatDate(line.deliveryDate, language) : ''}</td>
              <td className={`py-3 text-right tabular-nums ${line.cancelled ? 'line-through' : ''}`}>{formatMoney(line.price, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-block mt-6 ml-auto w-80">
        <dl className="space-y-2">
          {moneyRows(model, language).map((row) => (
            <div key={row.key} className="flex justify-between gap-3">
              <dt>
                {row.label}
                {row.note && <span className="ml-1 text-xs text-muted">({row.note})</span>}
              </dt>
              <dd className="tabular-nums">{formatMoney(row.amount, language)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-ink pt-2 font-semibold">
            <dt>{t('money.total')}</dt>
            <dd className="tabular-nums">{formatMoney(model.total, language)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>{t('money.paid')}</dt>
            <dd className="tabular-nums">{formatMoney(model.paid, language)}</dd>
          </div>
        </dl>
        <div data-tour="receipt-balance" className="mt-3 flex items-center justify-between rounded-xl bg-brand-soft px-4 py-3 text-brand-strong print:border-2 print:border-ink print:text-ink">
          <span className="font-semibold">{owed.label}</span>
          <span className="font-display text-2xl font-bold tabular-nums">{formatMoney(owed.amount, language)}</span>
        </div>
      </div>

      {model.payments.length > 0 && <PaymentsTable model={model} language={language} className="mt-8" />}

      <footer className="mt-auto pt-10 text-center text-sm text-muted">{pick(language, 'আমাদের দোকানে অর্ডার দেওয়ার জন্য ধন্যবাদ।', 'Thank you for your order.')}</footer>
    </div>
  );
}

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

/** C: a classic cash memo with a centred shop name, dotted lines to the prices and a signature line. */
function ReceiptC({ model, language }: { model: ReceiptModel; language: Language }) {
  const t = useDocT(language);
  const owed = due(model, language);
  const leader = 'min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-muted';
  return (
    <div className="mx-auto max-w-[150mm]">
      <header className="text-center">
        <p className="font-display text-4xl font-bold">{model.shop.name}</p>
        {model.shop.address && <p className="mt-1 text-muted">{model.shop.address}</p>}
        {model.shop.phone && <p className="text-muted">{model.shop.phone}</p>}
        <h1 className="mx-auto mt-4 w-fit rounded-full border-2 border-ink px-5 py-0.5 text-sm font-bold uppercase tracking-[0.2em]">{t('receipt.title')}</h1>
      </header>
      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 border-y-4 border-double border-ink py-3 text-sm">
        <p>
          <span className="text-muted">{t('receipt.orderNumber', { number: '' }).trim()}: </span>
          <b>{model.orderNumber}</b>
        </p>
        <p className="text-right">
          <span className="text-muted">{t('receipt.date')}: </span>
          <b>{formatDate(model.createdAt, language)}</b>
        </p>
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
              <span className={leader} />
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
            <span className={leader} />
            <dd className="tabular-nums">{formatMoney(row.amount, language)}</dd>
          </div>
        ))}
        <div className="flex items-end gap-2 font-semibold">
          <dt>{t('money.total')}</dt>
          <span className={leader} />
          <dd className="tabular-nums">{formatMoney(model.total, language)}</dd>
        </div>
        <div className="flex items-end gap-2">
          <dt>{t('money.paid')}</dt>
          <span className={leader} />
          <dd className="tabular-nums">{formatMoney(model.paid, language)}</dd>
        </div>
        <div data-tour="receipt-balance" className="!mt-3 flex items-center justify-between border-2 border-ink px-3 py-2 text-lg font-bold">
          <dt>{owed.label}</dt>
          <dd className="tabular-nums">{formatMoney(owed.amount, language)}</dd>
        </div>
      </dl>

      {model.payments.length > 0 && <PaymentsTable model={model} language={language} className="mt-6" />}

      <div className="mt-16 grid grid-cols-2 gap-16 text-center text-sm text-muted">
        <p className="border-t border-ink pt-1">{pick(language, 'গ্রাহকের স্বাক্ষর', "Customer's signature")}</p>
        <p className="border-t border-ink pt-1">{pick(language, 'দোকানের পক্ষে', 'For the shop')}</p>
      </div>
    </div>
  );
}

/** D: a modern invoice that leads with what is owed, then the garments with their stage. */
function ReceiptD({ model, language }: { model: ReceiptModel; language: Language }) {
  const t = useDocT(language);
  const owed = due(model, language);
  return (
    <div>
      <header className="flex items-center gap-3">
        <ShopTile name={model.shop.name} className="size-10 text-lg" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight">{model.shop.name}</p>
          <p className="text-sm text-muted">{[model.shop.address, model.shop.phone].filter(Boolean).join(' · ')}</p>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-[1fr_auto] items-end gap-6">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('receipt.title')}</h1>
          <p className="font-display text-5xl font-bold">{model.orderNumber}</p>
        </div>
        <div data-tour="receipt-balance" className="text-right">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">{owed.label}</p>
          <p className="font-display text-5xl font-bold text-brand-strong tabular-nums print:text-ink">{formatMoney(owed.amount, language)}</p>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-4 gap-4 rounded-2xl border border-line p-4 text-sm">
        <div>
          <dt className="text-muted">{pick(language, 'গ্রাহক', 'Customer')}</dt>
          <dd className="font-semibold">{model.customer.name}</dd>
          {model.customer.phone && <dd>{model.customer.phone}</dd>}
        </div>
        <div>
          <dt className="text-muted">{t('receipt.date')}</dt>
          <dd className="font-semibold">{formatDate(model.createdAt, language)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t('receipt.delivery')}</dt>
          <dd className="font-semibold">{model.nextDelivery ? formatDate(model.nextDelivery, language) : ''}</dd>
        </div>
        <div>
          <dt className="text-muted">{t('money.total')}</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(model.total, language)}</dd>
        </div>
      </dl>

      <table aria-label={t('receipt.garments')} className="mt-8 w-full border-collapse text-left">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="pb-2 pr-3 font-semibold">{t('receipt.garment')}</th>
            <th scope="col" className="pb-2 pr-3 font-semibold">{t('receipt.wearer')}</th>
            <th scope="col" className="pb-2 pr-3 font-semibold">{pick(language, 'অবস্থা', 'Stage')}</th>
            <th scope="col" className="pb-2 pr-3 font-semibold">{t('receipt.delivery')}</th>
            <th scope="col" className="pb-2 text-right font-semibold">{t('receipt.price')}</th>
          </tr>
        </thead>
        <tbody>
          {model.lines.map((line) => (
            <tr key={line.itemId} className="border-t border-line">
              <td className={`py-3 pr-3 font-semibold ${line.cancelled ? 'line-through' : ''}`}>{line.garment}</td>
              <td className="py-3 pr-3">{line.wearer ?? ''}</td>
              <td className="py-3 pr-3">
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-sm print:border print:border-line">{line.cancelled ? t('receipt.cancelled') : line.stage}</span>
              </td>
              <td className="py-3 pr-3">{line.deliveryDate ? formatDate(line.deliveryDate, language) : ''}</td>
              <td className={`py-3 text-right tabular-nums ${line.cancelled ? 'line-through' : ''}`}>{formatMoney(line.price, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-block mt-6 grid grid-cols-2 gap-10">
        <div>{model.payments.length > 0 && <PaymentsTable model={model} language={language} />}</div>
        <dl className="space-y-2">
          {moneyRows(model, language).map((row) => (
            <div key={row.key} className="flex justify-between gap-3">
              <dt className="text-muted">
                {row.label}
                {row.note && <span className="ml-1 text-xs">({row.note})</span>}
              </dt>
              <dd className="tabular-nums">{formatMoney(row.amount, language)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 font-semibold">
            <dt>{t('money.total')}</dt>
            <dd className="tabular-nums">{formatMoney(model.total, language)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t('money.paid')}</dt>
            <dd className="tabular-nums">{formatMoney(model.paid, language)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t-2 border-ink pt-2 text-lg font-bold">
            <dt>{owed.label}</dt>
            <dd className="tabular-nums">{formatMoney(owed.amount, language)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* ---------------- Status page ---------------- */

const LOOK: Record<SummaryGroup, { icon: LucideIcon; chip: string }> = {
  unfinished: { icon: Scissors, chip: 'bg-tone-working-bg text-tone-working-fg' },
  ready: { icon: Check, chip: 'bg-tone-ready-bg text-tone-ready-fg' },
  delivered: { icon: PackageCheck, chip: 'bg-tone-done-bg text-tone-done-fg' },
  cancelled: { icon: Ban, chip: 'bg-tone-cancelled-bg text-tone-cancelled-fg' },
};

export interface ProtoStatusProps {
  variant: string;
  view: PublicOrderView;
  headline: string;
  languageToggle: ReactNode;
}

export function ProtoStatus(props: ProtoStatusProps) {
  if (props.variant === 'B') return <StatusB {...props} />;
  if (props.variant === 'C') return <StatusC {...props} />;
  return <StatusD {...props} />;
}

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

function Bars({ counted }: { counted: PublicOrderView['items'] }) {
  return (
    <div aria-hidden="true" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${counted.length}, minmax(0, 1fr))` }}>
      {counted.map((item, i) => (
        <span key={i} className={`h-2 rounded-full ${item.group === 'ready' || item.group === 'delivered' ? 'bg-tone-ready-dot' : 'bg-navy-raised'}`} />
      ))}
    </div>
  );
}

/** B: the navy order card stays on the left with the call button; the garments are cards on the right. */
function StatusB({ view, headline, languageToggle }: ProtoStatusProps) {
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
function StatusC({ view, headline }: ProtoStatusProps) {
  const { t, label, date, dateTime, language } = useI18n();
  const { counted, stateText } = useStatusText(view);
  const steps = [pick(language, 'তৈরি হচ্ছে', 'Making'), pick(language, 'রেডি', 'Ready'), pick(language, 'ডেলিভারি', 'Delivered')];
  const reached = (group: SummaryGroup) => (group === 'delivered' ? 2 : group === 'ready' ? 1 : group === 'unfinished' ? 0 : -1);
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="bg-navy text-on-navy">
        <div className="mx-auto max-w-4xl px-8 pt-6 pb-10">
          <div className="flex items-center gap-3">
            <ShopTile name={view.shop.name} className="size-11 bg-on-navy! text-xl text-navy!" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-semibold">{view.shop.name}</h1>
              {view.shop.address && <p className="text-sm text-on-navy-muted">{view.shop.address}</p>}
            </div>
            <LanguageToggle onDark />
          </div>
          <div className="mt-10 flex items-end justify-between gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-on-navy-muted">{t('status.yourOrder', { number: view.orderNumber })}</p>
              <h2 className="mb-4 font-display text-4xl leading-tight font-bold">{headline}</h2>
              {counted.length > 0 && <Bars counted={counted} />}
            </div>
            {view.shop.phone && <CallButton phone={view.shop.phone} className="shrink-0 rounded-2xl! bg-on-navy! text-navy!" />}
          </div>
        </div>
      </header>
      <main className="mx-auto -mt-4 max-w-4xl px-8 pb-10">
        <ul aria-label={t('status.garments')} className="flex flex-col gap-3">
          {view.items.map((item, i) => {
            const at = reached(item.group);
            return (
              <li key={i} className="grid grid-cols-[1fr_340px] items-center gap-8 rounded-2xl bg-panel p-5 shadow-sm ring-1 ring-line">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{label(item.garmentName)}</p>
                  <p className="text-sm text-muted">{[item.wearer, stateText(item)].filter(Boolean).join(' · ')}</p>
                  <p className="text-sm text-muted">
                    {[item.trialDate && t('item.trial', { date: date(item.trialDate) }), item.deliveryDate && t('item.delivery', { date: date(item.deliveryDate) })]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {at < 0 ? (
                  <p className="text-center font-semibold text-muted">{t('status.group.cancelled')}</p>
                ) : (
                  <ol aria-label={stateText(item)} className="grid grid-cols-3">
                    {steps.map((step, s) => (
                      <li key={s} className="relative flex flex-col items-center gap-1.5 text-center text-xs">
                        {s > 0 && <span className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${s <= at ? 'bg-tone-ready-dot' : 'bg-line'}`} />}
                        <span
                          className={`relative flex size-6 items-center justify-center rounded-full ${s <= at ? 'bg-tone-ready-dot text-white' : 'bg-line text-muted'} ${s === at ? 'ring-4 ring-tone-ready-bg' : ''}`}
                        >
                          {s < at || (s === at && at > 0) ? <Check size={14} aria-hidden="true" /> : <span className="size-2 rounded-full bg-current" />}
                        </span>
                        <span className={s === at ? 'font-semibold' : 'text-muted'}>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-center text-sm text-muted">
          {t('status.updated', { date: dateTime(view.lastUpdatedAt) })}. {t('status.privacy')}
        </p>
      </main>
    </div>
  );
}

/** D: a light header with the call button, a progress ring beside the headline, and the garments as one table. */
function StatusD({ view, headline, languageToggle }: ProtoStatusProps) {
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
