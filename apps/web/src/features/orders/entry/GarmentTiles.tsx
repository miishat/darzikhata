import { Plus, Shirt } from 'lucide-react';
import { useId, useState } from 'react';
import { useSnapshot } from '../../../data/StoreContext';
import { useI18n } from '../../../i18n/I18nProvider';
import type { DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useItemTitle } from './shared';

export interface LineStatus {
  text: string;
  tone: 'warn' | 'ok';
}

const DOT = { warn: 'bg-warn', ok: 'bg-ok' } as const;

interface Props {
  entry: OrderEntry;
  chosenKey: string | null;
  onChoose(key: string): void;
  /** Adds a garment and chooses it in the same click. */
  onAdd(templateId: string): void;
  status(item: DraftItem): LineStatus | null;
  hasErrors(key: string): boolean;
}

/** One "+ garment" button per active template, in a named group. */
export function AddGarmentButtons({ onAdd, className = '', menu = false }: { onAdd(templateId: string): void; className?: string; menu?: boolean }) {
  const { t, label } = useI18n();
  const { config } = useSnapshot();
  const templates = (config?.templates ?? []).filter((tpl) => tpl.active);
  return (
    <div role="group" aria-label={t('entry.quickAddGroup')} className={menu ? `flex flex-col ${className}` : `flex flex-wrap gap-2 ${className}`}>
      {templates.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          onClick={() => onAdd(tpl.id)}
          className={
            menu
              ? 'flex min-h-10 items-center gap-2 rounded-lg px-3 text-start hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus'
              : 'inline-flex min-h-9 items-center rounded-full border border-dashed border-line px-3 text-sm font-medium hover:border-brand hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-focus'
          }
        >
          {t('entry.quickAdd', { item: label(tpl.name) })}
        </button>
      ))}
    </div>
  );
}

/**
 * The order's garments as tiles (name, price, measurement status and wearer), the chosen one outlined, and an
 * "add garment" tile that opens the list of garments.
 */
export function GarmentTiles({ entry, chosenKey, onChoose, onAdd, status, hasErrors }: Props) {
  const { t, money } = useI18n();
  const title = useItemTitle(entry);
  const statusId = useId();
  const [adding, setAdding] = useState(false);
  return (
    <div role="group" aria-label={t('entry.itemsHeading')} className="flex flex-wrap items-stretch gap-2 border-b border-line p-3">
      {entry.draft.items.map((item) => {
        const line = status(item);
        const on = item.key === chosenKey;
        const broken = hasErrors(item.key);
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={on}
            aria-label={title(item)}
            aria-describedby={`${statusId}-${item.key}`}
            onClick={() => onChoose(item.key)}
            className={`flex min-w-44 items-center gap-3 rounded-xl px-3 py-2 text-start ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              on ? 'bg-brand-soft ring-2 ring-brand' : broken ? 'ring-2 ring-danger hover:bg-surface' : 'bg-surface/60 ring-1 ring-line hover:bg-surface'
            }`}
          >
            <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-lg bg-panel ${on ? 'text-brand-strong' : 'text-muted'}`}>
              <Shirt size={18} />
            </span>
            <span id={`${statusId}-${item.key}`} className="flex min-w-0 flex-col">
              <span className="flex items-baseline gap-2">
                <span className={`truncate font-bold ${on ? 'text-brand-strong' : ''}`}>{title(item)}</span>
                {item.price !== null && <span className="text-sm text-muted">{money(item.price * item.quantity)}</span>}
              </span>
              {(line || broken || item.wearer) && (
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  {broken ? (
                    <span className="font-semibold text-danger">{t('entry.itemHasErrors')}</span>
                  ) : (
                    line && (
                      <>
                        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${DOT[line.tone]}`} />
                        {line.text}
                      </>
                    )
                  )}
                  {item.wearer && <span className="truncate">· {item.wearer}</span>}
                </span>
              )}
            </span>
          </button>
        );
      })}
      {entry.draft.items.length > 0 && (
        <div
          className="relative"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAdding(false);
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setAdding(false);
          }}
        >
          <button
            type="button"
            data-tour="add-garment"
            aria-expanded={adding}
            onClick={() => setAdding((v) => !v)}
            className="flex h-full min-h-14 items-center gap-2 rounded-xl border-2 border-dashed border-line px-4 text-sm font-semibold text-brand-strong hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Plus aria-hidden="true" size={16} />
            {t('entry.addGarment')}
          </button>
          {adding && (
            <div className="absolute start-0 top-full z-30 mt-1 w-52 rounded-xl border border-line bg-panel-raised p-1 shadow-xl">
              <AddGarmentButtons
                menu
                onAdd={(id) => {
                  onAdd(id);
                  setAdding(false);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
