import type { Language } from '@darzikhata/domain';
import { ArrowRight, Banknote, ClipboardList, Globe, Printer, Ruler, WifiOff, Wrench, type LucideIcon } from 'lucide-react';
import type { MessageKey } from '../../i18n/bn';
import { useI18n } from '../../i18n/I18nProvider';
import { SEED_SHOPS, type SeedShopKey } from '../../seed/shops';
import { BrandMark } from '../../ui/BrandMark';

export interface DesktopWelcomeProps {
  icons: Record<SeedShopKey, LucideIcon>;
  opening: SeedShopKey | null;
  onOpen(key: SeedShopKey): void;
}

const FEATURES: Array<{ icon: LucideIcon; key: MessageKey }> = [
  { icon: Ruler, key: 'welcome.feature.measurements' },
  { icon: ClipboardList, key: 'welcome.feature.orders' },
  { icon: Banknote, key: 'welcome.feature.payments' },
  { icon: Wrench, key: 'welcome.feature.work' },
  { icon: Printer, key: 'welcome.feature.printing' },
  { icon: WifiOff, key: 'welcome.feature.offline' },
];

/**
 * The desktop welcome, centred on a light wash: both languages in a pill at the top corner, the app icon, the title and one line on what it does, the three
 * sample shops side by side, then what the app can do as a row of chips.
 */
export function DesktopWelcome({ icons, opening, onOpen }: DesktopWelcomeProps) {
  const { t, label } = useI18n();
  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-soft to-surface px-12 py-6">
      <div className="ms-auto">
        <LanguagePill />
      </div>
      <div className="mx-auto mt-[6vh] flex w-full max-w-5xl flex-col items-center text-center">
        <BrandMark size={64} />
        <h1 className="mt-5 font-display text-5xl font-bold">{t('welcome.title')}</h1>
        <p className="mt-3 text-lg text-muted">{t('welcome.subtitle')}</p>
        <ul className="m-0 mt-10 grid w-full list-none grid-cols-3 gap-4 p-0">
          {SEED_SHOPS.map((shop) => {
            const Icon = icons[shop.key];
            return (
              <li key={shop.key}>
                <button
                  type="button"
                  disabled={opening !== null}
                  onClick={() => onOpen(shop.key)}
                  aria-label={`${t('welcome.open')}: ${label(shop.name)}`}
                  className="group flex h-full w-full flex-col items-center gap-3 rounded-3xl border border-line bg-panel px-5 py-7 text-center shadow-sm transition-shadow hover:border-brand hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                >
                  <span className="flex size-14 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                    <Icon aria-hidden="true" size={28} />
                  </span>
                  <span className="font-display text-xl font-bold">{label(shop.name)}</span>
                  <span className="text-sm text-muted">{label(shop.summary)}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand-strong">
                    {t('welcome.open')}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <ul aria-label={t('welcome.features')} className="m-0 mt-10 flex list-none flex-wrap justify-center gap-2 p-0">
          {FEATURES.map((f) => (
            <li key={f.key} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-sm">
              <f.icon aria-hidden="true" className="size-4 text-brand-strong" />
              {t(f.key)}
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm text-muted">{t('welcome.note')}</p>
      </div>
    </main>
  );
}

const LANGUAGES: Array<{ language: Language; key: 'more.language.bangla' | 'more.language.english' }> = [
  { language: 'bn', key: 'more.language.bangla' },
  { language: 'en', key: 'more.language.english' },
];

/** Both languages, each in its own script, in a pill with a globe; the current one bold and blue. */
function LanguagePill() {
  const { t, language, setLanguage } = useI18n();
  return (
    <div role="group" aria-label={t('more.language')} className="flex items-center gap-1 rounded-full border border-line bg-panel py-1 ps-3 pe-1 shadow-sm">
      <Globe aria-hidden="true" className="me-1 size-4 text-muted" />
      {LANGUAGES.map((option, i) => {
        const on = language === option.language;
        return (
          <span key={option.language} className="flex items-center">
            {i > 0 && (
              <span aria-hidden="true" className="px-0.5 text-muted">
                ·
              </span>
            )}
            <button
              type="button"
              lang={option.language}
              aria-pressed={on}
              onClick={() => setLanguage(option.language)}
              className={`rounded-full px-2.5 py-1 text-sm focus-visible:outline-2 focus-visible:outline-focus ${on ? 'font-bold text-brand-strong' : 'text-muted hover:text-ink'}`}
            >
              {t(option.key)}
            </button>
          </span>
        );
      })}
    </div>
  );
}
