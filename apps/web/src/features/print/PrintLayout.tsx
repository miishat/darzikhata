import type { Language } from '@darzikhata/domain';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, buttonClasses } from '../../ui/Button';

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
  children: ReactNode;
}

const LANGUAGES: Array<{ language: Language; name: string }> = [
  { language: 'bn', name: 'বাংলা' },
  { language: 'en', name: 'English' },
];

/** A print page: a toolbar that is hidden when printing, then the document itself. */
export function PrintLayout({ back, title, language, onLanguage, onShare, notice, children }: PrintLayoutProps) {
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
