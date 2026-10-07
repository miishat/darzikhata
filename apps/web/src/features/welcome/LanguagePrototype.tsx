// PROTOTYPE (throwaway): language switch layouts for the desktop welcome, switched with ?variant=. Never merged.
import type { Language } from '@darzikhata/domain';
import { Check, Globe } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { LanguageSwitch, LanguageToggle } from '../../shell/ShellParts';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';

export const LANGUAGE_VARIANTS = {
  A: 'Current: one button naming the other language',
  B: 'The top bar switch from inside the app: both languages side by side, the current one raised',
  C: 'A globe pill with both names, the current one bold and blue, a dot between',
  D: 'Two small cards, each language in its own script with the other script under it, a tick on the current one',
  E: 'A sliding switch with বাংলা on one side and English on the other',
  F: 'No corner control: a larger switch under the subtitle, part of the page',
};

export function useLanguageVariant() {
  return useVariant(Object.keys(LANGUAGE_VARIANTS));
}

export function LanguageVariantSwitcher() {
  return <PrototypeSwitcher variants={LANGUAGE_VARIANTS} />;
}

const NAMES: Record<Language, { own: string; other: string }> = {
  bn: { own: 'বাংলা', other: 'Bangla' },
  en: { own: 'English', other: 'ইংরেজি' },
};
const LANGS: Language[] = ['bn', 'en'];

/** Renders the variant's control when `spot` is where that variant puts it. */
export function WelcomeLanguage({ spot }: { spot: 'corner' | 'hero' }) {
  const variant = useLanguageVariant();
  const { t, language, setLanguage } = useI18n();
  if ((variant === 'F') !== (spot === 'hero')) return null;

  if (variant === 'A') return <LanguageToggle />;
  if (variant === 'B') return <LanguageSwitch />;

  if (variant === 'C') {
    return (
      <div role="group" aria-label={t('more.language')} className="flex items-center gap-1 rounded-full border border-line bg-panel py-1 ps-3 pe-1 shadow-sm">
        <Globe aria-hidden="true" className="me-1 size-4 text-muted" />
        {LANGS.map((l, i) => (
          <span key={l} className="flex items-center">
            {i > 0 && <span aria-hidden="true" className="px-0.5 text-muted">·</span>}
            <button
              type="button"
              lang={l}
              aria-pressed={language === l}
              onClick={() => setLanguage(l)}
              className={`rounded-full px-2.5 py-1 text-sm focus-visible:outline-2 focus-visible:outline-focus ${language === l ? 'font-bold text-brand-strong' : 'text-muted hover:text-ink'}`}
            >
              {NAMES[l].own}
            </button>
          </span>
        ))}
      </div>
    );
  }

  if (variant === 'D') {
    return (
      <div role="group" aria-label={t('more.language')} className="flex gap-2">
        {LANGS.map((l) => {
          const on = language === l;
          return (
            <button
              key={l}
              type="button"
              lang={l}
              aria-pressed={on}
              onClick={() => setLanguage(l)}
              className={`relative flex w-28 flex-col items-start rounded-xl border px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-focus ${on ? 'border-brand bg-panel ring-2 ring-brand' : 'border-line bg-panel/60 hover:bg-panel'}`}
            >
              <span className="text-sm font-bold">{NAMES[l].own}</span>
              <span className="text-xs text-muted">{NAMES[l].other}</span>
              {on && (
                <span className="absolute end-2 top-2 flex size-4 items-center justify-center rounded-full bg-brand text-on-brand">
                  <Check aria-hidden="true" className="size-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'E') {
    const en = language === 'en';
    return (
      <div className="flex items-center gap-2.5 rounded-full border border-line bg-panel px-3 py-1.5 shadow-sm">
        <button type="button" lang="bn" onClick={() => setLanguage('bn')} className={`text-sm ${en ? 'text-muted' : 'font-bold text-ink'}`}>
          বাংলা
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={en}
          aria-label={t('more.language.english')}
          onClick={() => setLanguage(en ? 'bn' : 'en')}
          className="relative h-6 w-11 rounded-full bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-panel shadow transition-[inset-inline-start] ${en ? 'start-[22px]' : 'start-0.5'}`} />
        </button>
        <button type="button" lang="en" onClick={() => setLanguage('en')} className={`text-sm ${en ? 'font-bold text-ink' : 'text-muted'}`}>
          English
        </button>
      </div>
    );
  }

  // F: a larger switch in the page under the subtitle.
  return (
    <div role="group" aria-label={t('more.language')} className="mt-5 flex items-center gap-3">
      <Globe aria-hidden="true" className="size-4 text-muted" />
      <div className="flex gap-1 rounded-xl bg-panel p-1 shadow-sm ring-1 ring-line">
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={language === l}
            onClick={() => setLanguage(l)}
            className={`min-h-10 rounded-lg px-5 text-base font-semibold focus-visible:outline-2 focus-visible:outline-focus ${language === l ? 'bg-brand text-on-brand' : 'text-muted hover:text-ink'}`}
          >
            {NAMES[l].own}
          </button>
        ))}
      </div>
    </div>
  );
}
