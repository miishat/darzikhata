import type { Label, Language, Poisha } from '@darzikhata/domain';
import { labelIn } from '@darzikhata/domain';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readSetting, writeSetting } from '../lib/safeStorage';
import type { MessageKey } from './bn';
import { formatDate, formatDateTime, formatMoney, formatNumber, translate } from './format';

const LANGUAGE_KEY = 'dk.language';

export interface I18n {
  language: Language;
  setLanguage(language: Language): void;
  t(key: MessageKey, vars?: Record<string, string | number>): string;
  label(label: Label): string;
  money(amount: Poisha): string;
  date(value: string, options?: { year?: boolean }): string;
  dateTime(value: string): string;
  number(value: number): string;
}

const I18nContext = createContext<I18n | null>(null);

function initialLanguage(fallback: Language): Language {
  const saved = readSetting(LANGUAGE_KEY);
  return saved === 'bn' || saved === 'en' ? saved : fallback;
}

export function I18nProvider({ children, fallback = 'bn' }: { children: ReactNode; fallback?: Language }) {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage(fallback));

  const setLanguage = useCallback((next: Language) => {
    writeSetting(LANGUAGE_KEY, next);
    setLanguageState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18n>(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      label: (l) => labelIn(l, language),
      money: (amount) => formatMoney(amount, language),
      date: (v, options) => formatDate(v, language, options),
      dateTime: (v) => formatDateTime(v, language),
      number: (v) => formatNumber(v, language),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
