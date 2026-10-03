import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { SEED_SHOPS, type SeedShopKey } from '../../seed/shops';
import { LanguageToggle } from '../../shell/ShellParts';
import { Button } from '../../ui/Button';

/** First screen: pick one of the sample shops to explore. */
export function WelcomePage() {
  const { t, label } = useI18n();
  const store = useStore();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<SeedShopKey | null>(null);

  const open = async (key: SeedShopKey) => {
    setOpening(key);
    await store.startDemo(key);
    navigate('/app');
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand">{t('welcome.title')}</h1>
          <p className="mt-2 text-muted">{t('welcome.subtitle')}</p>
        </div>
        <LanguageToggle />
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {SEED_SHOPS.map((shop) => (
          <li key={shop.key} className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
            <h2 className="text-lg font-semibold">{label(shop.name)}</h2>
            <p className="flex-1 text-sm text-muted">{label(shop.summary)}</p>
            <Button size="lg" disabled={opening !== null} onClick={() => open(shop.key)} aria-label={`${t('welcome.open')}: ${label(shop.name)}`}>
              {t('welcome.open')}
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">{t('welcome.note')}</p>
    </main>
  );
}
