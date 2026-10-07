import { Building2, ChevronRight, Shirt, Sparkles, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { SEED_SHOPS, type SeedShopKey } from '../../seed/shops';
import { LanguageToggle } from '../../shell/ShellParts';
import { useShell } from '../../shell/ShellPreference';
import { BrandMark } from '../../ui/BrandMark';
import { DesktopWelcome } from './DesktopWelcome';

const ICON: Record<SeedShopKey, LucideIcon> = { rahman: Shirt, nakshi: Sparkles, uniform: Building2 };

/** First screen: pick one of the sample shops to explore. The desktop centres it, with the shops side by side. */
export function WelcomePage() {
  const { t, label } = useI18n();
  const store = useStore();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<SeedShopKey | null>(null);
  const { kind } = useShell();

  const open = async (key: SeedShopKey) => {
    setOpening(key);
    await store.startDemo(key);
    navigate('/app');
  };

  if (kind === 'desktop') return <DesktopWelcome icons={ICON} opening={opening} onOpen={open} />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="rounded-b-3xl bg-navy px-5 pt-5 pb-8 text-on-navy">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <span className="font-display text-lg font-bold">{t('app.name')}</span>
          </div>
          <LanguageToggle onDark />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">{t('welcome.title')}</h1>
        <p className="mt-1.5 text-on-navy-muted">{t('welcome.subtitle')}</p>
      </header>
      <ul className="m-0 -mt-4 flex list-none flex-col gap-2.5 px-4 pb-10">
        {SEED_SHOPS.map((shop) => {
          const Icon = ICON[shop.key];
          return (
            <li key={shop.key}>
              <button
                type="button"
                disabled={opening !== null}
                onClick={() => open(shop.key)}
                aria-label={`${t('welcome.open')}: ${label(shop.name)}`}
                className="flex min-h-20 w-full items-center gap-3.5 rounded-2xl border border-line bg-panel p-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                  <Icon aria-hidden="true" size={24} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-lg font-bold">{label(shop.name)}</span>
                  <span className="text-sm text-muted">{label(shop.summary)}</span>
                </span>
                <ChevronRight aria-hidden="true" size={20} className="shrink-0 text-muted" />
              </button>
            </li>
          );
        })}
        <li className="px-1 pt-2 text-center text-sm text-muted">{t('welcome.note')}</li>
      </ul>
    </main>
  );
}
