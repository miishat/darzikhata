import type { ReviewItem } from '@darzikhata/domain';
import { useState } from 'react';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/bn';
import { Button } from '../../ui/Button';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { mergeBody, reviewEntry, type ReviewField, type ReviewRow, type ReviewValue } from './reviewView';
import { useVisibleReview } from './useSync';

type Side = 'current' | 'waiting';

/** Changes the server could not apply, each beside what the record holds now. */
export function ReviewPage() {
  const { t } = useI18n();
  const { sync } = useSnapshot();
  const items = useVisibleReview();
  const [result, setResult] = useState<'settled' | 'gone' | null>(null);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('review.title')}</h1>
      <p>{t('review.intro')}</p>
      {!sync.online && <p>{t('review.offline')}</p>}
      {result === 'settled' && (
        <p role="status" className="text-brand-strong">
          {t('review.settled')}
        </p>
      )}
      {result === 'gone' && (
        <p role="alert" className="text-danger">
          {t('review.gone')}
        </p>
      )}
      {items.length === 0 && <p>{t('review.empty')}</p>}
      {items.map((item) => (
        <ReviewCard key={item.event.id} item={item} disabled={!sync.online} onDone={(ok) => setResult(ok ? 'settled' : 'gone')} />
      ))}
    </div>
  );
}

function ReviewCard({ item, disabled, onDone }: { item: ReviewItem; disabled: boolean; onDone(ok: boolean): void }) {
  const { t, label, dateTime } = useI18n();
  const store = useStore();
  const { state, config } = useSnapshot();
  const entry = reviewEntry(item, state);
  const [merging, setMerging] = useState(false);
  const [taken, setTaken] = useState<Partial<Record<ReviewField, Side>>>({});
  const [busy, setBusy] = useState(false);
  const headingId = `review-${entry.eventId}`;
  const off = disabled || busy;

  const title = !entry.subject
    ? t('review.gone')
    : entry.subject.kind === 'customer'
      ? t('review.customer', { name: entry.subject.name })
      : t('review.order', { number: entry.subject.number }) + (entry.subject.garment ? ` · ${label(entry.subject.garment)}` : '');
  const staffName = config?.staff.find((s) => s.id === entry.staffId)?.name ?? entry.staffId;

  async function settle(decision: Parameters<typeof store.resolveReview>[1]) {
    if (busy) return;
    setBusy(true);
    const result = await store.resolveReview(entry.eventId, decision);
    setBusy(false);
    onDone(result.ok);
  }

  function saveMerge() {
    const take = entry.rows.filter((r) => taken[r.field] === 'waiting').map((r) => r.field);
    const body = mergeBody(item, state, take);
    return settle(body ? { kind: 'merge', body } : { kind: 'keepCurrent' });
  }

  return (
    <section aria-labelledby={headingId} data-tour="review-item" className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <div>
        <h2 id={headingId} className="font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted">{t('review.by', { name: staffName, time: dateTime(entry.at) })}</p>
      </div>

      {entry.outcome === 'rejected' ? (
        <p>{t('review.refused', { reason: entry.reason })}</p>
      ) : entry.rows.length === 0 ? (
        <p>{t('review.sameNow')}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th scope="col" className="py-1 pe-2">
                {t('review.field')}
              </th>
              <th scope="col" className="py-1 pe-2">
                {t('review.current')}
              </th>
              <th scope="col" className="py-1">
                {t('review.waiting')}
              </th>
            </tr>
          </thead>
          <tbody>
            {entry.rows.map((row) => (
              <tr key={row.field} className="border-t border-line">
                <th scope="row" className="py-1 pe-2 font-semibold">
                  {t(`review.field.${row.field}` as MessageKey)}
                </th>
                <td className="py-1 pe-2">
                  <Shown value={row.current} />
                </td>
                <td className="py-1">
                  <Shown value={row.waiting} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {merging ? (
        <div className="flex flex-col gap-3">
          <p className="font-semibold">{t('review.mergeTitle')}</p>
          {entry.rows.map((row) => (
            <MergeChoice
              key={row.field}
              row={row}
              value={taken[row.field] ?? 'current'}
              onChange={(side) => setTaken((c) => ({ ...c, [row.field]: side }))}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            <Button disabled={off} onClick={saveMerge}>
              {t('review.saveMerge')}
            </Button>
            <Button variant="secondary" disabled={off} onClick={() => setMerging(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entry.outcome === 'rejected' ? (
            <Button variant="secondary" disabled={off} onClick={() => settle({ kind: 'keepCurrent' })}>
              {t('review.dismiss')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" disabled={off} onClick={() => settle({ kind: 'keepCurrent' })}>
                {t('review.keepCurrent')}
              </Button>
              {entry.canApplyMine && (
                <Button disabled={off} onClick={() => settle({ kind: 'applyMine' })}>
                  {t('review.applyMine')}
                </Button>
              )}
              {entry.canMerge && (
                <Button variant="secondary" disabled={off} onClick={() => setMerging(true)}>
                  {t('review.merge')}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function MergeChoice({ row, value, onChange }: { row: ReviewRow; value: Side; onChange(side: Side): void }) {
  const { t } = useI18n();
  const text = useValueText();
  return (
    <ChoiceGroup<Side>
      legend={t(`review.field.${row.field}` as MessageKey)}
      value={value}
      onChange={onChange}
      options={[
        { value: 'current', label: `${t('review.current')}: ${text(row.current)}` },
        { value: 'waiting', label: `${t('review.waiting')}: ${text(row.waiting)}` },
      ]}
    />
  );
}

function Shown({ value }: { value: ReviewValue }) {
  const text = useValueText();
  return <>{text(value)}</>;
}

/** How a stored value reads on screen. */
function useValueText(): (value: ReviewValue) => string {
  const { t, money, date } = useI18n();
  const { state, config } = useSnapshot();
  const blank = t('review.blank');
  return (value) => {
    switch (value.kind) {
      case 'text':
        return value.value ? value.value : blank;
      case 'date':
        return value.value ? date(value.value, { year: true }) : blank;
      case 'money':
        return money(value.value);
      case 'staff':
        return value.value ? (config?.staff.find((s) => s.id === value.value)?.name ?? value.value) : blank;
      case 'gender':
        return value.value ? t(`gender.${value.value}`) : blank;
      case 'household':
        return value.value ? (state.households[value.value]?.label ?? value.value) : blank;
      case 'discount':
        if (!value.value) return blank;
        return value.value.reason ? `${money(value.value.amount)} (${value.value.reason})` : money(value.value.amount);
    }
  };
}
