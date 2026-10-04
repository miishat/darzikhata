import type { ItemRef } from '@darzikhata/domain';
import { useRef, useState, type ReactNode } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { SelectField } from '../../ui/SelectField';
import { itemTitle } from '../common/orderText';
import {
  assignBody,
  assignees,
  batchStageTargets,
  planAssign,
  planStageMove,
  runBatch,
  stageMoveBody,
  type BatchResult,
} from './workList';

interface Props {
  /** The garments as they were when the dialog opened; the preview and the saves use these copies. */
  refs: ItemRef[];
  /** Called with true when the batch ran, so the caller can clear the selection. */
  onClose(finished: boolean): void;
}

interface Line {
  ref: ItemRef;
  text: string;
}

/** Runs the batch once and keeps the results. The dialog is a frame with buttons, never a form, so Enter saves nothing. */
function useBatch() {
  const store = useStore();
  const { language } = useI18n();
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const busy = useRef(false);
  const [working, setWorking] = useState(false);

  const run = async (steps: Parameters<typeof runBatch>[1]) => {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    try {
      setResults(await runBatch((body) => store.dispatch(body), steps, language));
    } finally {
      busy.current = false;
      setWorking(false);
    }
  };
  return { results, working, run };
}

interface FrameProps {
  title: string;
  lines: Line[];
  results: BatchResult[] | null;
  working: boolean;
  canConfirm: boolean;
  onConfirm(): void;
  onClose(finished: boolean): void;
  children?: ReactNode;
}

function BatchFrame({ title, lines, results, working, canConfirm, onConfirm, onClose, children }: FrameProps) {
  const { t, language } = useI18n();
  const finished = results !== null;
  const outcome = (ref: ItemRef) => {
    const result = results?.find((r) => r.ref.item.id === ref.item.id);
    if (!result) return t('work.skipped');
    return result.problem ?? t('work.done');
  };
  return (
    <Dialog
      open
      title={title}
      onClose={() => onClose(finished)}
      actions={
        finished ? (
          <Button onClick={() => onClose(true)}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => onClose(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={working || !canConfirm} onClick={onConfirm}>
              {t('common.confirm')}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-3 text-ink">
        {!finished && children}
        {finished ? (
          <ul aria-label={t('work.results')} className="flex flex-col gap-1">
            {lines.map(({ ref }) => (
              <li key={ref.item.id} className="flex flex-wrap justify-between gap-2">
                <span>{`${ref.order.number} ${itemTitle(ref.order, ref.item, language)}`}</span>
                <span className="font-semibold">{outcome(ref)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul aria-label={t('work.preview')} className="flex flex-col gap-1">
            {lines.map(({ ref, text }) => (
              <li key={ref.item.id}>{text}</li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

/** Gives the selected garments to one person, or to nobody, after showing what would change. */
export function BatchAssignDialog({ refs, onClose }: Props) {
  const { t, language } = useI18n();
  const { config } = useSnapshot();
  const { results, working, run } = useBatch();
  const [choice, setChoice] = useState('');
  const [frozen] = useState(refs);
  const branchIds = [...new Set(frozen.map((r) => r.order.branchId))];
  const people = config ? assignees(config, branchIds) : [];
  const nameOf = (id: string | null) =>
    id === null ? t('work.unassigned') : (config?.staff.find((s) => s.id === id)?.name ?? id);
  const assigneeId = choice === '' ? null : choice;
  const toName = assigneeId === null ? t('work.nobody') : nameOf(assigneeId);
  const plan = planAssign(frozen, assigneeId);
  const lines: Line[] = plan.map((row) => {
    const title = `${row.ref.order.number} ${itemTitle(row.ref.order, row.ref.item, language)}`;
    return {
      ref: row.ref,
      text: row.ok
        ? `${title}: ${t('work.change', { from: nameOf(row.ref.item.assignedTo), to: toName })}`
        : `${title}: ${t('work.skip.assigned', { name: toName })}`,
    };
  });
  const changing = plan.filter((row) => row.ok);

  return (
    <BatchFrame
      title={t('work.assign')}
      lines={lines}
      results={results}
      working={working}
      canConfirm={changing.length > 0}
      onConfirm={() => void run(changing.map((row) => ({ ref: row.ref, body: assignBody(row.ref, assigneeId) })))}
      onClose={onClose}
    >
      <SelectField
        label={t('work.worker')}
        value={choice}
        onChange={setChoice}
        options={[{ value: '', label: t('work.nobody') }, ...people.map((s) => ({ value: s.id, label: s.name }))]}
      />
    </BatchFrame>
  );
}

/** Moves the selected garments forward to one stage, after showing what would change. */
export function BatchStageDialog({ refs, onClose }: Props) {
  const { t, language, label } = useI18n();
  const { results, working, run } = useBatch();
  const [frozen] = useState(refs);
  const targets = batchStageTargets(frozen);
  const [to, setTo] = useState(targets[0]?.key ?? '');
  const plan = planStageMove(frozen, to);
  const lines: Line[] = plan.map((row) => {
    const title = `${row.ref.order.number} ${itemTitle(row.ref.order, row.ref.item, language)}`;
    return {
      ref: row.ref,
      text: row.ok
        ? `${title}: ${t('work.change', { from: label(row.from.label), to: label(row.to.label) })}`
        : `${title}: ${t(`work.skip.${row.reason}`)}`,
    };
  });
  const changing = plan.filter((row) => row.ok);

  return (
    <BatchFrame
      title={t('item.changeStage')}
      lines={lines}
      results={results}
      working={working}
      canConfirm={changing.length > 0}
      onConfirm={() => void run(changing.map((row) => ({ ref: row.ref, body: stageMoveBody(row) })))}
      onClose={onClose}
    >
      <SelectField
        label={t('item.newStage')}
        value={to}
        onChange={setTo}
        options={targets.map((stage) => ({ value: stage.key, label: label(stage.label) }))}
      />
      <p className="text-sm text-muted">{t('work.bulkNote')}</p>
    </BatchFrame>
  );
}
