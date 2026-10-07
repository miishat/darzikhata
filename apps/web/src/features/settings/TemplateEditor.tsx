import type { FormEvent } from 'react';
import { Navigate, useParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import type { MessageKey } from '../../i18n/bn';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { NumberField } from '../../ui/NumberField';
import { TextField } from '../../ui/TextField';
import { groupLabel } from '../customers/measurementView';
import { DesktopTemplates } from './DesktopTemplates';
import { SECTION_BODY } from './SettingsCards';
import {
  FIELD_GROUPS,
  addField,
  addStage,
  moveRow,
  newTemplateForm,
  removeRow,
  templateForm,
  type FieldRow,
  type StageRow,
  type TemplateForm,
} from './templateInput';
import { TEMPLATES_PATH, useTemplateDraft } from './useTemplateDraft';

const cell = 'px-2 py-2 align-top';
const control =
  'min-h-10 w-full min-w-28 rounded-lg border border-line bg-panel px-2 py-1 text-base focus-visible:outline-2 focus-visible:outline-focus';

/** Loads the template named in the address, or starts a new one, and shows the editor. */
export function TemplateEditor() {
  const { templateId } = useParams();
  const { config } = useSnapshot();
  const { kind } = useShell();
  if (!config) return null;
  if (kind === 'desktop') return <DesktopTemplates />;
  if (templateId === undefined) return <EditorForm initial={newTemplateForm()} isNew />;
  const template = config.templates.find((t) => t.id === templateId);
  if (!template) return <Navigate to={TEMPLATES_PATH} replace />;
  return <EditorForm key={template.id} initial={templateForm(template)} isNew={false} />;
}

function EditorForm({ initial, isNew }: { initial: TemplateForm; isNew: boolean }) {
  const { t, number } = useI18n();
  const { form, update, patchField, patchStage, err, errors, problem, saving, save, dialog } = useTemplateDraft(initial);

  function submit(e: FormEvent) {
    e.preventDefault();
    void save();
  }

  const groupOptions = (current: string) => [...new Set([...FIELD_GROUPS, current])];
  const stageKinds = ['unfinished', 'ready', 'delivered'] as const;

  const rowButtons = (
    list: 'fields' | 'stages',
    i: number,
    count: number,
    keys: { up: MessageKey; down: MessageKey; remove: MessageKey },
    n: string,
    canRemove: boolean,
  ) => (
    <div className="flex gap-1">
      <Button
        variant="secondary"
        disabled={i === 0}
        aria-label={t(keys.up, { n })}
        onClick={() => update((f) => moveRow(f, list, i, -1))}
      >
        {'↑'}
      </Button>
      <Button
        variant="secondary"
        disabled={i === count - 1}
        aria-label={t(keys.down, { n })}
        onClick={() => update((f) => moveRow(f, list, i, 1))}
      >
        {'↓'}
      </Button>
      {canRemove && (
        <Button
          variant="danger"
          aria-label={t(keys.remove, { n })}
          onClick={() => update((f) => removeRow(f, list, i))}
        >
          {'✕'}
        </Button>
      )}
    </div>
  );

  return (
    <div className={`${SECTION_BODY} p-4 sm:p-5`}>
      <form onSubmit={submit} noValidate className="flex max-w-5xl flex-col gap-4">
        <h2 className="text-lg font-semibold">
          {isNew ? t('settings.templates.new') : t('settings.template.editTitle', { name: initial.nameBn || initial.nameEn })}
        </h2>
        <div className="grid max-w-xl gap-4">
          <TextField
            label={t('settings.nameBn')}
            value={form.nameBn}
            onChange={(e) => update((f) => ({ ...f, nameBn: e.target.value }))}
            error={err('nameBn')}
            autoComplete="off"
          />
          <TextField
            label={t('settings.nameEn')}
            value={form.nameEn}
            onChange={(e) => update((f) => ({ ...f, nameEn: e.target.value }))}
            autoComplete="off"
          />
          <NumberField
            label={t('receipt.price')}
            kind="money"
            initialValue={initial.price}
            onValueChange={(price) => update((f) => ({ ...f, price }))}
            error={err('price')}
          />
          <Checkbox label={t('settings.template.active')} checked={form.active} onChange={(active) => update((f) => ({ ...f, active }))} />
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">{t('settings.template.fields')}</h3>
          <div className="overflow-x-auto rounded-xl border border-line bg-panel">
            <table aria-label={t('settings.template.fields')} className="w-full border-collapse">
              <tbody>
                {form.fields.map((row, i) => {
                  const n = number(i + 1);
                  const labelError = err(`fields.${i}.label`);
                  return (
                    <tr key={row.rowId} className="border-b border-line last:border-b-0">
                      <td className={cell}>
                        <input
                          aria-label={t('settings.field.labelBn', { n })}
                          value={row.labelBn}
                          onChange={(e) => patchField(i, { labelBn: e.target.value })}
                          aria-invalid={labelError ? true : undefined}
                          className={control}
                          autoComplete="off"
                        />
                        {labelError && <p className="text-sm text-danger">{labelError}</p>}
                      </td>
                      <td className={cell}>
                        <input
                          aria-label={t('settings.field.labelEn', { n })}
                          value={row.labelEn}
                          onChange={(e) => patchField(i, { labelEn: e.target.value })}
                          className={control}
                          autoComplete="off"
                        />
                      </td>
                      <td className={cell}>
                        <select
                          aria-label={t('settings.field.unit', { n })}
                          value={row.unit}
                          onChange={(e) => patchField(i, { unit: e.target.value as FieldRow['unit'] })}
                          className={control}
                        >
                          <option value="inch">{t('unit.inch')}</option>
                          <option value="cm">{t('unit.cm')}</option>
                        </select>
                      </td>
                      <td className={cell}>
                        <select
                          aria-label={t('settings.field.group', { n })}
                          value={row.group}
                          onChange={(e) => patchField(i, { group: e.target.value })}
                          className={control}
                        >
                          {groupOptions(row.group).map((g) => (
                            <option key={g} value={g}>
                              {groupLabel(g, t)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={cell}>
                        <Checkbox
                          label={t('settings.field.required', { n })}
                          checked={row.required}
                          onChange={(required) => patchField(i, { required })}
                        />
                      </td>
                      <td className={`${cell} whitespace-nowrap`}>
                        {rowButtons(
                          'fields',
                          i,
                          form.fields.length,
                          { up: 'settings.field.up', down: 'settings.field.down', remove: 'settings.field.remove' },
                          n,
                          !row.saved,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div>
            <Button variant="secondary" onClick={() => update(addField)}>
              {t('settings.field.add')}
            </Button>
          </div>
          <p className="text-sm text-muted">{t('settings.template.fieldsNote')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">{t('settings.template.stages')}</h3>
          <div className="overflow-x-auto rounded-xl border border-line bg-panel">
            <table aria-label={t('settings.template.stages')} className="w-full border-collapse">
              <tbody>
                {form.stages.map((row, i) => {
                  const n = number(i + 1);
                  const labelError = err(`stages.${i}.label`);
                  return (
                    <tr key={row.rowId} className="border-b border-line last:border-b-0">
                      <td className={cell}>
                        <input
                          aria-label={t('settings.stage.labelBn', { n })}
                          value={row.labelBn}
                          onChange={(e) => patchStage(i, { labelBn: e.target.value })}
                          aria-invalid={labelError ? true : undefined}
                          className={control}
                          autoComplete="off"
                        />
                        {labelError && <p className="text-sm text-danger">{labelError}</p>}
                      </td>
                      <td className={cell}>
                        <input
                          aria-label={t('settings.stage.labelEn', { n })}
                          value={row.labelEn}
                          onChange={(e) => patchStage(i, { labelEn: e.target.value })}
                          className={control}
                          autoComplete="off"
                        />
                      </td>
                      <td className={cell}>
                        <select
                          aria-label={t('settings.stage.group', { n })}
                          value={row.group}
                          onChange={(e) => patchStage(i, { group: e.target.value as StageRow['group'] })}
                          className={control}
                        >
                          {stageKinds.map((g) => (
                            <option key={g} value={g}>
                              {t(`stageGroup.${g}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={cell}>
                        <Checkbox
                          label={t('settings.stage.optional', { n })}
                          checked={row.optional}
                          onChange={(optional) => patchStage(i, { optional })}
                        />
                      </td>
                      <td className={`${cell} whitespace-nowrap`}>
                        {rowButtons(
                          'stages',
                          i,
                          form.stages.length,
                          { up: 'settings.stage.up', down: 'settings.stage.down', remove: 'settings.stage.remove' },
                          n,
                          true,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {errors.stages && (
            <p role="alert" className="text-danger">
              {t(errors.stages)}
            </p>
          )}
          <div>
            <Button variant="secondary" data-tour="add-stage" onClick={() => update(addStage)}>
              {t('settings.stage.add')}
            </Button>
          </div>
          <p className="text-sm text-muted">{t('settings.template.stagesNote')}</p>
        </section>

        {problem && (
          <p role="alert" className="text-danger">
            {problem}
          </p>
        )}
        <div>
          <Button type="submit" size="lg" disabled={saving}>
            {t('common.save')}
          </Button>
        </div>
        {dialog}
      </form>
    </div>
  );
}
