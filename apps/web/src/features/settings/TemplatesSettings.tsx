import { Link, useLocation } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';

/** The shop's garment types, each linking to its editor. */
export function TemplatesSettings() {
  const { t, language, money } = useI18n();
  const { config } = useSnapshot();
  const saved = (useLocation().state as { saved?: boolean } | null)?.saved === true;
  const head = 'whitespace-nowrap px-3 py-2 text-start text-sm font-semibold text-muted';
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('settings.templates.list')}</h2>
        <Link to="/app/settings/templates/new" className={buttonClasses('primary')}>
          {t('settings.templates.new')}
        </Link>
      </div>
      {saved && (
        <p role="status" className="text-brand-strong">
          {t('settings.saved')}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-line bg-panel">
        <table aria-label={t('settings.templates.list')} className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={head}>{t('settings.col.name')}</th>
              <th scope="col" className={head}>{t('receipt.price')}</th>
              <th scope="col" className={head}>{t('settings.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {(config?.templates ?? []).map((template) => (
              <tr key={template.id} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 font-semibold">
                  <Link
                    to={`/app/settings/templates/${template.id}`}
                    className="text-brand-strong underline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    {template.name[language]}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{money(template.defaultPrice)}</td>
                <td className="px-3 py-2">{template.active ? t('settings.template.inUse') : t('settings.template.retired')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
