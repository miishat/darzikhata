// PROTOTYPE (throwaway): phone layouts for the receipt's print preview, behind ?variant=.
import type { Language } from '@darzikhata/domain';
import { ArrowLeft, Printer, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatDate, formatMoney, translate } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';
import type { ReceiptModel } from './receipt';
import { ReceiptMemo } from './ReceiptMemo';

export const RECEIPT_PRINT_VARIANTS = {
  A: 'Current',
  B: 'Desktop cash memo in a card',
  C: 'Phone cash memo',
  D: 'Amount owed first, share bar',
} as const;

const LANGUAGES: Array<{ language: Language; name: string }> = [
  { language: 'bn', name: 'বাংলা' },
  { language: 'en', name: 'English' },
];

export interface ReceiptPrintProps {
  variant: string;
  back: { to: string; label: string };
  model: ReceiptModel;
  language: Language;
  onLanguage(language: Language): void;
  onShare(): void;
  notice: string | null;
}

export function ReceiptPrintPrototype(props: ReceiptPrintProps) {
  if (props.variant === 'B') return <Frame {...props}><ReceiptMemo model={props.model} language={props.language} /></Frame>;
  if (props.variant === 'C') return <Frame {...props}><PhoneMemo model={props.model} language={props.language} /></Frame>;
  return (
    <Frame {...props} bottom>
      <PhoneMemo model={props.model} language={props.language} owedFirst />
    </Frame>
  );
}

function LanguageToggle({ language, onLanguage }: { language: Language; onLanguage(l: Language): void }) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t('print.paperLanguage')} className="flex rounded-xl bg-line/60 p-1">
      {LANGUAGES.map((o) => {
        const on = language === o.language;
        return (
          <button
            key={o.language}
            type="button"
            aria-pressed={on}
            onClick={() => onLanguage(o.language)}
            className={`min-h-9 flex-1 rounded-lg px-3 text-sm ${on ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted'}`}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}

/** The work list's phone paper bar, plus Share. With `bottom`, Share and Print move to a bar at the bottom. */
function Frame({ back, language, onLanguage, onShare, notice, bottom, children }: ReceiptPrintProps & { bottom?: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className={`min-h-dvh bg-surface text-ink print:pb-0 ${bottom ? 'pb-28' : 'pb-24'}`}>
      <div className="no-print sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-panel/95 px-3 py-2 backdrop-blur">
        <Link to={back.to} aria-label={back.label} className="grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-surface">
          <ArrowLeft size={22} aria-hidden="true" />
        </Link>
        <span className="min-w-0 flex-1 truncate font-display text-lg font-bold">{t('receipt.title')}</span>
        {!bottom && (
          <>
            <button type="button" onClick={onShare} aria-label={t('print.share')} className="grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-surface">
              <Share2 size={20} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => window.print()} className={buttonClasses('primary')}>
              <Printer size={18} aria-hidden="true" />
              {t('print.print')}
            </button>
          </>
        )}
      </div>
      <div className="no-print mx-3 mt-3">
        <LanguageToggle language={language} onLanguage={onLanguage} />
      </div>
      {notice && (
        <p role="status" className="no-print mx-3 mt-2 rounded-lg bg-ok-soft px-3 py-2 text-sm font-semibold text-ok">
          {notice}
        </p>
      )}
      <main lang={language} className="m-3 rounded-2xl bg-panel p-4 shadow-sm ring-1 ring-line print:m-0 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        {children}
      </main>
      {bottom && (
        <div className="no-print fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-line bg-panel/95 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <button type="button" onClick={onShare} className={`${buttonClasses('primary')} flex-1`}>
            <Share2 size={18} aria-hidden="true" />
            {t('print.share')}
          </button>
          <button type="button" onClick={() => window.print()} className={`${buttonClasses('secondary')} flex-1`}>
            <Printer size={18} aria-hidden="true" />
            {t('print.print')}
          </button>
        </div>
      )}
    </div>
  );
}

function Leader() {
  return <span aria-hidden="true" className="mx-2 mb-[0.35em] min-w-4 flex-1 self-end border-b border-dotted border-muted" />;
}

/** The cash memo reflowed for a phone: no tear-off slip, payments as two-line rows. */
function PhoneMemo({ model, language, owedFirst }: { model: ReceiptModel; language: Language; owedFirst?: boolean }) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  const money = (amount: number) => formatMoney(amount, language);
  const owed = model.creditDue > 0 ? { label: t('money.creditDue'), amount: model.creditDue } : { label: t('money.balance'), amount: model.balance };
  const orderLabel = t('receipt.orderNumber', { number: '' }).trim();

  const owedBox = (
    <div data-tour="receipt-balance" className="flex items-baseline justify-between rounded-lg border-2 border-ink px-3 py-2 text-lg font-bold">
      <span>{owed.label}</span>
      <span className="tabular-nums">{money(owed.amount)}</span>
    </div>
  );

  const row = (label: ReactNode, amount: string, strong = false) => (
    <div className={`flex items-baseline py-0.5 ${strong ? 'font-semibold' : ''}`}>
      <span className="min-w-0">{label}</span>
      <Leader />
      <span className="shrink-0 tabular-nums">{amount}</span>
    </div>
  );

  return (
    <>
      <header className="text-center">
        <p className="font-display text-2xl font-bold">{model.shop.name}</p>
        {model.shop.address && <p className="text-sm text-muted">{model.shop.address}</p>}
        {model.shop.phone && <p className="text-sm text-muted">{model.shop.phone}</p>}
        <h1 className={`mx-auto mt-3 w-fit rounded-full border-2 border-ink px-4 py-0.5 text-xs font-bold ${language === 'en' ? 'uppercase tracking-[0.2em]' : ''}`}>
          {t('receipt.title')}
        </h1>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-0.5 border-y-4 border-double border-ink py-2 text-sm">
        <p>
          <span className="text-muted">{orderLabel}: </span>
          <b>{model.orderNumber}</b>
        </p>
        <p className="text-end">{formatDate(model.createdAt, language)}</p>
        <p className="font-semibold">{model.customer.name}</p>
        <p className="text-end">{model.customer.phone}</p>
      </div>

      {owedFirst && <div className="mt-3">{owedBox}</div>}

      <ul aria-label={t('receipt.garments')} className="m-0 mt-3 list-none p-0">
        {model.lines.map((line) => (
          <li key={line.itemId} className="print-block py-1.5">
            {row(
              <>
                <span className={`font-semibold ${line.cancelled ? 'line-through' : ''}`}>{line.garment}</span>
                {line.cancelled && <span className="ms-1 text-xs font-semibold">({t('receipt.cancelled')})</span>}
              </>,
              money(line.price),
            )}
            <p className="text-xs text-muted">
              {[line.wearer, line.deliveryDate && `${t('receipt.delivery')}: ${formatDate(line.deliveryDate, language)}`].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ul>

      <div aria-label={t('receipt.money')} role="group" className="print-block mt-3 border-t-2 border-ink pt-2 text-sm">
        {row(t('money.subtotal'), money(model.subtotal))}
        {model.discount &&
          row(
            <>
              {t('money.discount')} <span className="text-xs text-muted">({model.discount.reason})</span>
            </>,
            money(-model.discount.amount),
          )}
        {model.adjustments.length > 0 &&
          row(
            <>
              {t('money.adjustments')} <span className="text-xs text-muted">({model.adjustments.map((a) => a.reason).join(', ')})</span>
            </>,
            money(model.adjustmentsTotal),
          )}
        {row(t('money.total'), money(model.total), true)}
        {row(t('money.paid'), money(model.paid))}
        {!owedFirst && <div className="mt-2">{owedBox}</div>}
      </div>

      {model.payments.length > 0 && (
        <section aria-label={t('receipt.payments')} className="mt-4">
          <h2 className="border-b border-ink pb-0.5 text-xs font-bold text-muted">{t('receipt.payments')}</h2>
          <ul className="m-0 list-none p-0 text-sm">
            {model.payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 border-b border-line py-1.5">
                <div>
                  <p>
                    {t(`receipt.kind.${p.kind}`)} · {t(`method.${p.method}`)}
                  </p>
                  <p className="text-xs text-muted">{[formatDate(p.at, language), p.reference].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="font-semibold tabular-nums">{money(p.effect)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
