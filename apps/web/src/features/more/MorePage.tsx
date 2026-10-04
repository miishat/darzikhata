import { useI18n } from '../../i18n/I18nProvider';
import { MoreContent } from './MoreContent';

export function MorePage() {
  const { t } = useI18n();
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('nav.more')}</h1>
      <MoreContent />
    </div>
  );
}
