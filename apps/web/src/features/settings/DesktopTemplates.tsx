import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, buttonClasses } from '../../ui/Button';
import { Drawer } from '../../ui/Drawer';
import { NumberField } from '../../ui/NumberField';
import { rovingTabsKeyDown } from '../../ui/rovingTabs';
import { Switch } from '../../ui/Switch';
import { TextField } from '../../ui/TextField';
import { groupLabel } from '../customers/measurementView';
import { SECTION_BODY, SectionHeader, StagePath, StatusPill } from './SettingsCards';
import {
  FIELD_GROUPS,
  addField,
  addStageTo,
  groupNeighbour,
  moveInGroup,
  newTemplateForm,
  removeRow,
  setStageGroup,
  templateForm,
  type FieldRow,
  type StageRow,
  type TemplateErrors,
  type TemplateForm,
} from './templateInput';
import { TEMPLATES_PATH, useTemplateDraft, type TemplateDraft } from './useTemplateDraft';

const STAGE_KINDS = ['unfinished', 'ready', 'delivered'] as const;
const TABS = ['basics', 'fields', 'stages'] as const;
type Tab = (typeof TABS)[number];

const control =
  'min-h-10 w-full min-w-0 rounded-lg border border-line bg-panel px-2 py-1 text-base focus-visible:outline-2 focus-visible:outline-focus aria-[invalid=true]:border-danger';
const kindTone = (g: StageRow['group']) => (g === 'delivered' ? 'bg-ok-soft text-ok' : g === 'ready' ? 'bg-brand-soft text-brand-strong' : 'bg-surface');

/** Which tab holds each problem, so a failed save can open the first one. */
function tabOf(path: string): Tab {
  if (path.startsWith('fields.')) return 'fields';
  if (path.startsWith('stages')) return 'stages';
  return 'basics';
}

/**
 * The desktop garment list: a table of every garment. Opening one (or New Garment) slides its editor in
 * from the right, over the table, at the garment's own address.
 */
export function DesktopTemplates() {
  const { t, language, money, number } = useI18n();
  const { config } = useSnapshot();
  const { templateId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  if (!config) return null;
  const isNew = location.pathname === `${TEMPLATES_PATH}/new`;
  const open = templateId === undefined ? null : config.templates.find((x) => x.id === templateId);
  if (open === undefined) return <Navigate to={TEMPLATES_PATH} replace />;
  const saved = (location.state as { saved?: boolean } | null)?.saved === true;
  const close = () => navigate(TEMPLATES_PATH);

  return (
    <>
      <SectionHeader
        path="templates"
        action={
          <Link to={`${TEMPLATES_PATH}/new`} className={buttonClasses('primary')}>
            <Plus aria-hidden="true" size={18} />
            {t('settings.templates.new')}
          </Link>
        }
      />
      <div className={`${SECTION_BODY} flex flex-col gap-3 p-5`}>
        {saved && (
          <p role="status" className="text-brand-strong">
            {t('settings.saved')}
          </p>
        )}
        <table aria-label={t('settings.templates.list')} className="w-full border-collapse text-left">
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
            {config.templates.map((x) => (
              <tr key={x.id} className={`relative border-b border-line hover:bg-surface ${x.active ? '' : 'text-muted'}`}>
                <td className="px-3 py-3 font-semibold">
                  {/* The name is the link; its ::after covers the row, so the whole row opens the editor. */}
                  <Link
                    to={`${TEMPLATES_PATH}/${x.id}`}
                    className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus"
                  >
                    {x.name[language]}
                  </Link>
                </td>
                <td className="px-3 py-3 text-right font-display font-bold">{money(x.defaultPrice)}</td>
                <td className="px-3 py-3 text-right">{number(x.fields.length)}</td>
                <td className="px-3 py-3">
                  <StagePath template={x} />
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
        <TemplateDrawer
          key={open?.id ?? 'new'}
          initial={open ? templateForm(open) : newTemplateForm()}
          title={open ? t('settings.template.editTitle', { name: open.name[language] }) : t('settings.templates.new')}
          onClose={close}
        />
      )}
    </>
  );
}

function TemplateDrawer({ initial, title, onClose }: { initial: TemplateForm; title: string; onClose(): void }) {
  const { t, number } = useI18n();
  const d = useTemplateDraft(initial);
  const [tab, setTab] = useState<Tab>('basics');
  const base = useId();
  const tabId = (key: Tab) => `${base}-${key}`;
  const panelId = `${base}-panel`;
  const flagged = new Set(Object.keys(d.errors).map(tabOf));
  const labels: Record<Tab, string> = {
    basics: t('settings.template.basics'),
    fields: `${t('settings.template.fields')} (${number(d.form.fields.length)})`,
    stages: `${t('settings.template.stages')} (${number(d.form.stages.length)})`,
  };

  async function save() {
    const errors: TemplateErrors | null = await d.save();
    const first = errors && Object.keys(errors)[0];
    if (first) setTab(tabOf(first));
  }

  return (
    <Drawer
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="lg" className="flex-[2]" onClick={() => void save()} disabled={d.saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div
        role="tablist"
        aria-label={title}
        onKeyDown={rovingTabsKeyDown(TABS, tab, setTab, tabId)}
        className="mb-5 flex gap-1 rounded-xl bg-surface p-1"
      >
        {TABS.map((key) => (
          <button
            key={key}
            id={tabId(key)}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={panelId}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            // The tour points at the Stages tab until it is open, then at the Add Stage button inside it.
            data-tour={key === 'stages' && tab !== 'stages' ? 'add-stage' : undefined}
            className={`relative min-h-10 flex-1 rounded-lg px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-focus ${
              tab === key ? 'bg-panel shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {labels[key]}
            {flagged.has(key) && <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full bg-danger" />}
          </button>
        ))}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(tab)} className="flex flex-col gap-4">
        {d.problem && (
          <p role="alert" className="text-danger">
            {d.problem}
          </p>
        )}
        {tab === 'basics' && <Basics d={d} />}
        {tab === 'fields' && <Fields d={d} />}
        {tab === 'stages' && <Stages d={d} />}
      </div>
      {d.dialog}
    </Drawer>
  );
}

function Basics({ d }: { d: TemplateDraft }) {
  const { t } = useI18n();
  const { form, update, err } = d;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t('settings.nameBn')}
          value={form.nameBn}
          onChange={(e) => update((f) => ({ ...f, nameBn: e.target.value }))}
          error={err('nameBn')}
          autoComplete="off"
        />
        <TextField label={t('settings.nameEn')} value={form.nameEn} onChange={(e) => update((f) => ({ ...f, nameEn: e.target.value }))} autoComplete="off" />
      </div>
      <NumberField
        label={t('receipt.price')}
        kind="money"
        initialValue={form.price}
        onValueChange={(price) => update((f) => ({ ...f, price }))}
        error={err('price')}
        className="max-w-60"
      />
      <div className="flex items-center gap-3">
        <Switch label={t('settings.template.active')} on={form.active} onChange={(active) => update((f) => ({ ...f, active }))} />
        <span aria-hidden="true">{t('settings.template.active')}</span>
      </div>
    </div>
  );
}

function MoveButtons({ d, list, i, n, removable }: { d: TemplateDraft; list: 'fields' | 'stages'; i: number; n: string; removable: boolean }) {
  const { t } = useI18n();
  const kind = list === 'fields' ? 'field' : 'stage';
  const small = '!min-h-9 !px-2';
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        variant="ghost"
        className={small}
        disabled={groupNeighbour(d.form, list, i, -1) < 0}
        aria-label={t(`settings.${kind}.up`, { n })}
        onClick={() => d.update((f) => moveInGroup(f, list, i, -1))}
      >
        <ArrowUp aria-hidden="true" size={16} />
      </Button>
      <Button
        variant="ghost"
        className={small}
        disabled={groupNeighbour(d.form, list, i, 1) < 0}
        aria-label={t(`settings.${kind}.down`, { n })}
        onClick={() => d.update((f) => moveInGroup(f, list, i, 1))}
      >
        <ArrowDown aria-hidden="true" size={16} />
      </Button>
      {removable && (
        <Button variant="ghost" className={`${small} text-danger`} aria-label={t(`settings.${kind}.remove`, { n })} onClick={() => d.update((f) => removeRow(f, list, i))}>
          <Trash2 aria-hidden="true" size={16} />
        </Button>
      )}
    </div>
  );
}

/** A checkbox whose visible text is short; its full name says which row it belongs to. */
function RowCheck({ label, text, checked, onChange }: { label: string; text: string; checked: boolean; onChange(on: boolean): void }) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm">
      <input type="checkbox" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-brand" />
      <span aria-hidden="true">{text}</span>
    </label>
  );
}

/** The measurement fields under their group headings, each in a small card. */
function Fields({ d }: { d: TemplateDraft }) {
  const { t, number } = useI18n();
  const { form, patchField, err } = d;
  const groups = [...new Set(form.fields.map((f) => f.group))];
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g} aria-label={groupLabel(g, t)} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{groupLabel(g, t)}</h3>
          {form.fields.map((row, i) => {
            if (row.group !== g) return null;
            const n = number(i + 1);
            const labelError = err(`fields.${i}.label`);
            return (
              <div key={row.rowId} className="flex flex-col gap-2 rounded-xl border border-line p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    aria-label={t('settings.field.labelBn', { n })}
                    value={row.labelBn}
                    onChange={(e) => patchField(i, { labelBn: e.target.value })}
                    aria-invalid={labelError ? true : undefined}
                    className={control}
                    autoComplete="off"
                  />
                  <input
                    aria-label={t('settings.field.labelEn', { n })}
                    value={row.labelEn}
                    onChange={(e) => patchField(i, { labelEn: e.target.value })}
                    className={control}
                    autoComplete="off"
                  />
                </div>
                {labelError && <p className="text-sm text-danger">{labelError}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={t('settings.field.group', { n })}
                    value={row.group}
                    onChange={(e) => patchField(i, { group: e.target.value })}
                    className={`${control} !w-36`}
                  >
                    {[...new Set([...FIELD_GROUPS, row.group])].map((x) => (
                      <option key={x} value={x}>
                        {groupLabel(x, t)}
                      </option>
                    ))}
                  </select>
                  <UnitToggle value={row.unit} onChange={(unit) => patchField(i, { unit })} label={t('settings.field.unit', { n })} />
                  <RowCheck
                    label={t('settings.field.required', { n })}
                    text={t('settings.field.requiredShort')}
                    checked={row.required}
                    onChange={(required) => patchField(i, { required })}
                  />
                  <span className="flex-1" />
                  <MoveButtons d={d} list="fields" i={i} n={n} removable={!row.saved} />
                </div>
              </div>
            );
          })}
        </section>
      ))}
      <div>
        <Button variant="secondary" onClick={() => d.update(addField)}>
          <Plus aria-hidden="true" size={16} />
          {t('settings.field.add')}
        </Button>
      </div>
      <p className="text-sm text-muted">{t('settings.template.fieldsNote')}</p>
    </div>
  );
}

function UnitToggle({ value, onChange, label }: { value: FieldRow['unit']; onChange(u: FieldRow['unit']): void; label: string }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-lg border border-line p-0.5">
      {(['inch', 'cm'] as const).map((u) => (
        <button
          key={u}
          type="button"
          role="radio"
          aria-checked={value === u}
          onClick={() => onChange(u)}
          className={`min-h-8 rounded-md px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-focus ${value === u ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surface'}`}
        >
          {t(`unit.${u}`)}
        </button>
      ))}
    </div>
  );
}

/**
 * Stages in three boxes: in progress, ready, delivered. A stage's box is its kind, so the kinds always
 * read in the order tracking needs; changing a stage's kind moves it to the end of the other box.
 */
function Stages({ d }: { d: TemplateDraft }) {
  const { t, number } = useI18n();
  const { form, patchStage, err } = d;
  return (
    <div className="flex flex-col gap-4">
      {d.errors.stages && (
        <p role="alert" className="text-danger">
          {t(d.errors.stages)}
        </p>
      )}
      {STAGE_KINDS.map((g) => {
        const rows = form.stages.map((row, i) => ({ row, i })).filter((x) => x.row.group === g);
        const headingId = `stage-band-${g}`;
        return (
          <section key={g} aria-labelledby={headingId} className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <div className="flex items-center gap-2">
              <h3 id={headingId} className={`rounded-md px-2 py-0.5 text-sm font-semibold ${kindTone(g)}`}>
                {t(`stageGroup.${g}`)}
              </h3>
              <span className="min-w-0 flex-1 truncate text-sm text-muted">{t(`settings.stageBand.${g}`)}</span>
              {!(g === 'delivered' && rows.length > 0) && (
                <Button variant="ghost" data-tour={g === 'unfinished' ? 'add-stage' : undefined} onClick={() => d.update((f) => addStageTo(f, g))}>
                  <Plus aria-hidden="true" size={16} />
                  {t('settings.stage.addTo', { kind: t(`stageGroup.${g}`) })}
                </Button>
              )}
            </div>
            {rows.map(({ row, i }) => {
              const n = number(i + 1);
              const labelError = err(`stages.${i}.label`);
              return (
                <div key={row.rowId} className={`flex flex-col gap-2 rounded-lg p-3 ${row.optional ? 'border border-dashed border-line' : 'bg-surface/60'}`}>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      aria-label={t('settings.stage.labelBn', { n })}
                      value={row.labelBn}
                      onChange={(e) => patchStage(i, { labelBn: e.target.value })}
                      aria-invalid={labelError ? true : undefined}
                      className={control}
                      autoComplete="off"
                    />
                    <input
                      aria-label={t('settings.stage.labelEn', { n })}
                      value={row.labelEn}
                      onChange={(e) => patchStage(i, { labelEn: e.target.value })}
                      className={control}
                      autoComplete="off"
                    />
                  </div>
                  {labelError && <p className="text-sm text-danger">{labelError}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={t('settings.stage.group', { n })}
                      value={row.group}
                      onChange={(e) => d.update((f) => setStageGroup(f, i, e.target.value as StageRow['group']))}
                      className={`${control} !w-auto`}
                    >
                      {STAGE_KINDS.map((x) => (
                        <option key={x} value={x}>
                          {t(`stageGroup.${x}`)}
                        </option>
                      ))}
                    </select>
                    <RowCheck
                      label={t('settings.stage.optional', { n })}
                      text={t('settings.stage.optionalShort')}
                      checked={row.optional}
                      onChange={(optional) => patchStage(i, { optional })}
                    />
                    <span className="flex-1" />
                    <MoveButtons d={d} list="stages" i={i} n={n} removable />
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
      <p className="text-sm text-muted">{t('settings.template.stagesNote')}</p>
    </div>
  );
}
