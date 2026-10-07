import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { configProblemText } from './configProblems';
import { readTemplate, type FieldRow, type StageRow, type TemplateErrors, type TemplateForm } from './templateInput';

export const TEMPLATES_PATH = '/app/settings/templates';

/**
 * One garment being edited: the form, its checks and the save. Leaving with unsaved changes asks first;
 * a save goes back to the garment list with a "Saved" note.
 */
export function useTemplateDraft(initial: TemplateForm) {
  const { t, language } = useI18n();
  const store = useStore();
  const navigate = useNavigate();
  const [start] = useState(() => JSON.stringify(initial));
  const [form, setForm] = useState<TemplateForm>(initial);
  const [errors, setErrors] = useState<TemplateErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const dirty = !done && JSON.stringify(form) !== start;
  const { dialog, allowNextNavigation } = useUnsavedGuard(dirty);

  const update = (change: (f: TemplateForm) => TemplateForm) => setForm(change);
  const patchField = (i: number, patch: Partial<FieldRow>) =>
    update((f) => ({ ...f, fields: f.fields.map((row, j) => (j === i ? { ...row, ...patch } : row)) }));
  const patchStage = (i: number, patch: Partial<StageRow>) =>
    update((f) => ({ ...f, stages: f.stages.map((row, j) => (j === i ? { ...row, ...patch } : row)) }));
  const err = (path: string) => (errors[path] ? t(errors[path]) : undefined);

  /** Saves, or returns the problems found so the screen can show where they are. */
  async function save(): Promise<TemplateErrors | null> {
    if (saving) return null;
    setProblem(null);
    const existing = store.getSnapshot().config?.templates ?? [];
    const result = readTemplate(form, existing);
    if (!result.ok) {
      setErrors(result.errors);
      return result.errors;
    }
    setErrors({});
    setSaving(true);
    const { template } = result;
    const outcome = await store.updateConfig((current) => ({
      ...current,
      templates: current.templates.some((x) => x.id === template.id)
        ? current.templates.map((x) => (x.id === template.id ? template : x))
        : [...current.templates, template],
    }));
    setSaving(false);
    if (!outcome.ok) {
      setProblem(configProblemText(outcome.problems, language));
      return null;
    }
    setDone(true);
    allowNextNavigation();
    navigate(TEMPLATES_PATH, { state: { saved: true } });
    return null;
  }

  return { form, update, patchField, patchStage, err, errors, problem, saving, save, dialog };
}

export type TemplateDraft = ReturnType<typeof useTemplateDraft>;
