import type { GarmentTemplate } from '@darzikhata/domain';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { SETTINGS_SECTIONS, type SettingsSection } from './sections';

/** A section's scrolling body inside the settings card. `relative` keeps screen-reader text inside it. */
export const SECTION_BODY = 'relative min-h-0 flex-1 overflow-auto';

/** What is in each section right now, for the section tiles and headers. */
export function useSectionSummary(): (path: SettingsSection['path']) => string {
  const { t, language, number } = useI18n();
  const { config } = useSnapshot();
  return (path) => {
    if (!config) return '';
    if (path === 'shop') return config.profile.name[language];
    if (path === 'templates') return t('settings.summary.templates', { n: number(config.templates.filter((x) => x.active).length) });
    if (path === 'staff')
      return t('settings.summary.staff', { n: number(config.staff.filter((s) => s.active).length), total: number(config.staff.length) });
    return t('settings.summary.branches', { b: number(config.branches.length), d: number(config.devices.length) });
  };
}

/** The top of a section's card: its icon, name and summary, and its main button. */
export function SectionHeader({ path, action }: { path: SettingsSection['path']; action?: ReactNode }) {
  const { t } = useI18n();
  const summary = useSectionSummary();
  const section = SETTINGS_SECTIONS.find((s) => s.path === path)!;
  const Icon = section.icon;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-bold">{t(section.label)}</h2>
        <p className="truncate text-sm text-muted">{summary(path)}</p>
      </div>
      {action}
    </div>
  );
}

/** The card every section uses: an icon tile, a title with a line under it, an optional button, then the content. */
export function SettingCard({
  icon: Icon,
  title,
  sub,
  action,
  className = '',
  children,
}: {
  icon: LucideIcon;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`relative flex flex-col gap-3 rounded-xl border border-line bg-panel p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          {sub && <p className="text-sm text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** A small on / off label, green when on. */
export function StatusPill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${on ? 'bg-ok-soft text-ok' : 'bg-surface text-muted'}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${on ? 'bg-ok' : 'bg-muted'}`} />
      {label}
    </span>
  );
}

/** A garment's stages in order; the ones that can be skipped are dashed. */
export function StagePath({ template }: { template: GarmentTemplate }) {
  const { t, language } = useI18n();
  return (
    <ol aria-label={t('settings.template.stages')} className="flex flex-wrap items-center gap-1">
      {template.stages.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1">
          {i > 0 && <ChevronRight aria-hidden="true" size={12} className="text-muted" />}
          <span
            className={`rounded-md px-1.5 py-0.5 text-xs ${
              s.group === 'delivered'
                ? 'bg-ok-soft text-ok'
                : s.group === 'ready'
                  ? 'bg-brand-soft text-brand-strong'
                  : s.optional
                    ? 'border border-dashed border-line text-muted'
                    : 'bg-surface'
            }`}
          >
            {s.label[language]}
          </span>
        </li>
      ))}
    </ol>
  );
}
