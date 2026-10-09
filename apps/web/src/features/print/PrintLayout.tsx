import type { Language } from '@darzikhata/domain';
import { ArrowLeft, FileText, Printer, Scissors, Share2, Tag, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import type { MessageKey } from '../../i18n/bn';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Button, buttonClasses } from '../../ui/Button';
import { useCan } from '../common/hooks';

/** The document's own language: starts as the app language and never changes it. */
export function usePrintLanguage(): [Language, (language: Language) => void] {
  const app = useI18n();
  return useState<Language>(app.language);
}

export interface PrintLayoutProps {
  /** Where the toolbar's back link goes. */
  back: { to: string; label: string };
  title: string;
  language: Language;
  onLanguage(language: Language): void;
  /** Present on the receipt: the toolbar then offers a share button. */
  onShare?: () => void;
  /** Short confirmation shown in the toolbar, e.g. after copying. */
  notice?: string | null;
  /** Present on an order's papers: a desktop toolbar then offers tabs to the receipt, job slip and fabric tags. */
  orderId?: string;
  children: ReactNode;
}

const LANGUAGES: Array<{ language: Language; name: string }> = [
  { language: 'bn', name: 'বাংলা' },
  { language: 'en', name: 'English' },
];

/** A print page: a toolbar that is hidden when printing, then the document itself. On a desktop the document is an A4 sheet. */
export function PrintLayout(props: PrintLayoutProps) {
  const { kind } = useShell();
  return kind === 'desktop' ? <DesktopPrintLayout {...props} /> : <PhonePrintLayout {...props} />;
}

const PAPERS: Array<{ path: string; icon: LucideIcon; label: MessageKey; money: boolean }> = [
  { path: 'receipt', icon: FileText, label: 'receipt.title', money: true },
  { path: 'job', icon: Scissors, label: 'print.jobSlip', money: false },
  { path: 'tags', icon: Tag, label: 'print.tags', money: false },
];

/** Tabs between an order's papers. The receipt is left out for staff who may not see money. */
function PaperTabs({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const can = useCan();
  const { pathname } = useLocation();
  const papers = PAPERS.filter((paper) => !paper.money || can('money.view'));
  return (
    <nav aria-label={t('print.papers')} className="flex rounded-xl bg-line/60 p-1">
      {papers.map((paper) => {
        const Icon = paper.icon;
        const to = `/print/${paper.path}/${orderId}`;
        const current = pathname === to;
        return (
          <Link
            key={paper.path}
            to={to}
            aria-current={current ? 'page' : undefined}
            className={`flex min-h-9 items-center gap-2 rounded-lg px-4 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
              current ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {t(paper.label)}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The desktop print page: one toolbar along the top with back and the title, the order's papers as tabs in the middle,
 * then Share, the document's language and Print. The document sits below as an A4 sheet.
 */
function DesktopPrintLayout({ back, title, language, onLanguage, onShare, notice, orderId, children }: PrintLayoutProps) {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <div className="no-print sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-panel/95 px-5 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={back.to} aria-label={back.label} title={back.label} className={buttonClasses('secondary')}>
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
          <span className="truncate font-display text-lg font-bold">{title}</span>
        </div>
        {orderId ? <PaperTabs orderId={orderId} /> : <span />}
        <div className="flex items-center justify-end gap-2">
          {notice && (
            <p role="status" className="text-sm font-semibold text-brand-strong">
              {notice}
            </p>
          )}
          {onShare && (
            <Button variant="secondary" onClick={onShare}>
              <Share2 size={16} aria-hidden="true" />
              {t('print.share')}
            </Button>
          )}
          <div role="group" aria-label={title} className="flex rounded-xl bg-line/60 p-1">
            {LANGUAGES.map((option) => {
              const on = language === option.language;
              return (
                <button
                  key={option.language}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onLanguage(option.language)}
                  className={`min-h-9 rounded-lg px-3 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
                    on ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
          <Button onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            {t('print.print')}
          </Button>
        </div>
      </div>
      <div className="p-10 print:p-0">
        <main
          lang={language}
          className="mx-auto min-h-[297mm] w-[210mm] bg-panel p-[14mm] shadow-xl ring-1 ring-line print:min-h-0 print:w-auto print:p-0 print:shadow-none print:ring-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * The phone's print page as a paper: a bar with back, the title and Print, the paper's language under it, then the
 * document as a card. Printing drops the card and prints the document on A4.
 */
export function PhonePaperLayout({ back, title, language, onLanguage, children }: Pick<PrintLayoutProps, 'back' | 'title' | 'language' | 'onLanguage' | 'children'>) {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-surface pb-6 text-ink print:pb-0">
      <div className="no-print sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-panel/95 px-3 py-2 backdrop-blur">
        <Link
          to={back.to}
          aria-label={back.label}
          className="grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </Link>
        <span className="min-w-0 flex-1 truncate font-display text-lg font-bold">{title}</span>
        <Button onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" />
          {t('print.print')}
        </Button>
      </div>
      <div role="group" aria-label={t('print.paperLanguage')} className="no-print mx-3 mt-3 flex rounded-xl bg-line/60 p-1">
        {LANGUAGES.map((option) => {
          const on = language === option.language;
          return (
            <button
              key={option.language}
              type="button"
              aria-pressed={on}
              onClick={() => onLanguage(option.language)}
              className={`min-h-9 flex-1 rounded-lg px-3 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
                on ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted'
              }`}
            >
              {option.name}
            </button>
          );
        })}
      </div>
      <main
        lang={language}
        className="m-3 rounded-2xl bg-panel p-4 shadow-sm ring-1 ring-line print:m-0 print:rounded-none print:p-0 print:shadow-none print:ring-0"
      >
        {children}
      </main>
    </div>
  );
}

/** The phone's print page: a toolbar of buttons, then the document. */
function PhonePrintLayout({ back, title, language, onLanguage, onShare, notice, children }: PrintLayoutProps) {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line bg-panel px-4 py-2">
        <Link to={back.to} className={buttonClasses('ghost')}>
          {back.label}
        </Link>
        <div role="group" aria-label={title} className="ml-auto flex gap-1">
          {LANGUAGES.map((option) => (
            <Button
              key={option.language}
              variant={language === option.language ? 'primary' : 'secondary'}
              aria-pressed={language === option.language}
              onClick={() => onLanguage(option.language)}
            >
              {option.name}
            </Button>
          ))}
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          {t('print.print')}
        </Button>
        {onShare && (
          <Button variant="secondary" onClick={onShare}>
            {t('print.share')}
          </Button>
        )}
        {notice && (
          <p role="status" className="text-sm font-semibold text-brand-strong">
            {notice}
          </p>
        )}
      </div>
      <main lang={language} className="mx-auto max-w-3xl bg-panel p-6 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
