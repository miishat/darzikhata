import { formatMeasurement, type GarmentTemplate, type OrderItem } from '@darzikhata/domain';
import { ChevronRight, MessageSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { fieldGroups, groupLabel } from '../customers/measurementView';

interface Props {
  item: OrderItem;
  template: GarmentTemplate | undefined;
  /** Whether the viewer may see this customer's measurements. */
  canSee: boolean;
  stageName(key: string): string;
  photos: ReactNode;
}

function Heading({ children }: { children: ReactNode }) {
  return <h4 className="text-xs font-bold uppercase tracking-wide text-muted">{children}</h4>;
}

/**
 * What a garment holds behind "Notes and History", in the order a tailor reads it: measurements with dotted lines to
 * their values, the labelled notes and photos, fitting changes, then the stages it has been through. Groups and notes
 * carry a thin rule at their start, so each one reads as its own block.
 */
export function PanelItemDetails({ item, template, canSee, stageName, photos }: Props) {
  const { t, label, language } = useI18n();
  const values = item.measurements?.values;
  const groups =
    values && canSee && template
      ? fieldGroups(template.fields)
          .map((g) => ({
            name: groupLabel(g.group, t),
            rows: g.fields.filter((f) => values[f.key]).map((f) => ({ key: f.key, name: label(f.label), value: values[f.key]! })),
          }))
          .filter((g) => g.rows.length > 0)
      : [];
  const notes = [
    { title: t('entry.designNotes'), text: item.designNotes },
    { title: t('entry.fabricNote'), text: item.fabricNote },
  ].filter((n) => n.text);
  const chain = item.stageHistory.length > 0 ? [item.stageHistory[0]!.from, ...item.stageHistory.map((c) => c.to)] : [];
  const reworks = item.stageHistory.flatMap((c) => (c.kind === 'rework' ? [{ at: c.at, from: c.from, to: c.to, reason: c.reason }] : []));

  return (
    <div className="mt-2 flex flex-col gap-4">
      {groups.length > 0 && (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <section key={g.name} aria-label={g.name} className="flex flex-col border-s-2 border-line ps-3">
              <Heading>{g.name}</Heading>
              <dl className="m-0 flex flex-col">
                {g.rows.map((r) => (
                  <div key={r.key} className="flex items-baseline gap-2 py-1">
                    <dt>{r.name}</dt>
                    <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-[3px] border-b border-dotted border-muted/60" />
                    <dd className="m-0 font-bold tabular-nums">{`${formatMeasurement(r.value.value, language)} ${t(r.value.unit === 'cm' ? 'unit.cm' : 'unit.inch')}`}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <div key={n.title} className="border-s-2 border-brand ps-3">
              <p className="text-xs font-semibold text-muted">{n.title}</p>
              <p className="mt-0.5">{n.text}</p>
            </div>
          ))}
        </div>
      )}

      {photos}

      {item.adjustments.length > 0 && (
        <div className="flex flex-col gap-1">
          <Heading>{t('item.adjustments')}</Heading>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {item.adjustments.map((a) => (
              <li key={a.id} className="flex gap-2">
                <MessageSquare aria-hidden="true" size={14} className="mt-1 shrink-0 text-muted" />
                {a.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {chain.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Heading>{t('item.history')}</Heading>
          <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-xs">
            {chain.map((key, i) => (
              <li key={`${key}-${i}`} className="inline-flex items-center gap-1">
                <span className={`rounded-full border px-2 py-0.5 ${i === chain.length - 1 ? 'border-brand font-semibold text-brand-strong' : 'border-line text-muted'}`}>{stageName(key)}</span>
                {i < chain.length - 1 && <ChevronRight aria-hidden="true" size={12} className="text-muted" />}
              </li>
            ))}
          </ol>
          {reworks.map((c, i) => (
            <p key={`${c.at}-${i}`} className="m-0">
              <span className="text-muted">
                {stageName(c.from)} → {stageName(c.to)}
              </span>
              <span className="block text-danger">{t('item.rework', { reason: c.reason })}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
