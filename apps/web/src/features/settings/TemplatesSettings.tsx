import { Plus, Shirt } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';
import { SECTION_BODY, SectionHeader, SettingCard, StagePath, StatusPill } from './SettingsCards';

/** The shop's garment types as cards, each opening its editor. */
export function TemplatesSettings() {
  const { t, language, money, number } = useI18n();
  const { config } = useSnapshot();
  const saved = (useLocation().state as { saved?: boolean } | null)?.saved === true;
  return (
    <>
      <SectionHeader
        path="templates"
        action={
          <Link to="/app/settings/templates/new" className={buttonClasses('primary')}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.templates.new')}
          </Link>
        }
      />
      <div className={`${SECTION_BODY} flex flex-col gap-3 p-4 sm:p-5`}>
        {saved && (
          <p role="status" className="text-brand-strong">
            {t('settings.saved')}
          </p>
        )}
        <ul aria-label={t('settings.templates.list')} className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {(config?.templates ?? []).map((template) => (
            <li key={template.id} className={template.active ? '' : 'opacity-70'}>
              <SettingCard
                icon={Shirt}
                className="h-full hover:border-brand hover:bg-brand-soft/30"
                title={
                  // The name is the link; its ::after covers the card, so the whole card opens the editor.
                  <Link
                    to={`/app/settings/templates/${template.id}`}
                    className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus"
                  >
                    {template.name[language]}
                  </Link>
                }
                sub={t('settings.template.counts', { f: number(template.fields.length), s: number(template.stages.length) })}
                action={<span className="font-display text-lg font-bold">{money(template.defaultPrice)}</span>}
              >
                <StagePath template={template} />
                <div>
                  <StatusPill on={template.active} label={template.active ? t('settings.template.inUse') : t('settings.template.retired')} />
                </div>
              </SettingCard>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
