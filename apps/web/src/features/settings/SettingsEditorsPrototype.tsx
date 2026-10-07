// PROTOTYPE (throwaway): desktop variants of the garment, staff and branch editors behind ?variant=.
// Lives on prototype/settings-editors-desktop only. Every label goes through t() or tx(bn, en).
import type { Branch, GarmentTemplate, Staff } from '@darzikhata/domain';
import { ArrowDown, ArrowUp, Building2, ChevronRight, MonitorSmartphone, Plus, Shirt, Store, Trash2, X } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { useModalFocus } from '../../ui/Dialog';
import { NumberField } from '../../ui/NumberField';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { Switch } from '../../ui/Switch';
import { TextField } from '../../ui/TextField';
import { groupLabel } from '../customers/measurementView';
import { BranchSettings } from './BranchSettings';
import { configProblemText } from './configProblems';
import { SECTION_BODY, SectionHeader, StatusPill } from './SettingsCards';
import { slugKey } from './keys';
import { StaffSettings } from './StaffSettings';
import { readStaff, staffForm, type StaffForm } from './staffInput';
import { TemplateEditor } from './TemplateEditor';
import {
  FIELD_GROUPS,
  addField,
  addStage,
  moveRow,
  newTemplateForm,
  readTemplate,
  removeRow,
  templateForm,
  type FieldRow,
  type StageRow,
  type TemplateErrors,
  type TemplateForm,
} from './templateInput';
import { TemplatesSettings } from './TemplatesSettings';

const VARIANTS = {
  A: 'Current',
  B: 'List beside the editor',
  C: 'Table, edit in a drawer',
  D: 'See the result (preview, roles, grid)',
};
const KEYS = Object.keys(VARIANTS);

function useTx() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

const input =
  'min-h-10 w-full min-w-0 rounded-lg border border-line bg-panel px-2 py-1 text-base focus-visible:outline-2 focus-visible:outline-focus aria-[invalid=true]:border-danger';
const STAGE_KINDS = ['unfinished', 'ready', 'delivered'] as const;
const kindTone = (g: StageRow['group']) => (g === 'delivered' ? 'bg-ok-soft text-ok' : g === 'ready' ? 'bg-brand-soft text-brand-strong' : 'bg-surface');

/* ------------------------------------------------------------------ shared pieces */

function Drawer({ title, onClose, children, footer }: { title: string; onClose(): void; children: ReactNode; footer?: ReactNode }) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocus(true, panel, onClose);
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="flex h-full w-[620px] max-w-full flex-col bg-panel shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="min-w-0 flex-1 truncate font-display text-xl font-bold">
            {title}
          </h2>
          <Button variant="ghost" aria-label={t('common.close')} onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </Button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto p-5">{children}</div>
        {footer && <div className="flex gap-3 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

function Notice({ saved, problem }: { saved?: boolean; problem?: string | null }) {
  const { t } = useI18n();
  return (
    <>
      {saved && (
        <p role="status" className="text-brand-strong">
          {t('settings.saved')}
        </p>
      )}
      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
    </>
  );
}

function RowButtons({ onUp, onDown, onRemove, n, kind }: { onUp?: () => void; onDown?: () => void; onRemove?: () => void; n: string; kind: 'field' | 'stage' }) {
  const { t } = useI18n();
  return (
    <div className="flex shrink-0 gap-1">
      <Button variant="ghost" className="!min-h-9 !px-2" disabled={!onUp} aria-label={t(`settings.${kind}.up`, { n })} onClick={onUp}>
        <ArrowUp aria-hidden="true" size={16} />
      </Button>
      <Button variant="ghost" className="!min-h-9 !px-2" disabled={!onDown} aria-label={t(`settings.${kind}.down`, { n })} onClick={onDown}>
        <ArrowDown aria-hidden="true" size={16} />
      </Button>
      {onRemove && (
        <Button variant="ghost" className="!min-h-9 !px-2 text-danger" aria-label={t(`settings.${kind}.remove`, { n })} onClick={onRemove}>
          <Trash2 aria-hidden="true" size={16} />
        </Button>
      )}
    </div>
  );
}

function UnitToggle({ value, onChange, n }: { value: FieldRow['unit']; onChange(u: FieldRow['unit']): void; n: string }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t('settings.field.unit', { n })} className="flex shrink-0 rounded-lg border border-line p-0.5">
      {(['inch', 'cm'] as const).map((u) => (
        <button
          key={u}
          type="button"
          role="radio"
          aria-checked={value === u}
          onClick={() => onChange(u)}
          className={`min-h-8 rounded-md px-2.5 text-sm ${value === u ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surface'}`}
        >
          {t(`unit.${u}`)}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ template draft */

function useTemplateDraft(initial: TemplateForm, onSaved?: (id: string) => void) {
  const { t, language } = useI18n();
  const store = useStore();
  const [start] = useState(() => JSON.stringify(initial));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<TemplateErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const update = (change: (f: TemplateForm) => TemplateForm) => {
    setSaved(false);
    setForm(change);
  };
  const patchField = (i: number, patch: Partial<FieldRow>) => update((f) => ({ ...f, fields: f.fields.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const patchStage = (i: number, patch: Partial<StageRow>) => update((f) => ({ ...f, stages: f.stages.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const err = (path: string) => (errors[path] ? t(errors[path]) : undefined);
  async function save() {
    if (saving) return;
    setProblem(null);
    const result = readTemplate(form, store.getSnapshot().config?.templates ?? []);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    const { template } = result;
    const outcome = await store.updateConfig((c) => ({
      ...c,
      templates: c.templates.some((x) => x.id === template.id) ? c.templates.map((x) => (x.id === template.id ? template : x)) : [...c.templates, template],
    }));
    setSaving(false);
    if (!outcome.ok) {
      setProblem(configProblemText(outcome.problems, language));
      return;
    }
    setSaved(true);
    onSaved?.(template.id);
  }
  return { form, update, patchField, patchStage, err, errors, problem, saving, saved, save, dirty: JSON.stringify(form) !== start };
}
type TemplateDraft = ReturnType<typeof useTemplateDraft>;

function useTemplateSelection() {
  const { templateId } = useParams();
  const { pathname } = useLocation();
  const { config } = useSnapshot();
  const templates = config?.templates ?? [];
  const isNew = pathname.endsWith('/templates/new');
  const id = isNew ? null : (templateId ?? templates[0]?.id ?? null);
  return { templates, isNew, template: templates.find((x) => x.id === id) ?? null };
}

function useVariantLink() {
  const v = useVariant(KEYS);
  return (path: string) => `${path}?variant=${v}`;
}

/** Name, price and on/off for one garment, laid out in a single row. */
function BasicsRow({ d, wide = true }: { d: TemplateDraft; wide?: boolean }) {
  const { t } = useI18n();
  const { form, update, err } = d;
  return (
    <div className={`grid items-start gap-3 ${wide ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto]' : 'grid-cols-2'}`}>
      <TextField label={t('settings.nameBn')} value={form.nameBn} onChange={(e) => update((f) => ({ ...f, nameBn: e.target.value }))} error={err('nameBn')} autoComplete="off" />
      <TextField label={t('settings.nameEn')} value={form.nameEn} onChange={(e) => update((f) => ({ ...f, nameEn: e.target.value }))} autoComplete="off" />
      <NumberField label={t('receipt.price')} kind="money" initialValue={form.price} onValueChange={(price) => update((f) => ({ ...f, price }))} error={err('price')} />
      <div className="flex flex-col gap-2">
        <span className="font-medium">{t('settings.template.active')}</span>
        <Switch label={t('settings.template.active')} on={form.active} onChange={(active) => update((f) => ({ ...f, active }))} />
      </div>
    </div>
  );
}

/** One measurement field's inputs. `stacked` puts the names on their own line for a narrow panel. */
function FieldInputs({ d, i, stacked = false, showGroup = true }: { d: TemplateDraft; i: number; stacked?: boolean; showGroup?: boolean }) {
  const { t, number } = useI18n();
  const tx = useTx();
  const { form, patchField, update, err } = d;
  const row = form.fields[i]!;
  const n = number(i + 1);
  const labelError = err(`fields.${i}.label`);
  const names = (
    <>
      <input
        aria-label={t('settings.field.labelBn', { n })}
        value={row.labelBn}
        onChange={(e) => patchField(i, { labelBn: e.target.value })}
        aria-invalid={labelError ? true : undefined}
        className={input}
        autoComplete="off"
      />
      <input aria-label={t('settings.field.labelEn', { n })} value={row.labelEn} onChange={(e) => patchField(i, { labelEn: e.target.value })} className={input} autoComplete="off" />
    </>
  );
  const rest = (
    <>
      {showGroup && (
        <select aria-label={t('settings.field.group', { n })} value={row.group} onChange={(e) => patchField(i, { group: e.target.value })} className={`${input} !w-32`}>
          {[...new Set([...FIELD_GROUPS, row.group])].map((g) => (
            <option key={g} value={g}>
              {groupLabel(g, t)}
            </option>
          ))}
        </select>
      )}
      <UnitToggle value={row.unit} onChange={(unit) => patchField(i, { unit })} n={n} />
      <label className="flex shrink-0 items-center gap-2 text-sm">
        <input type="checkbox" checked={row.required} onChange={(e) => patchField(i, { required: e.target.checked })} className="size-4 accent-[var(--color-brand)]" />
        <span aria-hidden="true">{tx('জরুরি', 'Required')}</span>
        <span className="sr-only">{t('settings.field.required', { n })}</span>
      </label>
      <RowButtons
        kind="field"
        n={n}
        onUp={i > 0 ? () => update((f) => moveRow(f, 'fields', i, -1)) : undefined}
        onDown={i < form.fields.length - 1 ? () => update((f) => moveRow(f, 'fields', i, 1)) : undefined}
        onRemove={row.saved ? undefined : () => update((f) => removeRow(f, 'fields', i))}
      />
    </>
  );
  if (stacked)
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
        <div className="grid grid-cols-2 gap-2">{names}</div>
        <div className="flex flex-wrap items-center gap-2">{rest}</div>
        {labelError && <p className="text-sm text-danger">{labelError}</p>}
      </div>
    );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2">{names}</div>
        {rest}
      </div>
      {labelError && <p className="text-sm text-danger">{labelError}</p>}
    </div>
  );
}

/** The fields under group headings, in their saved order. */
function FieldsByGroup({ d, stacked = false }: { d: TemplateDraft; stacked?: boolean }) {
  const { t } = useI18n();
  const groups = [...new Set(d.form.fields.map((f) => f.group))];
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g} className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{groupLabel(g, t)}</h4>
          {d.form.fields.map((row, i) => (row.group === g ? <FieldInputs key={row.rowId} d={d} i={i} stacked={stacked} /> : null))}
        </div>
      ))}
    </div>
  );
}

function StageInputs({ d, i, showKind = true, pair = false }: { d: TemplateDraft; i: number; showKind?: boolean; pair?: boolean }) {
  const { t, number } = useI18n();
  const tx = useTx();
  const { form, patchStage, update, err } = d;
  const row = form.stages[i]!;
  const n = number(i + 1);
  const labelError = err(`stages.${i}.label`);
  return (
    <div className="flex flex-col gap-2">
      <div className={pair ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
      <input
        aria-label={t('settings.stage.labelBn', { n })}
        value={row.labelBn}
        onChange={(e) => patchStage(i, { labelBn: e.target.value })}
        aria-invalid={labelError ? true : undefined}
        className={input}
        autoComplete="off"
      />
      <input aria-label={t('settings.stage.labelEn', { n })} value={row.labelEn} onChange={(e) => patchStage(i, { labelEn: e.target.value })} className={input} autoComplete="off" />
      </div>
      {labelError && <p className="text-sm text-danger">{labelError}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {showKind && (
          <select aria-label={t('settings.stage.group', { n })} value={row.group} onChange={(e) => patchStage(i, { group: e.target.value as StageRow['group'] })} className={`${input} !w-auto`}>
            {STAGE_KINDS.map((g) => (
              <option key={g} value={g}>
                {t(`stageGroup.${g}`)}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={row.optional} onChange={(e) => patchStage(i, { optional: e.target.checked })} className="size-4 accent-[var(--color-brand)]" />
          <span aria-hidden="true">{tx('বাদ দেওয়া যায়', 'Can skip')}</span>
          <span className="sr-only">{t('settings.stage.optional', { n })}</span>
        </label>
        <span className="flex-1" />
        <RowButtons
          kind="stage"
          n={n}
          onUp={i > 0 ? () => update((f) => moveRow(f, 'stages', i, -1)) : undefined}
          onDown={i < form.stages.length - 1 ? () => update((f) => moveRow(f, 'stages', i, 1)) : undefined}
          onRemove={() => update((f) => removeRow(f, 'stages', i))}
        />
      </div>
    </div>
  );
}

function StagesError({ d }: { d: TemplateDraft }) {
  const { t } = useI18n();
  return d.errors.stages ? (
    <p role="alert" className="text-danger">
      {t(d.errors.stages)}
    </p>
  ) : null;
}

/* ------------------------------------------------------------------ templates: B, list beside the editor */

function TemplatesSplit() {
  const { t, language, money } = useI18n();
  const tx = useTx();
  const link = useVariantLink();
  const navigate = useNavigate();
  const { templates, template, isNew } = useTemplateSelection();
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-r border-line">
        <div className="border-b border-line p-3">
          <Link to={link('/app/settings/templates/new')} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg font-semibold ${isNew ? 'bg-brand text-on-brand' : 'border border-line hover:bg-surface'}`}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.templates.new')}
          </Link>
        </div>
        <ul aria-label={t('settings.templates.list')} className="relative min-h-0 flex-1 overflow-auto p-2">
          {templates.map((x) => {
            const on = x.id === template?.id;
            return (
              <li key={x.id}>
                <Link
                  to={link(`/app/settings/templates/${x.id}`)}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${on ? 'bg-brand-soft ring-1 ring-brand' : 'hover:bg-surface'} ${x.active ? '' : 'opacity-60'}`}
                >
                  <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-lg ${on ? 'bg-brand text-on-brand' : 'bg-surface text-muted'}`}>
                    <Shirt size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{x.name[language]}</span>
                    <span className="block truncate text-xs text-muted">{x.active ? money(x.defaultPrice) : t('settings.template.retired')}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex min-h-0 flex-col">
        {(template || isNew) && (
          <SplitEditor
            key={template?.id ?? 'new'}
            initial={template ? templateForm(template) : newTemplateForm()}
            title={template ? template.name[language] : t('settings.templates.new')}
            onSaved={(id) => navigate(link(`/app/settings/templates/${id}`), { replace: true })}
            hint={tx('মাপ আর ধাপ একসাথে, বাঁ দিক থেকে আরেকটা পোশাক বেছে নিন', 'Measurements and stages together; pick another garment on the left')}
          />
        )}
      </div>
    </div>
  );
}

function SplitEditor({ initial, title, onSaved, hint }: { initial: TemplateForm; title: string; onSaved(id: string): void; hint: string }) {
  const { t } = useI18n();
  const tx = useTx();
  const d = useTemplateDraft(initial, onSaved);
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl font-bold">{title}</h2>
          <p className="truncate text-sm text-muted">{hint}</p>
        </div>
        {d.dirty && !d.saved && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn-ink">{t('settings.unsaved')}</span>}
        <Button onClick={() => void d.save()} disabled={d.saving}>
          {t('common.save')}
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto p-5">
        <div className="flex flex-col gap-6">
          <Notice saved={d.saved} problem={d.problem} />
          <BasicsRow d={d} />
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-lg font-bold">{t('settings.template.fields')}</h3>
              <span className="flex-1" />
              <Button variant="secondary" onClick={() => d.update(addField)}>
                <Plus aria-hidden="true" size={16} />
                {t('settings.field.add')}
              </Button>
            </div>
            <FieldsByGroup d={d} />
            <p className="text-sm text-muted">{t('settings.template.fieldsNote')}</p>
          </section>
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-lg font-bold">{t('settings.template.stages')}</h3>
              <span className="text-sm text-muted">{tx('বাঁ থেকে ডানে, যে ক্রমে কাজ হয়', 'Left to right, in the order the work happens')}</span>
            </div>
            <StagesError d={d} />
            <ol aria-label={t('settings.template.stages')} className="relative flex items-stretch gap-2 overflow-x-auto pb-2">
              {d.form.stages.map((row, i) => (
                <li key={row.rowId} className="flex items-stretch gap-2">
                  {i > 0 && <ChevronRight aria-hidden="true" size={18} className="self-center text-muted" />}
                  <div className={`flex w-56 shrink-0 flex-col gap-2 rounded-xl border p-3 ${row.optional ? 'border-dashed border-line' : 'border-line'}`}>
                    <span className={`self-start rounded-md px-1.5 py-0.5 text-xs font-semibold ${kindTone(row.group)}`}>{t(`stageGroup.${row.group}`)}</span>
                    <StageInputs d={d} i={i} />
                  </div>
                </li>
              ))}
              <li className="flex items-center">
                <Button variant="secondary" data-tour="add-stage" onClick={() => d.update(addStage)}>
                  <Plus aria-hidden="true" size={16} />
                  {t('settings.stage.add')}
                </Button>
              </li>
            </ol>
            <p className="text-sm text-muted">{t('settings.template.stagesNote')}</p>
          </section>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ templates: C, a table and a drawer with tabs */

function TemplatesTable() {
  const { t, language, money, number } = useI18n();
  const link = useVariantLink();
  const navigate = useNavigate();
  const { templateId } = useParams();
  const { templates, isNew } = useTemplateSelection();
  const open = isNew ? null : templateId ? templates.find((x) => x.id === templateId) : undefined;
  const close = () => navigate(link('/app/settings/templates'));
  return (
    <>
      <SectionHeader
        path="templates"
        action={
          <Link to={link('/app/settings/templates/new')} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand">
            <Plus aria-hidden="true" size={18} />
            {t('settings.templates.new')}
          </Link>
        }
      />
      <div className={`${SECTION_BODY} p-5`}>
        <table className="w-full border-collapse text-left">
          <thead className="text-sm text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">{t('settings.col.name')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('receipt.price')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('settings.template.fields')}</th>
              <th className="px-3 py-2 font-medium">{t('settings.template.stages')}</th>
              <th className="px-3 py-2 font-medium">{t('settings.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((x) => (
              <tr key={x.id} className="relative border-b border-line hover:bg-surface">
                <td className="px-3 py-3 font-semibold">
                  <Link to={link(`/app/settings/templates/${x.id}`)} className="after:absolute after:inset-0">
                    {x.name[language]}
                  </Link>
                </td>
                <td className="px-3 py-3 text-right font-display font-bold">{money(x.defaultPrice)}</td>
                <td className="px-3 py-3 text-right">{number(x.fields.length)}</td>
                <td className="px-3 py-3">
                  <MiniPath template={x} />
                </td>
                <td className="px-3 py-3">
                  <StatusPill on={x.active} label={x.active ? t('settings.template.inUse') : t('settings.template.retired')} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(open || isNew) && (
        <DrawerEditor
          key={open?.id ?? 'new'}
          initial={open ? templateForm(open) : newTemplateForm()}
          title={open ? open.name[language] : t('settings.templates.new')}
          onClose={close}
        />
      )}
    </>
  );
}

function MiniPath({ template }: { template: GarmentTemplate }) {
  const { language } = useI18n();
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs">
      {template.stages.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1">
          {i > 0 && <ChevronRight aria-hidden="true" size={10} className="text-muted" />}
          <span className={`rounded px-1 py-0.5 ${kindTone(s.group)} ${s.optional ? 'opacity-60' : ''}`}>{s.label[language]}</span>
        </span>
      ))}
    </span>
  );
}

function DrawerEditor({ initial, title, onClose }: { initial: TemplateForm; title: string; onClose(): void }) {
  const { t, number } = useI18n();
  const tx = useTx();
  const d = useTemplateDraft(initial, onClose);
  const [tab, setTab] = useState<'basics' | 'fields' | 'stages'>('basics');
  const tabs = [
    { id: 'basics', label: tx('নাম ও দাম', 'Name and Price') },
    { id: 'fields', label: `${t('settings.template.fields')} (${number(d.form.fields.length)})` },
    { id: 'stages', label: `${t('settings.template.stages')} (${number(d.form.stages.length)})` },
  ] as const;
  const bad = { basics: !!(d.errors.nameBn || d.errors.price), fields: Object.keys(d.errors).some((k) => k.startsWith('fields.')), stages: Object.keys(d.errors).some((k) => k.startsWith('stages')) };
  return (
    <Drawer
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="lg" className="flex-[2]" onClick={() => void d.save()} disabled={d.saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div role="tablist" className="mb-5 flex gap-1 rounded-xl bg-surface p-1">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`relative min-h-10 flex-1 rounded-lg text-sm font-semibold ${tab === x.id ? 'bg-panel shadow-sm' : 'text-muted'}`}
          >
            {x.label}
            {bad[x.id] && <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full bg-danger" />}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex flex-col gap-4">
        <Notice problem={d.problem} />
        {tab === 'basics' && <BasicsRow d={d} wide={false} />}
        {tab === 'fields' && (
          <>
            <FieldsByGroup d={d} stacked />
            <div>
              <Button variant="secondary" onClick={() => d.update(addField)}>
                <Plus aria-hidden="true" size={16} />
                {t('settings.field.add')}
              </Button>
            </div>
            <p className="text-sm text-muted">{t('settings.template.fieldsNote')}</p>
          </>
        )}
        {tab === 'stages' && <StageBands d={d} />}
      </div>
    </Drawer>
  );
}

/** Stages in three bands. The band sets the kind, so the order rule cannot be broken by a wrong select. */
function StageBands({ d }: { d: TemplateDraft }) {
  const { t } = useI18n();
  const tx = useTx();
  const order = (g: StageRow['group']) => STAGE_KINDS.indexOf(g);
  const addTo = (group: StageRow['group']) =>
    d.update((f) => {
      const row: StageRow = { rowId: `new-${f.nextRow}`, key: '', labelBn: '', labelEn: '', group, optional: false };
      let at = 0;
      f.stages.forEach((s, i) => {
        if (order(s.group) <= order(group)) at = i + 1;
      });
      return { ...f, stages: [...f.stages.slice(0, at), row, ...f.stages.slice(at)], nextRow: f.nextRow + 1 };
    });
  const hints = {
    unfinished: tx('কাজ চলছে, যেমন কাটিং, সেলাই', 'Work going on, like cutting and sewing'),
    ready: tx('ডেলিভারির জন্য তৈরি', 'Ready to hand over'),
    delivered: tx('কাস্টমার নিয়ে গেছেন, একটাই থাকে', 'The customer has it; only one'),
  };
  return (
    <div className="flex flex-col gap-4">
      <StagesError d={d} />
      {STAGE_KINDS.map((g) => {
        const rows = d.form.stages.map((row, i) => ({ row, i })).filter((x) => x.row.group === g);
        return (
          <section key={g} aria-label={t(`stageGroup.${g}`)} className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${kindTone(g)}`}>{t(`stageGroup.${g}`)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted">{hints[g]}</span>
              {!(g === 'delivered' && rows.length > 0) && (
                <Button variant="ghost" onClick={() => addTo(g)}>
                  <Plus aria-hidden="true" size={16} />
                  {t('settings.stage.add')}
                </Button>
              )}
            </div>
            {rows.map(({ row, i }) => (
              <div key={row.rowId} className={`rounded-lg p-3 ${row.optional ? 'border border-dashed border-line' : 'bg-surface/60'}`}>
                <StageInputs d={d} i={i} showKind={false} pair />
              </div>
            ))}
          </section>
        );
      })}
      <p className="text-sm text-muted">{t('settings.template.stagesNote')}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ templates: D, the editor with a live preview */

function TemplatesPreview() {
  const { t, language } = useI18n();
  const link = useVariantLink();
  const navigate = useNavigate();
  const { templates, template, isNew } = useTemplateSelection();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 overflow-x-auto border-b border-line px-4 py-3">
        {templates.map((x) => (
          <Link
            key={x.id}
            to={link(`/app/settings/templates/${x.id}`)}
            aria-current={x.id === template?.id ? 'page' : undefined}
            className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${x.id === template?.id ? 'border-brand bg-brand text-on-brand' : 'border-line hover:bg-surface'} ${x.active ? '' : 'opacity-60'}`}
          >
            {x.name[language]}
          </Link>
        ))}
        <Link to={link('/app/settings/templates/new')} className={`flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-dashed px-4 text-sm font-semibold ${isNew ? 'border-brand text-brand-strong' : 'border-line text-muted'}`}>
          <Plus aria-hidden="true" size={16} />
          {t('settings.templates.new')}
        </Link>
      </div>
      {(template || isNew) && (
        <PreviewEditor
          key={template?.id ?? 'new'}
          initial={template ? templateForm(template) : newTemplateForm()}
          onSaved={(id) => navigate(link(`/app/settings/templates/${id}`), { replace: true })}
        />
      )}
    </div>
  );
}

function PreviewEditor({ initial, onSaved }: { initial: TemplateForm; onSaved(id: string): void }) {
  const { t } = useI18n();
  const d = useTemplateDraft(initial, onSaved);
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_400px]">
      <div className="relative min-h-0 overflow-auto p-5">
        <div className="flex flex-col gap-6">
          <Notice saved={d.saved} problem={d.problem} />
          <BasicsRow d={d} />
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-lg font-bold">{t('settings.template.fields')}</h3>
            {d.form.fields.map((row, i) => (
              <FieldInputs key={row.rowId} d={d} i={i} />
            ))}
            <div>
              <Button variant="secondary" onClick={() => d.update(addField)}>
                <Plus aria-hidden="true" size={16} />
                {t('settings.field.add')}
              </Button>
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-lg font-bold">{t('settings.template.stages')}</h3>
            <StagesError d={d} />
            {d.form.stages.map((row, i) => (
              <div key={row.rowId} className="flex gap-3 rounded-xl border border-line p-3">
                <span className={`h-fit rounded-md px-1.5 py-0.5 text-xs font-semibold ${kindTone(row.group)}`}>{i + 1}</span>
                <div className="flex-1">
                  <StageInputs d={d} i={i} pair />
                </div>
              </div>
            ))}
            <div>
              <Button variant="secondary" data-tour="add-stage" onClick={() => d.update(addStage)}>
                <Plus aria-hidden="true" size={16} />
                {t('settings.stage.add')}
              </Button>
            </div>
          </section>
        </div>
      </div>
      <TemplatePreviewPane d={d} />
    </div>
  );
}

function TemplatePreviewPane({ d }: { d: TemplateDraft }) {
  const { t, language, money } = useI18n();
  const tx = useTx();
  const { form } = d;
  const name = (language === 'bn' ? form.nameBn || form.nameEn : form.nameEn || form.nameBn) || '…';
  const label = (r: { labelBn: string; labelEn: string }) => (language === 'bn' ? r.labelBn || r.labelEn : r.labelEn || r.labelBn) || '…';
  const groups = [...new Set(form.fields.map((f) => f.group))];
  return (
    <aside aria-label={tx('দেখতে কেমন হবে', 'How It Will Look')} className="relative flex min-h-0 flex-col gap-4 overflow-auto border-l border-line bg-surface/50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">{tx('দেখতে কেমন হবে', 'How It Will Look')}</h3>
        <div className="flex items-center gap-2">
          {d.dirty && !d.saved && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn-ink">{t('settings.unsaved')}</span>}
          <Button onClick={() => void d.save()} disabled={d.saving}>
            {t('common.save')}
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-panel p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tx('নতুন অর্ডারে', 'In a New Order')}</p>
        <div className="mt-2 flex items-center gap-3">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand-strong">
            <Shirt size={20} />
          </span>
          <span className="flex-1 font-semibold">{name}</span>
          <span className="font-display text-lg font-bold">{form.price === null ? '…' : money(form.price)}</span>
        </div>
        {!form.active && <p className="mt-2 text-sm text-warn-ink">{tx('বন্ধ: নতুন অর্ডারে দেখা যাবে না', 'Off: not offered in new orders')}</p>}
      </div>
      <div className="rounded-xl border border-line bg-panel p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tx('মাপ নেওয়ার সময়', 'When Measuring')}</p>
        {form.fields.length === 0 && <p className="mt-2 text-sm text-muted">{tx('এখনো কোনো মাপ নেই', 'No measurements yet')}</p>}
        {groups.map((g) => (
          <div key={g} className="mt-3">
            <p className="text-sm font-semibold">{groupLabel(g, t)}</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {form.fields
                .filter((f) => f.group === g)
                .map((f) => (
                  <div key={f.rowId} className="rounded-lg border border-line px-2 py-1.5">
                    <span className="block truncate text-xs text-muted">
                      {label(f)}
                      {f.required && <span className="text-danger"> *</span>}
                    </span>
                    <span className="text-sm text-muted">{t(`unit.${f.unit}`)}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-line bg-panel p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tx('কাজের বোর্ডে', 'On the Work Board')}</p>
        <ol className="mt-2 flex flex-col">
          {form.stages.map((s, i) => (
            <li key={s.rowId} className="flex items-center gap-3 py-1">
              <span aria-hidden="true" className={`grid size-6 place-items-center rounded-full text-xs font-bold ${kindTone(s.group)} ${s.optional ? 'border border-dashed border-muted' : ''}`}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm">{label(s)}</span>
              {s.optional && <span className="text-xs text-muted">{tx('বাদ দেওয়া যায়', 'Can skip')}</span>}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ staff */

const AREAS: Array<{ prefix: string; bn: string; en: string }> = [
  { prefix: 'orders.', bn: 'অর্ডার', en: 'Orders' },
  { prefix: 'customers.', bn: 'কাস্টমার', en: 'Customers' },
  { prefix: 'measurements.', bn: 'মাপ', en: 'Measurements' },
  { prefix: 'money.', bn: 'টাকা', en: 'Money' },
  { prefix: 'payments.', bn: 'জমা', en: 'Payments' },
  { prefix: 'work.', bn: 'কাজ', en: 'Work' },
  { prefix: 'settings.', bn: 'সেটিংস', en: 'Settings' },
  { prefix: 'staff.', bn: 'স্টাফ', en: 'Staff' },
];

function useRoleAreas() {
  const tx = useTx();
  const { config } = useSnapshot();
  return (roleId: string) => {
    const caps = config?.roles.find((r) => r.id === roleId)?.capabilities ?? [];
    return AREAS.filter((a) => caps.some((c) => c.startsWith(a.prefix))).map((a) => tx(a.bn, a.en));
  };
}

function useBranchText() {
  const { t, language } = useI18n();
  const { config } = useSnapshot();
  return (staff: Staff) =>
    staff.branchIds === 'all' ? t('branch.all') : staff.branchIds.map((id) => config?.branches.find((b) => b.id === id)?.name[language] ?? id).join(', ');
}

/** Saves one person. Returns field errors, or a whole-form problem. */
function useSaveStaff() {
  const { t, language } = useI18n();
  const store = useStore();
  const { session } = useSnapshot();
  return async (form: StaffForm, staffId: string | null): Promise<{ errors?: Record<string, string>; problem?: string; id?: string }> => {
    const config = store.getSnapshot().config!;
    const result = readStaff(form, { config, staffId, selfId: session?.staffId ?? '', newId: () => store.createId() });
    if (!result.ok) {
      const { self, ...fields } = result.errors;
      return { errors: Object.fromEntries(Object.entries(fields).map(([k, key]) => [k, t(key)])), problem: self ? t(self) : undefined };
    }
    const next = result.staff;
    const outcome = await store.updateConfig((c) => ({ ...c, staff: c.staff.some((s) => s.id === next.id) ? c.staff.map((s) => (s.id === next.id ? next : s)) : [...c.staff, next] }));
    if (!outcome.ok) return { problem: configProblemText(outcome.problems, language) };
    return { id: next.id };
  };
}

/** The person form used by B (in place), C and D (in a drawer). Roles are cards that say what each one can use. */
function StaffEditor({ staff, onDone, onCancel, inline = false }: { staff: Staff | null; onDone(id: string): void; onCancel?: () => void; inline?: boolean }) {
  const { t, language } = useI18n();
  const tx = useTx();
  const { config } = useSnapshot();
  const areas = useRoleAreas();
  const saveStaff = useSaveStaff();
  const [form, setForm] = useState<StaffForm>(() => staffForm(staff, config!));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!config) return null;
  const patch = (c: Partial<StaffForm>) => {
    setSaved(false);
    setForm((f) => ({ ...f, ...c }));
  };
  async function save() {
    setWorking(true);
    const r = await saveStaff(form, staff?.id ?? null);
    setWorking(false);
    setErrors(r.errors ?? {});
    setProblem(r.problem ?? null);
    if (r.id) {
      setSaved(true);
      onDone(r.id);
    }
  }
  const body = (
    <div className="flex flex-col gap-5">
      <Notice saved={inline && saved} problem={problem} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label={t('settings.col.name')} value={form.name} onChange={(e) => patch({ name: e.target.value })} error={errors.name} autoComplete="off" />
        <TextField label={t('pin.label')} value={form.pin} onChange={(e) => patch({ pin: e.target.value })} error={errors.pin} type="password" inputMode="numeric" autoComplete="off" />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{t('settings.staff.role')}</legend>
        <div className={`grid gap-2 ${inline ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-2'}`}>
          {config.roles.map((r) => (
            <label key={r.id} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${form.roleId === r.id ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line hover:bg-surface'}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="role" className="sr-only" checked={form.roleId === r.id} onChange={() => patch({ roleId: r.id })} />
                <span className="font-semibold">{r.name[language]}</span>
              </span>
              <span className="text-xs text-muted">{areas(r.id).join(' · ')}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{tx('কোন শাখায় কাজ করেন', 'Works In')}</legend>
        <div className="flex flex-wrap gap-2">
          {[{ id: 'all', name: t('branch.all') }, ...config.branches.map((b) => ({ id: b.id, name: b.name[language] }))].map((b) => {
            const on = b.id === 'all' ? form.allBranches : !form.allBranches && form.branchIds.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  b.id === 'all'
                    ? patch({ allBranches: !form.allBranches })
                    : patch({ allBranches: false, branchIds: on ? form.branchIds.filter((x) => x !== b.id) : [...form.branchIds, b.id] })
                }
                className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${on ? 'border-brand bg-brand text-on-brand' : 'border-line hover:bg-surface'}`}
              >
                {b.name}
              </button>
            );
          })}
        </div>
        {errors.branches && <p className="text-sm text-danger">{errors.branches}</p>}
      </fieldset>
      <div className="flex items-center gap-3">
        <Switch label={t('settings.staff.active')} on={form.active} onChange={(active) => patch({ active })} />
        <span>{form.active ? t('settings.staff.active') : t('settings.staff.inactive')}</span>
        <span className="text-sm text-muted">{tx('বন্ধ করলেও পুরনো কাজে নাম থাকবে', 'Turning off keeps their name on past work')}</span>
      </div>
    </div>
  );
  if (inline)
    return (
      <div className="flex flex-col gap-5">
        {body}
        <div>
          <Button size="lg" onClick={() => void save()} disabled={working}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    );
  return (
    <Drawer
      title={staff ? staff.name : t('settings.staff.new')}
      onClose={onCancel!}
      footer={
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button size="lg" className="flex-[2]" onClick={() => void save()} disabled={working}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      {body}
    </Drawer>
  );
}

/** B: everyone on the left, the chosen person's form on the right. */
function StaffSplit() {
  const { t, language } = useI18n();
  const { config } = useSnapshot();
  const [selected, setSelected] = useState<string | null>(config?.staff[0]?.id ?? null);
  if (!config) return null;
  const roleName = (id: string) => config.roles.find((r) => r.id === id)?.name[language] ?? id;
  const person = config.staff.find((s) => s.id === selected) ?? null;
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-r border-line">
        <div className="border-b border-line p-3">
          <Button variant={selected === null ? 'primary' : 'secondary'} className="w-full" onClick={() => setSelected(null)}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.staff.new')}
          </Button>
        </div>
        <ul aria-label={t('settings.staff')} className="relative min-h-0 flex-1 overflow-auto p-2">
          {config.staff.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={s.id === selected}
                onClick={() => setSelected(s.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${s.id === selected ? 'bg-brand-soft ring-1 ring-brand' : 'hover:bg-surface'} ${s.active ? '' : 'opacity-60'}`}
              >
                <Avatar id={s.id} name={s.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-xs text-muted">{s.active ? roleName(s.roleId) : t('settings.staff.inactive')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative min-h-0 overflow-auto p-5">
        <div className="mb-5 flex items-center gap-3">
          {person && <Avatar id={person.id} name={person.name} size="lg" />}
          <h2 className="font-display text-xl font-bold">{person ? person.name : t('settings.staff.new')}</h2>
        </div>
        <StaffEditor key={selected ?? 'new'} staff={person} inline onDone={(id) => setSelected(id)} />
      </div>
    </div>
  );
}

/** C: a table where role and on/off change in place; the pencil opens the rest in a drawer. */
function StaffTable() {
  const { t, language } = useI18n();
  const tx = useTx();
  const { config } = useSnapshot();
  const branchText = useBranchText();
  const saveStaff = useSaveStaff();
  const [editing, setEditing] = useState<{ staff: Staff | null } | null>(null);
  const [note, setNote] = useState<{ saved?: boolean; problem?: string | null }>({});
  if (!config) return null;
  const quick = async (s: Staff, change: Partial<StaffForm>) => {
    const r = await saveStaff({ ...staffForm(s, config), ...change }, s.id);
    setNote(r.id ? { saved: true } : { problem: r.problem ?? Object.values(r.errors ?? {})[0] });
  };
  return (
    <>
      <SectionHeader
        path="staff"
        action={
          <Button onClick={() => setEditing({ staff: null })}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.staff.new')}
          </Button>
        }
      />
      <div className={`${SECTION_BODY} flex flex-col gap-3 p-5`}>
        <Notice saved={note.saved} problem={note.problem} />
        <table className="w-full border-collapse text-left">
          <thead className="text-sm text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">{t('settings.col.name')}</th>
              <th className="px-3 py-2 font-medium">{t('settings.staff.role')}</th>
              <th className="px-3 py-2 font-medium">{tx('শাখা', 'Branches')}</th>
              <th className="px-3 py-2 font-medium">{t('settings.staff.active')}</th>
              <th className="px-3 py-2">
                <span className="sr-only">{tx('বদলান', 'Edit')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {config.staff.map((s) => (
              <tr key={s.id} className={`border-b border-line ${s.active ? '' : 'text-muted'}`}>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-3">
                    <Avatar id={s.id} name={s.name} size="sm" />
                    <span className="font-semibold">{s.name}</span>
                  </span>
                </td>
                <td className="px-3 py-2">
                  <select
                    aria-label={`${t('settings.staff.role')}: ${s.name}`}
                    value={s.roleId}
                    onChange={(e) => void quick(s, { roleId: e.target.value })}
                    className="min-h-9 rounded-lg border border-line bg-panel px-2 text-sm"
                  >
                    {config.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name[language]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-sm">{branchText(s)}</td>
                <td className="px-3 py-2">
                  <Switch label={`${t('settings.staff.active')}: ${s.name}`} on={s.active} onChange={(active) => void quick(s, { active })} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="secondary" onClick={() => setEditing({ staff: s })}>
                    {tx('বদলান', 'Edit')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <StaffEditor
          staff={editing.staff}
          onCancel={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            setNote({ saved: true });
          }}
        />
      )}
    </>
  );
}

/** D: people grouped under their role, each role saying what it can use. */
function StaffByRole() {
  const { t, language } = useI18n();
  const tx = useTx();
  const { config } = useSnapshot();
  const areas = useRoleAreas();
  const branchText = useBranchText();
  const [editing, setEditing] = useState<{ staff: Staff | null } | null>(null);
  if (!config) return null;
  return (
    <>
      <SectionHeader
        path="staff"
        action={
          <Button onClick={() => setEditing({ staff: null })}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.staff.new')}
          </Button>
        }
      />
      <div className={`${SECTION_BODY} grid content-start gap-4 p-5 xl:grid-cols-2`}>
        {config.roles.map((r) => {
          const people = config.staff.filter((s) => s.roleId === r.id);
          if (people.length === 0) return null;
          return (
            <section key={r.id} aria-label={r.name[language]} className="flex flex-col gap-3 rounded-xl border border-line p-4">
              <div>
                <h3 className="font-display text-lg font-bold">{r.name[language]}</h3>
                <p className="flex flex-wrap gap-1 pt-1">
                  <span className="text-xs text-muted">{tx('যা দেখতে ও করতে পারেন:', 'Can use:')}</span>
                  {areas(r.id).map((a) => (
                    <span key={a} className="rounded-md bg-surface px-1.5 py-0.5 text-xs">
                      {a}
                    </span>
                  ))}
                </p>
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {people.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setEditing({ staff: s })}
                      aria-label={t('settings.editItem', { name: s.name })}
                      className={`flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2 text-left hover:border-brand hover:bg-brand-soft/30 ${s.active ? '' : 'opacity-60'}`}
                    >
                      <Avatar id={s.id} name={s.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{s.name}</span>
                        <span className="block truncate text-xs text-muted">{s.active ? branchText(s) : t('settings.staff.inactive')}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {editing && <StaffEditor staff={editing.staff} onCancel={() => setEditing(null)} onDone={() => setEditing(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ branches */

function useMoveDevice(setNote: (n: { saved?: boolean; problem?: string | null }) => void) {
  const { language } = useI18n();
  const store = useStore();
  return async (deviceId: string, branchId: string) => {
    const outcome = await store.updateConfig((c) => ({ ...c, devices: c.devices.map((d) => (d.id === deviceId ? { ...d, branchId } : d)) }));
    setNote(outcome.ok ? { saved: true } : { problem: configProblemText(outcome.problems, language) });
  };
}

function BranchEditor({ branch, onDone, onCancel, inline = false }: { branch: Branch | null; onDone(id: string): void; onCancel?: () => void; inline?: boolean }) {
  const { t, language } = useI18n();
  const store = useStore();
  const [nameBn, setNameBn] = useState(branch?.name.bn ?? '');
  const [nameEn, setNameEn] = useState(branch?.name.en ?? '');
  const [kind, setKind] = useState<Branch['kind']>(branch?.kind ?? 'shop');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [error, setError] = useState<string | undefined>();
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  async function save() {
    const bn = nameBn.trim();
    const en = nameEn.trim();
    if (!bn && !en) {
      setError(t('settings.branch.error.name'));
      return;
    }
    setError(undefined);
    const name = { bn: bn || en, en: en || bn };
    setWorking(true);
    let id = branch?.id ?? '';
    const outcome = await store.updateConfig((c) => {
      id = branch?.id ?? slugKey(name.en, c.branches.map((b) => b.id), `branch-${c.branches.length + 1}`);
      const next: Branch = { id, name, kind, address: address.trim() };
      return { ...c, branches: c.branches.some((b) => b.id === id) ? c.branches.map((b) => (b.id === id ? next : b)) : [...c.branches, next] };
    });
    setWorking(false);
    if (!outcome.ok) {
      setProblem(configProblemText(outcome.problems, language));
      return;
    }
    onDone(id);
  }
  const body = (
    <div className="flex flex-col gap-4">
      <Notice problem={problem} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label={t('settings.nameBn')} value={nameBn} onChange={(e) => setNameBn(e.target.value)} error={error} autoComplete="off" />
        <TextField label={t('settings.nameEn')} value={nameEn} onChange={(e) => setNameEn(e.target.value)} autoComplete="off" />
      </div>
      <fieldset>
        <legend className="mb-2 font-medium">{t('settings.branch.kind')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['shop', 'workshop'] as const).map((k) => {
            const Icon = k === 'shop' ? Store : Building2;
            return (
              <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${kind === k ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-line hover:bg-surface'}`}>
                <input type="radio" name="branch-kind" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                <Icon aria-hidden="true" size={20} />
                <span className="font-semibold">{t(`branchKind.${k}`)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <TextField label={t('settings.shop.address')} value={address} onChange={(e) => setAddress(e.target.value)} />
    </div>
  );
  if (inline)
    return (
      <div className="flex flex-col gap-4">
        {body}
        <div>
          <Button onClick={() => void save()} disabled={working}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    );
  return (
    <Drawer
      title={branch ? branch.name[language] : t('settings.branches.new')}
      onClose={onCancel!}
      footer={
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button size="lg" className="flex-[2]" onClick={() => void save()} disabled={working}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      {body}
    </Drawer>
  );
}

function worksIn(s: Staff, branchId: string) {
  return s.branchIds === 'all' || s.branchIds.includes(branchId);
}

/** B: branches on the left; the chosen one's details, devices and people on the right. */
function BranchesSplit() {
  const { t, language, number } = useI18n();
  const tx = useTx();
  const { config } = useSnapshot();
  const [selected, setSelected] = useState<string | null>(config?.branches[0]?.id ?? null);
  const [note, setNote] = useState<{ saved?: boolean; problem?: string | null }>({});
  const move = useMoveDevice(setNote);
  if (!config) return null;
  const branch = config.branches.find((b) => b.id === selected) ?? null;
  const devices = branch ? config.devices.filter((d) => d.branchId === branch.id) : [];
  const people = branch ? config.staff.filter((s) => s.active && worksIn(s, branch.id)) : [];
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-r border-line">
        <div className="border-b border-line p-3">
          <Button variant={selected === null ? 'primary' : 'secondary'} className="w-full" onClick={() => setSelected(null)}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.branches.new')}
          </Button>
        </div>
        <ul aria-label={t('settings.branches.list')} className="relative min-h-0 flex-1 overflow-auto p-2">
          {config.branches.map((b) => {
            const Icon = b.kind === 'shop' ? Store : Building2;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  aria-pressed={b.id === selected}
                  onClick={() => setSelected(b.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${b.id === selected ? 'bg-brand-soft ring-1 ring-brand' : 'hover:bg-surface'}`}
                >
                  <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-surface text-muted">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{b.name[language]}</span>
                    <span className="block truncate text-xs text-muted">
                      {t(`branchKind.${b.kind}`)} · {t('settings.device.count', { n: number(config.devices.filter((d) => d.branchId === b.id).length) })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="relative min-h-0 overflow-auto p-5">
        <div className="flex max-w-3xl flex-col gap-6">
          <h2 className="font-display text-xl font-bold">{branch ? branch.name[language] : t('settings.branches.new')}</h2>
          <Notice saved={note.saved} problem={note.problem} />
          <BranchEditor key={selected ?? 'new'} branch={branch} inline onDone={(id) => (setSelected(id), setNote({ saved: true }))} />
          {branch && (
            <>
              <section className="flex flex-col gap-2">
                <h3 className="font-display text-lg font-bold">{t('settings.devices.list')}</h3>
                {devices.length === 0 && <p className="text-sm text-muted">{t('settings.devices.none')}</p>}
                {devices.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                    <MonitorSmartphone aria-hidden="true" size={18} className="text-muted" />
                    <span className="flex-1 font-semibold">{d.name}</span>
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs">
                      {t('settings.device.series')} {d.series}
                    </span>
                    <select
                      aria-label={t('settings.device.branch', { name: d.name })}
                      value={d.branchId}
                      onChange={(e) => void move(d.id, e.target.value)}
                      className="min-h-9 rounded-lg border border-line bg-panel px-2 text-sm"
                    >
                      {config.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {tx('সরান: ', 'Move to: ')}
                          {b.name[language]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <p className="text-sm text-muted">{t('settings.devices.note')}</p>
              </section>
              <section className="flex flex-col gap-2">
                <h3 className="font-display text-lg font-bold">{tx('এখানে যাঁরা কাজ করেন', 'Who Works Here')}</h3>
                <ul className="flex flex-wrap gap-2">
                  {people.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3">
                      <Avatar id={s.id} name={s.name} size="sm" />
                      <span className="text-sm">{s.name}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted">{tx('কে কোথায় কাজ করেন, তা স্টাফ সেটিংসে বদলান', 'Change who works where in Staff')}</p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** C: one column per branch, its devices as cards, its people at the foot. */
function BranchesBoard() {
  const { t, language } = useI18n();
  const tx = useTx();
  const { config } = useSnapshot();
  const [editing, setEditing] = useState<{ branch: Branch | null } | null>(null);
  const [note, setNote] = useState<{ saved?: boolean; problem?: string | null }>({});
  const move = useMoveDevice(setNote);
  if (!config) return null;
  return (
    <>
      <SectionHeader
        path="branches"
        action={
          <Button onClick={() => setEditing({ branch: null })}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.branches.new')}
          </Button>
        }
      />
      <div className={`${SECTION_BODY} flex flex-col gap-3 p-5`}>
        <Notice saved={note.saved} problem={note.problem} />
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto">
          {config.branches.map((b) => {
            const Icon = b.kind === 'shop' ? Store : Building2;
            const devices = config.devices.filter((d) => d.branchId === b.id);
            const people = config.staff.filter((s) => s.active && worksIn(s, b.id));
            return (
              <section key={b.id} aria-label={b.name[language]} className="flex w-80 shrink-0 flex-col gap-3 rounded-2xl bg-surface/70 p-3">
                <div className="flex items-center gap-2">
                  <Icon aria-hidden="true" size={20} className="text-muted" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg font-bold">{b.name[language]}</h3>
                    <p className="truncate text-xs text-muted">{[t(`branchKind.${b.kind}`), b.address].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setEditing({ branch: b })}>
                    {tx('বদলান', 'Edit')}
                  </Button>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('settings.devices.list')}</p>
                {devices.length === 0 && <p className="rounded-lg border border-dashed border-line p-3 text-center text-sm text-muted">{t('settings.devices.none')}</p>}
                {devices.map((d) => (
                  <div key={d.id} className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <MonitorSmartphone aria-hidden="true" size={18} className="text-muted" />
                      <span className="flex-1 font-semibold">{d.name}</span>
                      <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs">
                        {t('settings.device.series')} {d.series}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {config.branches
                        .filter((x) => x.id !== b.id)
                        .map((x) => (
                          <Button key={x.id} variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => void move(d.id, x.id)}>
                            {tx(`${x.name.bn}-এ সরান`, `Move to ${x.name.en}`)}
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}
                <p className="mt-auto text-xs font-semibold uppercase tracking-wide text-muted">{tx('কাজ করেন', 'Works Here')}</p>
                <div className="flex -space-x-2">
                  {people.map((s) => (
                    <span key={s.id} title={s.name} className="rounded-full ring-2 ring-surface">
                      <Avatar id={s.id} name={s.name} size="sm" />
                    </span>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <p className="text-sm text-muted">{t('settings.branches.note')}</p>
      </div>
      {editing && <BranchEditor branch={editing.branch} onCancel={() => setEditing(null)} onDone={() => (setEditing(null), setNote({ saved: true }))} />}
    </>
  );
}

/** D: a grid of who and what is where. Devices pick one branch; people tick any. */
function BranchesMatrix() {
  const { t, language } = useI18n();
  const tx = useTx();
  const { config } = useSnapshot();
  const saveStaff = useSaveStaff();
  const [editing, setEditing] = useState<{ branch: Branch | null } | null>(null);
  const [note, setNote] = useState<{ saved?: boolean; problem?: string | null }>({});
  const move = useMoveDevice(setNote);
  if (!config) return null;
  const toggle = async (s: Staff, branchId: string | 'all') => {
    const form = staffForm(s, config);
    const all = config.branches.map((b) => b.id);
    const change: Partial<StaffForm> =
      branchId === 'all'
        ? { allBranches: !form.allBranches, branchIds: form.allBranches ? all : form.branchIds }
        : { allBranches: false, branchIds: worksIn(s, branchId) ? (s.branchIds === 'all' ? all : s.branchIds).filter((x) => x !== branchId) : [...form.branchIds, branchId] };
    const r = await saveStaff({ ...form, ...change }, s.id);
    setNote(r.id ? { saved: true } : { problem: r.problem ?? Object.values(r.errors ?? {})[0] });
  };
  const head = 'px-3 py-2 text-center font-medium';
  return (
    <>
      <SectionHeader
        path="branches"
        action={
          <Button onClick={() => setEditing({ branch: null })}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.branches.new')}
          </Button>
        }
      />
      <div className={`${SECTION_BODY} flex flex-col gap-3 p-5`}>
        <Notice saved={note.saved} problem={note.problem} />
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th className="px-3 py-2 text-left font-medium text-muted">{tx('কে / কী', 'Who / What')}</th>
              {config.branches.map((b) => (
                <th key={b.id} className={head}>
                  <button type="button" onClick={() => setEditing({ branch: b })} className="rounded-lg px-2 py-1 hover:bg-surface">
                    <span className="block font-display font-bold">{b.name[language]}</span>
                    <span className="block text-xs text-muted">{t(`branchKind.${b.kind}`)}</span>
                  </button>
                </th>
              ))}
              <th className={`${head} text-muted`}>{t('branch.all')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th colSpan={config.branches.length + 2} className="bg-surface/60 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                {t('settings.devices.list')}
              </th>
            </tr>
            {config.devices.map((d) => (
              <tr key={d.id} className="border-b border-line">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <MonitorSmartphone aria-hidden="true" size={16} className="text-muted" />
                    <span className="font-semibold">{d.name}</span>
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs">{d.series}</span>
                  </span>
                </td>
                {config.branches.map((b) => (
                  <td key={b.id} className="px-3 py-2 text-center">
                    <input
                      type="radio"
                      name={`device-${d.id}`}
                      aria-label={`${d.name}: ${b.name[language]}`}
                      checked={d.branchId === b.id}
                      onChange={() => void move(d.id, b.id)}
                      className="size-5 accent-[var(--color-brand)]"
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
            <tr>
              <th colSpan={config.branches.length + 2} className="bg-surface/60 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                {t('settings.staff')}
              </th>
            </tr>
            {config.staff
              .filter((s) => s.active)
              .map((s) => (
                <tr key={s.id} className="border-b border-line">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <Avatar id={s.id} name={s.name} size="sm" />
                      <span className="font-semibold">{s.name}</span>
                    </span>
                  </td>
                  {config.branches.map((b) => (
                    <td key={b.id} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${s.name}: ${b.name[language]}`}
                        checked={worksIn(s, b.id)}
                        disabled={s.branchIds === 'all'}
                        onChange={() => void toggle(s, b.id)}
                        className="size-5 accent-[var(--color-brand)] disabled:opacity-40"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${s.name}: ${t('branch.all')}`}
                      checked={s.branchIds === 'all'}
                      onChange={() => void toggle(s, 'all')}
                      className="size-5 accent-[var(--color-brand)]"
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="text-sm text-muted">{t('settings.devices.note')}</p>
        <p className="text-sm text-muted">{tx('শাখার নামে চাপ দিয়ে নাম, ধরন বা ঠিকানা বদলান', 'Click a branch name to change its name, kind or address')}</p>
      </div>
      {editing && <BranchEditor branch={editing.branch} onCancel={() => setEditing(null)} onDone={() => (setEditing(null), setNote({ saved: true }))} />}
    </>
  );
}

/* ------------------------------------------------------------------ route wrappers */

function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PrototypeSwitcher variants={VARIANTS} />
    </>
  );
}

export function TemplatesProto() {
  const v = useVariant(KEYS);
  return <Frame>{v === 'B' ? <TemplatesSplit /> : v === 'C' ? <TemplatesTable /> : v === 'D' ? <TemplatesPreview /> : <TemplatesSettings />}</Frame>;
}

export function TemplateEditorProto() {
  const v = useVariant(KEYS);
  return <Frame>{v === 'B' ? <TemplatesSplit /> : v === 'C' ? <TemplatesTable /> : v === 'D' ? <TemplatesPreview /> : <TemplateEditor />}</Frame>;
}

export function StaffProto() {
  const v = useVariant(KEYS);
  return <Frame>{v === 'B' ? <StaffSplit /> : v === 'C' ? <StaffTable /> : v === 'D' ? <StaffByRole /> : <StaffSettings />}</Frame>;
}

export function BranchesProto() {
  const v = useVariant(KEYS);
  return <Frame>{v === 'B' ? <BranchesSplit /> : v === 'C' ? <BranchesBoard /> : v === 'D' ? <BranchesMatrix /> : <BranchSettings />}</Frame>;
}
