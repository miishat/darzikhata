// PROTOTYPE (throwaway): desktop settings layouts, switched with ?variant=. Lives on prototype/settings-desktop only.
import { toBanglaDigits, toEnglishDigits, type Branch, type GarmentTemplate, type Staff } from '@darzikhata/domain';
import { Building2, ChevronRight, MonitorSmartphone, Pencil, Plus, Shirt, Store, Users, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { TextField } from '../../ui/TextField';
import { useCan } from '../common/hooks';
import { groupLabel } from '../customers/measurementView';
import { BranchDialog } from './BranchSettings';
import { configProblemText } from './configProblems';
import { SETTINGS_SECTIONS } from './sections';
import { StaffDialog } from './StaffSettings';

export const SETTINGS_VARIANTS = {
  A: 'Current (top buttons)',
  B: 'Side rail + section card',
  C: 'One page, all sections',
  D: 'List + inspector',
} as const;

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const PAGE = 'flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4';
const head = 'sticky top-0 z-10 whitespace-nowrap border-b border-line bg-panel px-4 py-2 text-start text-sm font-semibold text-muted';

const AREAS: Record<string, [string, string]> = {
  orders: ['অর্ডার', 'Orders'],
  customers: ['কাস্টমার', 'Customers'],
  measurements: ['মাপ', 'Measurements'],
  money: ['টাকার হিসাব', 'Money'],
  payments: ['জমা ও ফেরত', 'Payments'],
  work: ['কাজ', 'Work'],
  links: ['স্ট্যাটাস লিংক', 'Status Links'],
  settings: ['সেটিংস', 'Settings'],
  staff: ['স্টাফ', 'Staff'],
  branches: ['সব শাখা', 'All Branches'],
};

type SectionKey = 'shop' | 'templates' | 'staff' | 'branches';
const ICONS: Record<SectionKey, LucideIcon> = { shop: Store, templates: Shirt, staff: Users, branches: Building2 };

function useL() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

/** Which section the address points at, and whether it is the garment editor. */
function useSection(): { key: SectionKey; editor: boolean } {
  const { pathname } = useLocation();
  const m = /\/settings\/(shop|templates|staff|branches)(\/.+)?/.exec(pathname);
  return { key: (m?.[1] as SectionKey) ?? 'shop', editor: m?.[1] === 'templates' && !!m[2] };
}

/** Keeps ?variant= on every link so the prototype survives navigation. */
function useTo() {
  const [params] = useSearchParams();
  const v = params.get('variant');
  return (path: string, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams(extra);
    if (v) p.set('variant', v);
    const s = p.toString();
    return `/app/settings/${path}${s ? `?${s}` : ''}`;
  };
}

function useSections() {
  const can = useCan();
  return SETTINGS_SECTIONS.filter((s) => s.requires.some(can)).map((s) => ({ ...s, key: s.path as SectionKey }));
}

/** One line under each section name: what is in it right now. */
function useSummary() {
  const { language, number } = useI18n();
  const L = useL();
  const { config } = useSnapshot();
  return (key: SectionKey): string => {
    if (!config) return '';
    if (key === 'shop') return config.profile.name[language];
    if (key === 'templates') {
      const live = config.templates.filter((x) => x.active).length;
      return L(`${number(live)}টি পোশাক চালু`, `${number(live)} Garments Offered`);
    }
    if (key === 'staff') {
      const live = config.staff.filter((s) => s.active).length;
      return L(`${number(live)} জন সক্রিয়, মোট ${number(config.staff.length)}`, `${number(live)} Active of ${number(config.staff.length)}`);
    }
    return L(`${number(config.branches.length)}টি শাখা, ${number(config.devices.length)}টি ডিভাইস`, `${number(config.branches.length)} Branches, ${number(config.devices.length)} Devices`);
  };
}

/* ---------- Shop form (a copy of ShopSettings with a roomier layout) ---------- */

function parseLinkDays(text: string): number | null {
  const ascii = toEnglishDigits(text.trim());
  if (!/^\d{1,4}$/.test(ascii)) return null;
  const days = Number(ascii);
  return days >= 1 && days <= 365 ? days : null;
}

function ShopForm({ inline = false }: { inline?: boolean }) {
  const { t, language } = useI18n();
  const L = useL();
  const store = useStore();
  const { config } = useSnapshot();
  const start = () => ({
    nameBn: config?.profile.name.bn ?? '',
    nameEn: config?.profile.name.en ?? '',
    phone: config?.profile.phone ?? '',
    address: config?.profile.address ?? '',
    days: toBanglaDigits(String(config?.settings.linkExpiryDays ?? 30)),
    restrict: config?.settings.restrictFemaleMeasurements ?? false,
  });
  const [initial, setInitial] = useState(start);
  const [input, setInput] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(input) !== JSON.stringify(initial);
  const set = (change: Partial<typeof input>) => {
    setInput((c) => ({ ...c, ...change }));
    setSaved(false);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    const days = parseLinkDays(input.days);
    if ((!input.nameBn.trim() && !input.nameEn.trim()) || days === null) return setProblem(t('settings.shop.error.name'));
    const outcome = await store.updateConfig((current) => ({
      ...current,
      profile: { name: { bn: input.nameBn.trim() || input.nameEn.trim(), en: input.nameEn.trim() || input.nameBn.trim() }, phone: input.phone.trim(), address: input.address.trim() },
      settings: { ...current.settings, linkExpiryDays: days, restrictFemaleMeasurements: input.restrict },
    }));
    if (!outcome.ok) return setProblem(configProblemText(outcome.problems, language));
    setProblem(null);
    setInitial(input);
    setSaved(true);
  }

  const group = 'flex flex-col gap-4 rounded-xl border border-line p-4';
  const legend = 'font-semibold';
  return (
    <form onSubmit={save} noValidate className={inline ? 'flex flex-col' : 'flex min-h-0 flex-1 flex-col'}>
      <div className={inline ? 'p-5' : 'relative min-h-0 flex-1 overflow-auto p-5'}>
        <div className="grid max-w-4xl gap-4 xl:grid-cols-2">
          <fieldset className={group}>
            <legend className={`${legend} px-1`}>{L('নাম', 'Name')}</legend>
            <TextField label={t('settings.shop.nameBn')} value={input.nameBn} onChange={(e) => set({ nameBn: e.target.value })} autoComplete="off" />
            <TextField label={t('settings.shop.nameEn')} value={input.nameEn} onChange={(e) => set({ nameEn: e.target.value })} autoComplete="off" />
          </fieldset>
          <fieldset className={group}>
            <legend className={`${legend} px-1`}>{L('যোগাযোগ', 'Contact')}</legend>
            <TextField label={t('settings.shop.phone')} value={input.phone} onChange={(e) => set({ phone: e.target.value })} type="tel" autoComplete="off" />
            <TextField label={t('settings.shop.address')} value={input.address} onChange={(e) => set({ address: e.target.value })} autoComplete="off" />
          </fieldset>
          <fieldset className={`${group} xl:col-span-2`}>
            <legend className={`${legend} px-1`}>{L('নিয়ম', 'Rules')}</legend>
            <div className="grid items-start gap-4 xl:grid-cols-2">
              <TextField label={t('settings.shop.linkDays')} value={input.days} onChange={(e) => set({ days: e.target.value })} hint={t('settings.shop.linkDaysHint')} inputMode="numeric" autoComplete="off" />
              <div className="rounded-lg bg-surface p-3">
                <Checkbox label={t('settings.shop.restrict')} checked={input.restrict} onChange={(restrict) => set({ restrict })} />
              </div>
            </div>
          </fieldset>
          {/* How the name reads on a receipt, so the owner sees the effect of each field. */}
          <div className="rounded-xl border border-dashed border-line p-4 xl:col-span-2">
            <p className="text-sm text-muted">{L('রসিদে যেমন দেখাবে', 'On a Receipt')}</p>
            <p className="mt-2 text-center font-display text-xl font-bold">{(language === 'bn' ? input.nameBn : input.nameEn) || input.nameBn || input.nameEn}</p>
            <p className="text-center text-sm text-muted">
              {input.address} · {input.phone}
            </p>
          </div>
        </div>
      </div>
      {(
        <div className={`flex items-center gap-3 border-t border-line bg-surface/60 px-5 py-3 ${inline ? 'sticky bottom-0 z-10' : ''}`}>
          {problem && <p role="alert" className="text-danger">{problem}</p>}
          {saved && <p role="status" className="text-brand-strong">{t('settings.saved')}</p>}
          {dirty && !saved && <p className="text-sm text-warn-ink">{L('সেভ করা হয়নি এমন পরিবর্তন আছে', 'Unsaved changes')}</p>}
          <div className="ms-auto flex gap-2">
            <Button variant="secondary" disabled={!dirty} onClick={() => setInput(initial)}>
              {L('বাতিল', 'Discard')}
            </Button>
            <Button type="submit" disabled={!dirty}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

/* ---------- Pieces shared by the variants ---------- */

function StatusDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${on ? 'bg-ok-soft text-ok' : 'bg-surface text-muted'}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${on ? 'bg-ok' : 'bg-muted'}`} />
      {label}
    </span>
  );
}

/** A garment's stages as a row of chips, skippable ones dashed. */
function StagePipe({ template }: { template: GarmentTemplate }) {
  const { language } = useI18n();
  return (
    <ol className="flex flex-wrap items-center gap-1">
      {template.stages.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1">
          {i > 0 && <ChevronRight aria-hidden="true" size={12} className="text-muted" />}
          <span
            className={`rounded-md px-1.5 py-0.5 text-xs ${
              s.group === 'delivered' ? 'bg-ok-soft text-ok' : s.group === 'ready' ? 'bg-brand-soft text-brand-strong' : s.optional ? 'border border-dashed border-line text-muted' : 'bg-surface'
            }`}
          >
            {s.label[language]}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Every measurement field, grouped the way the measurement form shows them. */
function FieldGroups({ template }: { template: GarmentTemplate }) {
  const { t, language } = useI18n();
  const groups = [...new Set(template.fields.map((f) => f.group))];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g} className="rounded-lg border border-line p-3">
          <p className="mb-2 text-sm font-semibold text-muted">{groupLabel(g, t)}</p>
          <ul className="flex flex-wrap gap-1.5">
            {template.fields
              .filter((f) => f.group === g)
              .map((f) => (
                <li key={f.key} className="rounded-md bg-surface px-2 py-0.5 text-sm">
                  {f.label[language]}
                  {f.required && <span className="text-danger"> *</span>}
                  <span className="text-xs text-muted"> {t(`unit.${f.unit}`)}</span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function branchText(staff: Staff, branches: Branch[], language: 'bn' | 'en', all: string) {
  return staff.branchIds === 'all' ? all : staff.branchIds.map((id) => branches.find((b) => b.id === id)?.name[language] ?? id).join(', ');
}

/** Garment cards that open the editor. */
function GarmentCards() {
  const { t, language, money, number } = useI18n();
  const L = useL();
  const { config } = useSnapshot();
  const to = useTo();
  return (
    <ul className="grid gap-3 p-5 lg:grid-cols-2 2xl:grid-cols-3">
      {config!.templates.map((tp) => (
        <li key={tp.id}>
          <Link to={to(`templates/${tp.id}`)} className={`flex h-full flex-col gap-3 rounded-xl border border-line p-4 hover:border-brand hover:bg-brand-soft/30 ${tp.active ? '' : 'opacity-60'}`}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand-strong">
                <Shirt size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold">{tp.name[language]}</p>
                <p className="text-sm text-muted">
                  {L(`${number(tp.fields.length)}টি মাপ`, `${number(tp.fields.length)} Measurements`)} · {L(`${number(tp.stages.length)}টি ধাপ`, `${number(tp.stages.length)} Stages`)}
                </p>
              </div>
              <span className="font-display text-lg font-bold">{money(tp.defaultPrice)}</span>
            </div>
            <StagePipe template={tp} />
            <div>
              <StatusDot on={tp.active} label={tp.active ? t('settings.template.inUse') : t('settings.template.retired')} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Staff as cards; the edit button opens the existing dialog. */
function StaffCards({ onEdit }: { onEdit(staff: Staff): void }) {
  const { t, language } = useI18n();
  const { config } = useSnapshot();
  const role = (id: string) => config!.roles.find((r) => r.id === id)?.name[language] ?? id;
  return (
    <ul className="grid gap-3 p-5 lg:grid-cols-2 2xl:grid-cols-3">
      {config!.staff.map((s) => (
        <li key={s.id} className={`flex items-center gap-3 rounded-xl border border-line p-4 ${s.active ? '' : 'bg-surface/60'}`}>
          <Avatar id={s.id} name={s.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{s.name}</p>
            <p className="truncate text-sm text-muted">
              {role(s.roleId)} · {branchText(s, config!.branches, language, t('branch.all'))}
            </p>
            <div className="mt-1">
              <StatusDot on={s.active} label={s.active ? t('settings.staff.active') : t('settings.staff.inactive')} />
            </div>
          </div>
          <Button variant="secondary" aria-label={t('settings.editItem', { name: s.name })} onClick={() => onEdit(s)}>
            <Pencil aria-hidden="true" size={16} />
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** Each branch with the devices that belong to it; a device moves with its select. */
function BranchBoard({ onEdit }: { onEdit(branch: Branch): void }) {
  const { t, language, number } = useI18n();
  const L = useL();
  const store = useStore();
  const { config } = useSnapshot();
  const move = (deviceId: string, branchId: string) =>
    void store.updateConfig((c) => ({ ...c, devices: c.devices.map((d) => (d.id === deviceId ? { ...d, branchId } : d)) }));
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {config!.branches.map((b) => {
          const devices = config!.devices.filter((d) => d.branchId === b.id);
          return (
            <section key={b.id} aria-label={b.name[language]} className="flex flex-col rounded-xl border border-line">
              <div className="flex items-start gap-3 border-b border-line p-4">
                <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-surface">
                  {b.kind === 'shop' ? <Store size={20} /> : <Building2 size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold">{b.name[language]}</p>
                  <p className="text-sm text-muted">
                    {t(`branchKind.${b.kind}`)} · {b.address}
                  </p>
                </div>
                <Button variant="secondary" aria-label={t('settings.editItem', { name: b.name[language] })} onClick={() => onEdit(b)}>
                  <Pencil aria-hidden="true" size={16} />
                </Button>
              </div>
              <ul className="flex flex-col gap-2 p-3">
                {devices.length === 0 && <li className="px-1 text-sm text-muted">{L('কোনো ডিভাইস নেই', 'No devices')}</li>}
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg bg-surface/60 px-3 py-2">
                    <MonitorSmartphone aria-hidden="true" size={18} className="text-muted" />
                    <span className="flex-1 font-semibold">{d.name}</span>
                    <span className="rounded bg-panel px-1.5 font-mono text-sm">{d.series}</span>
                    <select
                      aria-label={t('settings.device.branch', { name: d.name })}
                      value={d.branchId}
                      onChange={(e) => move(d.id, e.target.value)}
                      className="min-h-9 rounded-lg border border-line bg-panel px-2 text-sm"
                    >
                      {config!.branches.map((x) => (
                        <option key={x.id} value={x.id}>
                          {L('সরান: ', 'Move: ')}
                          {x.name[language]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
              <p className="mt-auto border-t border-line px-4 py-2 text-xs text-muted">{L(`${number(devices.length)}টি ডিভাইস`, `${number(devices.length)} Devices`)}</p>
            </section>
          );
        })}
      </div>
      <p className="text-sm text-muted">{t('settings.branches.note')}</p>
      <p className="text-sm text-muted">{t('settings.devices.note')}</p>
    </div>
  );
}

/** The add / edit dialogs, shared by the variants. */
function useEditors() {
  const [staff, setStaff] = useState<{ staff: Staff | null } | null>(null);
  const [branch, setBranch] = useState<{ branch: Branch | null } | null>(null);
  const dialogs = (
    <>
      {staff && <StaffDialog staff={staff.staff} onClose={() => setStaff(null)} onSaved={() => setStaff(null)} />}
      {branch && <BranchDialog branch={branch.branch} onClose={() => setBranch(null)} onSaved={() => setBranch(null)} />}
    </>
  );
  return { editStaff: (s: Staff | null) => setStaff({ staff: s }), editBranch: (b: Branch | null) => setBranch({ branch: b }), dialogs };
}

/** The main button for a section: add a garment, a person or a branch. */
function SectionAction({ k, editors }: { k: SectionKey; editors: ReturnType<typeof useEditors> }) {
  const { t } = useI18n();
  const to = useTo();
  if (k === 'templates')
    return (
      <Link to={to('templates/new')} className={buttonClasses('primary')}>
        <Plus aria-hidden="true" size={18} /> {t('settings.templates.new')}
      </Link>
    );
  if (k === 'staff')
    return (
      <Button onClick={() => editors.editStaff(null)}>
        <Plus aria-hidden="true" size={18} /> {t('settings.staff.new')}
      </Button>
    );
  if (k === 'branches')
    return (
      <Button onClick={() => editors.editBranch(null)}>
        <Plus aria-hidden="true" size={18} /> {t('settings.branches.new')}
      </Button>
    );
  return null;
}

/* ---------- B: side rail + one card for the chosen section ---------- */

export function VariantB() {
  const { t } = useI18n();
  const sections = useSections();
  const summary = useSummary();
  const { key, editor } = useSection();
  const to = useTo();
  const editors = useEditors();
  const Icon = ICONS[key];
  return (
    <div className={PAGE}>
      <nav aria-label={t('settings.sections')} className={`${CARD} w-72 shrink-0`}>
        <h1 className="border-b border-line p-4 font-display text-xl font-bold">{t('nav.settings')}</h1>
        <ul className="flex flex-col gap-1 p-2">
          {sections.map((s) => {
            const SIcon = ICONS[s.key];
            const on = s.key === key;
            return (
              <li key={s.key}>
                <Link
                  to={to(s.path)}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${on ? 'bg-brand-soft ring-1 ring-brand' : 'hover:bg-surface'}`}
                >
                  <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-lg ${on ? 'bg-brand text-on-brand' : 'bg-surface text-muted'}`}>
                    <SIcon size={18} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{t(s.label)}</span>
                    <span className="truncate text-xs text-muted">{summary(s.key)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <section aria-labelledby="settings-section" className={`${CARD} min-w-0 flex-1`}>
        {editor ? (
          <div className="relative min-h-0 flex-1 overflow-auto p-5">
            <Outlet />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-line p-4">
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand-strong">
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="settings-section" className="font-display text-xl font-bold">
                  {t(SETTINGS_SECTIONS.find((s) => s.path === key)!.label)}
                </h2>
                <p className="text-sm text-muted">{summary(key)}</p>
              </div>
              <SectionAction k={key} editors={editors} />
            </div>
            {key === 'shop' ? (
              <ShopForm />
            ) : (
              <div className="relative min-h-0 flex-1 overflow-auto">
                {key === 'templates' && <GarmentCards />}
                {key === 'staff' && <StaffCards onEdit={editors.editStaff} />}
                {key === 'branches' && <BranchBoard onEdit={editors.editBranch} />}
              </div>
            )}
          </>
        )}
        {editors.dialogs}
      </section>
    </div>
  );
}

/* ---------- C: one card, every section on one scrolling page ---------- */

export function VariantC() {
  const { t, language, money } = useI18n();
  const sections = useSections();
  const summary = useSummary();
  const { key, editor } = useSection();
  const { config } = useSnapshot();
  const editors = useEditors();
  const to = useTo();
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState<SectionKey>(key);

  // Opens at the section in the address, then follows the scroll.
  useEffect(() => {
    if (editor) return;
    document.getElementById(`sec-${key}`)?.scrollIntoView({ block: 'start' });
  }, [key, editor]);
  const follow = () => {
    const root = scroller.current;
    if (!root) return;
    const top = root.getBoundingClientRect().top + 48;
    let current = sections[0]?.key ?? 'shop';
    root.querySelectorAll<HTMLElement>('[id^="sec-"]').forEach((el) => {
      if (el.getBoundingClientRect().top <= top) current = el.id.slice(4) as SectionKey;
    });
    if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = sections[sections.length - 1]?.key ?? current;
    setSeen(current);
  };

  if (editor)
    return (
      <div className={PAGE}>
        <section className={`${CARD} flex-1`}>
          <div className="relative min-h-0 flex-1 overflow-auto p-5">
            <Outlet />
          </div>
        </section>
      </div>
    );

  const block = (k: SectionKey, body: ReactNode) => {
    const Icon = ICONS[k];
    return (
      <section id={`sec-${k}`} aria-labelledby={`h-${k}`} className="scroll-mt-2 border-b border-line last:border-b-0">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-panel/95 px-5 py-3 backdrop-blur">
          <Icon aria-hidden="true" size={20} className="text-brand-strong" />
          <h2 id={`h-${k}`} className="font-display text-lg font-bold">
            {t(SETTINGS_SECTIONS.find((s) => s.path === k)!.label)}
          </h2>
          <span className="text-sm text-muted">{summary(k)}</span>
          <span className="ms-auto">
            <SectionAction k={k} editors={editors} />
          </span>
        </div>
        {body}
      </section>
    );
  };
  const role = (id: string) => config!.roles.find((r) => r.id === id)?.name[language] ?? id;

  return (
    <div className={PAGE}>
      <section aria-labelledby="settings-title" className={`${CARD} min-w-0 flex-1`}>
        <div className="flex items-center gap-4 border-b border-line px-5 py-3">
          <h1 id="settings-title" className="font-display text-xl font-bold">
            {t('nav.settings')}
          </h1>
          <nav aria-label={t('settings.sections')} className="flex rounded-lg bg-surface p-1">
            {sections.map((s) => {
              const Icon = ICONS[s.key];
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-current={seen === s.key ? 'true' : undefined}
                  onClick={() => {
                    navigate(to(s.path), { replace: true });
                    document.getElementById(`sec-${s.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-sm ${seen === s.key ? 'bg-panel text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                >
                  <Icon aria-hidden="true" size={15} /> {t(s.label)}
                </button>
              );
            })}
          </nav>
        </div>
        <div ref={scroller} onScroll={follow} className="relative min-h-0 flex-1 overflow-auto">
          {sections.some((s) => s.key === 'shop') && block('shop', <ShopForm inline />)}
          {sections.some((s) => s.key === 'templates') &&
            block(
              'templates',
              <table className="w-full border-collapse">
                <tbody>
                  {config!.templates.map((tp) => (
                    <tr key={tp.id} className="border-b border-line last:border-b-0 hover:bg-surface">
                      <td className="px-5 py-3 font-semibold">
                        <Link to={to(`templates/${tp.id}`)} className="text-brand-strong underline">
                          {tp.name[language]}
                        </Link>
                      </td>
                      <td className="px-3 py-3"><StagePipe template={tp} /></td>
                      <td className="whitespace-nowrap px-3 py-3">{money(tp.defaultPrice)}</td>
                      <td className="px-5 py-3 text-end"><StatusDot on={tp.active} label={tp.active ? t('settings.template.inUse') : t('settings.template.retired')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>,
            )}
          {sections.some((s) => s.key === 'staff') &&
            block(
              'staff',
              <table className="w-full border-collapse">
                <tbody>
                  {config!.staff.map((s) => (
                    <tr key={s.id} className="border-b border-line last:border-b-0 hover:bg-surface">
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2.5 font-semibold">
                          <Avatar id={s.id} name={s.name} size="sm" /> {s.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{role(s.roleId)}</td>
                      <td className="px-3 py-2.5 text-sm">{branchText(s, config!.branches, language, t('branch.all'))}</td>
                      <td className="px-3 py-2.5"><StatusDot on={s.active} label={s.active ? t('settings.staff.active') : t('settings.staff.inactive')} /></td>
                      <td className="px-5 py-2.5 text-end">
                        <Button variant="ghost" aria-label={t('settings.editItem', { name: s.name })} onClick={() => editors.editStaff(s)}>
                          <Pencil aria-hidden="true" size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>,
            )}
          {sections.some((s) => s.key === 'branches') && block('branches', <BranchBoard onEdit={editors.editBranch} />)}
        </div>
        {editors.dialogs}
      </section>
    </div>
  );
}

/* ---------- D: tabs and a list in one card, the picked row in an inspector beside it ---------- */

export function VariantD() {
  const { t, language, money, number } = useI18n();
  const L = useL();
  const sections = useSections();
  const summary = useSummary();
  const { key, editor } = useSection();
  const { config } = useSnapshot();
  const editors = useEditors();
  const to = useTo();
  const [params, setParams] = useSearchParams();
  const picked = params.get('item');
  const pick = (id: string | null) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (id) p.set('item', id);
        else p.delete('item');
        return p;
      },
      { replace: true },
    );
  if (!config) return null;

  const tabs = (
    <nav aria-label={t('settings.sections')} className="flex rounded-lg bg-surface p-1">
      {sections.map((s) => {
        const Icon = ICONS[s.key];
        const on = s.key === key;
        return (
          <Link
            key={s.key}
            to={to(s.path)}
            aria-current={on ? 'page' : undefined}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-sm ${on ? 'bg-panel text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <Icon aria-hidden="true" size={15} /> {t(s.label)}
          </Link>
        );
      })}
    </nav>
  );

  const rowClass = (id: string) => `cursor-pointer border-b border-line ${picked === id ? 'bg-brand-soft' : 'hover:bg-surface'}`;
  const role = (id: string) => config.roles.find((r) => r.id === id)?.name[language] ?? id;
  const template = key === 'templates' ? config.templates.find((x) => x.id === picked) : undefined;
  const person = key === 'staff' ? config.staff.find((x) => x.id === picked) : undefined;
  const branch = key === 'branches' ? config.branches.find((x) => x.id === picked) : undefined;

  const list = (
    <table className="w-full border-collapse">
      {key === 'templates' && (
        <>
          <thead>
            <tr>
              <th scope="col" className={head}>{t('settings.col.name')}</th>
              <th scope="col" className={head}>{L('মাপ', 'Measurements')}</th>
              <th scope="col" className={head}>{t('receipt.price')}</th>
              <th scope="col" className={head}>{t('settings.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {config.templates.map((tp) => (
              <tr key={tp.id} aria-selected={picked === tp.id} onClick={() => pick(tp.id)} className={rowClass(tp.id)}>
                <td className="px-4 py-3 font-semibold">{tp.name[language]}</td>
                <td className="px-4 py-3 text-muted">{number(tp.fields.length)}</td>
                <td className="px-4 py-3">{money(tp.defaultPrice)}</td>
                <td className="px-4 py-3"><StatusDot on={tp.active} label={tp.active ? t('settings.template.inUse') : t('settings.template.retired')} /></td>
              </tr>
            ))}
          </tbody>
        </>
      )}
      {key === 'staff' && (
        <>
          <thead>
            <tr>
              <th scope="col" className={head}>{t('settings.col.name')}</th>
              <th scope="col" className={head}>{t('settings.staff.role')}</th>
              {!picked && <th scope="col" className={head}>{t('branch.label')}</th>}
              <th scope="col" className={head}>{t('settings.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {config.staff.map((s) => (
              <tr key={s.id} aria-selected={picked === s.id} onClick={() => pick(s.id)} className={rowClass(s.id)}>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2.5 font-semibold">
                    <Avatar id={s.id} name={s.name} size="sm" /> {s.name}
                  </span>
                </td>
                <td className="px-4 py-2.5">{role(s.roleId)}</td>
                {!picked && <td className="px-4 py-2.5 text-sm">{branchText(s, config.branches, language, t('branch.all'))}</td>}
                <td className="px-4 py-2.5"><StatusDot on={s.active} label={s.active ? t('settings.staff.active') : t('settings.staff.inactive')} /></td>
              </tr>
            ))}
          </tbody>
        </>
      )}
      {key === 'branches' && (
        <>
          <thead>
            <tr>
              <th scope="col" className={head}>{t('settings.col.name')}</th>
              <th scope="col" className={head}>{t('settings.branch.kind')}</th>
              <th scope="col" className={head}>{t('settings.devices.list')}</th>
              {!picked && <th scope="col" className={head}>{t('settings.shop.address')}</th>}
            </tr>
          </thead>
          <tbody>
            {config.branches.map((b) => (
              <tr key={b.id} aria-selected={picked === b.id} onClick={() => pick(b.id)} className={rowClass(b.id)}>
                <td className="px-4 py-3 font-semibold">{b.name[language]}</td>
                <td className="px-4 py-3">{t(`branchKind.${b.kind}`)}</td>
                <td className="px-4 py-3">{number(config.devices.filter((d) => d.branchId === b.id).length)}</td>
                {!picked && <td className="px-4 py-3 text-sm">{b.address}</td>}
              </tr>
            ))}
          </tbody>
        </>
      )}
    </table>
  );

  const inspector = (title: string, sub: string, avatar: ReactNode, body: ReactNode, actions: ReactNode) => (
    <aside aria-label={title} className={`${CARD} w-[min(560px,44%)] shrink-0`}>
      <div className="flex items-start gap-3 border-b border-line p-4">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold">{title}</p>
          <p className="text-sm text-muted">{sub}</p>
        </div>
        <Button variant="ghost" aria-label={L('বন্ধ করুন', 'Close')} onClick={() => pick(null)}>
          <X aria-hidden="true" size={18} />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto p-4">{body}</div>
      <div className="flex gap-2 border-t border-line bg-surface/60 p-3">{actions}</div>
    </aside>
  );

  const fact = (label: string, value: ReactNode) => (
    <div className="flex justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="text-end font-semibold">{value}</span>
    </div>
  );

  return (
    <div className={PAGE}>
      <section aria-labelledby="settings-title" className={`${CARD} min-w-0 flex-1`}>
        <div className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3">
          <h1 id="settings-title" className="font-display text-xl font-bold">
            {t('nav.settings')}
          </h1>
          {tabs}
          <span className="ms-auto">{!editor && <SectionAction k={key} editors={editors} />}</span>
        </div>
        {editor ? (
          <div className="relative min-h-0 flex-1 overflow-auto p-5">
            <Outlet />
          </div>
        ) : key === 'shop' ? (
          <ShopForm />
        ) : (
          <>
            <div className="relative min-h-0 flex-1 overflow-auto">{list}</div>
            <p className="border-t border-line px-4 py-2 text-sm text-muted">{summary(key)}</p>
          </>
        )}
        {editors.dialogs}
      </section>

      {template &&
        inspector(
          template.name[language],
          `${money(template.defaultPrice)} · ${template.active ? t('settings.template.inUse') : t('settings.template.retired')}`,
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-strong"><Shirt size={24} /></span>,
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 font-semibold">{t('settings.template.stages')}</p>
              <StagePipe template={template} />
            </div>
            <div>
              <p className="mb-2 font-semibold">{t('settings.template.fields')}</p>
              <FieldGroups template={template} />
            </div>
          </div>,
          <Link to={to(`templates/${template.id}`)} className={buttonClasses('primary')}>
            <Pencil aria-hidden="true" size={16} /> {L('মাপ ও ধাপ বদলান', 'Edit Measurements and Stages')}
          </Link>,
        )}
      {person &&
        inspector(
          person.name,
          role(person.roleId),
          <Avatar id={person.id} name={person.name} size="lg" />,
          <div className="flex flex-col gap-4">
            <div>
              {fact(t('settings.staff.role'), role(person.roleId))}
              {fact(t('branch.label'), branchText(person, config.branches, language, t('branch.all')))}
              {fact(t('settings.col.status'), <StatusDot on={person.active} label={person.active ? t('settings.staff.active') : t('settings.staff.inactive')} />)}
              {fact(t('pin.label'), '••••')}
            </div>
            <div>
              <p className="mb-2 font-semibold">{L('এই ভূমিকা যা পারে', 'What This Role Can Do')}</p>
              <ul className="flex flex-wrap gap-1.5">
                {[...new Set(config.roles.find((r) => r.id === person.roleId)?.capabilities.map((c) => c.split('.')[0]!) ?? [])].map((area) => (
                  <li key={area} className="rounded-md bg-ok-soft px-2 py-0.5 text-sm text-ok">
                    {AREAS[area]?.[language === 'bn' ? 0 : 1] ?? area}
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          <Button onClick={() => editors.editStaff(person)}>
            <Pencil aria-hidden="true" size={16} /> {t('settings.editItem', { name: person.name })}
          </Button>,
        )}
      {branch &&
        inspector(
          branch.name[language],
          `${t(`branchKind.${branch.kind}`)} · ${branch.address}`,
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-surface">{branch.kind === 'shop' ? <Store size={24} /> : <Building2 size={24} />}</span>,
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 font-semibold">{t('settings.devices.list')}</p>
              <ul className="flex flex-col gap-2">
                {config.devices
                  .filter((d) => d.branchId === branch.id)
                  .map((d) => (
                    <li key={d.id} className="flex items-center gap-3 rounded-lg bg-surface/60 px-3 py-2">
                      <MonitorSmartphone aria-hidden="true" size={18} className="text-muted" />
                      <span className="flex-1 font-semibold">{d.name}</span>
                      <span className="font-mono text-sm">{d.series}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-semibold">{t('settings.staff')}</p>
              <ul className="flex flex-wrap gap-2">
                {config.staff
                  .filter((s) => s.branchIds === 'all' || s.branchIds.includes(branch.id))
                  .map((s) => (
                    <li key={s.id} className="flex items-center gap-2 rounded-full bg-surface py-1 pe-3 ps-1 text-sm">
                      <Avatar id={s.id} name={s.name} size="sm" /> {s.name}
                    </li>
                  ))}
              </ul>
            </div>
            <p className="text-sm text-muted">{t('settings.devices.note')}</p>
          </div>,
          <Button onClick={() => editors.editBranch(branch)}>
            <Pencil aria-hidden="true" size={16} /> {t('settings.editItem', { name: branch.name[language] })}
          </Button>,
        )}
    </div>
  );
}
