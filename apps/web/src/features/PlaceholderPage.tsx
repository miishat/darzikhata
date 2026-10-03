import type { MessageKey } from '../i18n/bn';
import { useI18n } from '../i18n/I18nProvider';

/** Stands in for sections that later plans build, so navigation and permissions can be tested now. */
export function PlaceholderPage({ title }: { title: MessageKey }) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{t(title)}</h1>
      <p className="text-muted">{t('placeholder.body')}</p>
    </section>
  );
}
