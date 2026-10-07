// PROTOTYPE (throwaway): desktop layouts for the fabric tags, switched with ?variant=. Never merged.
import { labelIn, shopContact, type Customer, type Language, type Order, type OrderItem, type ShopConfig } from '@darzikhata/domain';
import { Scissors } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate, formatNumber, translate } from '../../i18n/format';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { itemTitle } from '../common/orderText';

export const FABRIC_TAG_VARIANTS = {
  A: 'Current tags',
  B: 'Luggage tags: a punch hole to pin through, the order number big, the delivery date in a black block',
  C: 'Tag and claim stub: the tag goes on the fabric, the stub with the same number goes to the customer',
  D: 'Strip labels: one narrow strip per garment across the page, so a big uniform order fits on one or two sheets',
  E: 'Square cards, three across: huge order number, "piece 2 of 5" so no piece goes missing, delivery band at the bottom',
  F: 'Work tags: the tag plus stage boxes to tick as the garment moves, and a line for who is making it',
};

export function useFabricTagVariant() {
  return useVariant(Object.keys(FABRIC_TAG_VARIANTS));
}

export function FabricTagSwitcher() {
  return <PrototypeSwitcher variants={FABRIC_TAG_VARIANTS} />;
}

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);
const INK = 'bg-ink [print-color-adjust:exact]';

export interface FabricTagsPaperProps {
  variant: string;
  language: Language;
  config: ShopConfig;
  order: Order;
  customer: Customer | undefined;
}

interface Tag {
  item: OrderItem;
  title: string;
  garment: string;
  index: number;
  total: number;
}

function useTags({ language, order }: FabricTagsPaperProps): Tag[] {
  const items = order.items.filter((item) => !item.cancelled);
  return items.map((item, i) => ({
    item,
    title: itemTitle(order, item, language),
    garment: labelIn(item.garmentName, language),
    index: i + 1,
    total: items.length,
  }));
}

function Header({ language, config, order, customer, count }: FabricTagsPaperProps & { count: number }) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars);
  return (
    <header className="mb-4">
      <div className="text-center">
        <p className="font-display text-3xl font-bold">{shopContact(config, language).name}</p>
        <h1 className={`mx-auto mt-3 w-fit rounded-full border-2 border-ink px-5 py-0.5 text-sm font-bold ${language === 'en' ? 'uppercase tracking-[0.2em]' : ''}`}>{t('print.tags')}</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-6 border-y-4 border-double border-ink py-2 text-sm">
        <p className="font-display text-2xl font-bold tabular-nums">{order.number}</p>
        <p>
          <b>{customer?.name}</b>
        </p>
        <p>{pick(language, `${formatNumber(count, language)}টি ট্যাগ · কেটে কাপড়ে লাগান`, `${count} tags · cut out and pin to the fabric`)}</p>
      </div>
    </header>
  );
}

const date = (d: string | null, language: Language) => (d ? formatDate(d, language, { year: false }) : '');

function Cut({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <li className={`print-block relative list-none border-2 border-dashed border-muted ${className}`}>{children}</li>;
}

/** B: luggage tags with a punch hole. */
function Luggage(props: FabricTagsPaperProps) {
  const { language, order, customer } = props;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const tags = useTags(props);
  return (
    <>
      <Header {...props} count={tags.length} />
      <ul aria-label={t('print.tags')} className="m-0 grid grid-cols-2 gap-3 p-0">
        {tags.map((tag) => (
          <Cut key={tag.item.id} className="flex items-stretch rounded-e-xl">
            <div className="flex w-10 shrink-0 items-center justify-center border-e-2 border-dashed border-muted">
              <span aria-hidden="true" className="size-4 rounded-full border-2 border-ink" />
            </div>
            <div className="min-w-0 flex-1 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-3xl font-bold leading-none tabular-nums">{order.number}</p>
                {tag.item.deliveryDate && (
                  <p className={`${INK} rounded-md px-2 text-center leading-tight text-panel`}>
                    <span className="block text-[10px] font-semibold">{t('receipt.delivery')}</span>
                    <span className="block font-display text-base font-bold">{date(tag.item.deliveryDate, language)}</span>
                  </p>
                )}
              </div>
              <p className="mt-2 font-display text-lg font-bold">{tag.title}</p>
              <p className="truncate text-sm text-muted">{[tag.item.wearer, customer?.name].filter(Boolean).join(' · ')}</p>
            </div>
          </Cut>
        ))}
      </ul>
    </>
  );
}

/** C: tag with a claim stub for the customer. */
function TagAndStub(props: FabricTagsPaperProps) {
  const { language, order, customer, config } = props;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const tags = useTags(props);
  return (
    <>
      <Header {...props} count={tags.length} />
      <ul aria-label={t('print.tags')} className="m-0 grid grid-cols-1 gap-3 p-0">
        {tags.map((tag) => (
          <Cut key={tag.item.id} className="grid grid-cols-[1fr_auto_13rem]">
            <div className="p-3">
              <div className="flex items-baseline gap-3">
                <p className="font-display text-3xl font-bold tabular-nums">{order.number}</p>
                <p className="font-display text-lg font-bold">{tag.title}</p>
              </div>
              <p className="text-sm">
                {[tag.item.wearer, customer?.name, customer?.phone].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-sm">
                {tag.item.trialDate && (
                  <span className="me-4">
                    <span className="text-muted">{t('print.trial')}: </span>
                    <b>{date(tag.item.trialDate, language)}</b>
                  </span>
                )}
                {tag.item.deliveryDate && (
                  <span>
                    <span className="text-muted">{t('receipt.delivery')}: </span>
                    <b>{date(tag.item.deliveryDate, language)}</b>
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center border-x-2 border-dashed border-muted px-1 text-muted">
              <Scissors aria-hidden="true" className="size-4 rotate-90" />
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] font-semibold text-muted">{shopContact(config, language).name}</p>
              <p className="font-display text-2xl font-bold tabular-nums">{order.number}</p>
              <p className="text-xs">{tag.garment}</p>
              {tag.item.deliveryDate && (
                <p className="mt-1 text-xs">
                  {pick(language, 'নিতে আসুন', 'Collect on')} <b>{date(tag.item.deliveryDate, language)}</b>
                </p>
              )}
            </div>
          </Cut>
        ))}
      </ul>
    </>
  );
}

/** D: narrow strips across the page. */
function Strips(props: FabricTagsPaperProps) {
  const { language, order, customer } = props;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const tags = useTags(props);
  return (
    <>
      <Header {...props} count={tags.length} />
      <ul aria-label={t('print.tags')} className="m-0 p-0">
        {tags.map((tag) => (
          <li key={tag.item.id} className="print-block -mt-0.5 flex list-none items-stretch border-y-2 border-dashed border-muted">
            <p className={`${INK} flex w-24 shrink-0 items-center justify-center font-display text-xl font-bold tabular-nums text-panel`}>{order.number}</p>
            <div className="flex min-w-0 flex-1 items-baseline gap-3 px-3 py-2">
              <p className="shrink-0 font-display text-base font-bold">{tag.title}</p>
              <p className="truncate text-sm text-muted">{[tag.item.wearer, customer?.name].filter(Boolean).join(' · ')}</p>
            </div>
            <p className="flex shrink-0 items-center px-3 text-xs tabular-nums text-muted">
              {formatNumber(tag.index, language)}/{formatNumber(tag.total, language)}
            </p>
            {tag.item.deliveryDate && (
              <p className="flex w-28 shrink-0 flex-col justify-center border-s-2 border-ink px-3 leading-tight">
                <span className="text-[10px] font-semibold text-muted">{t('receipt.delivery')}</span>
                <span className="font-display text-base font-bold">{date(tag.item.deliveryDate, language)}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

/** E: square cards, three across, with "piece n of N". */
function Squares(props: FabricTagsPaperProps) {
  const { language, order } = props;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const tags = useTags(props);
  return (
    <>
      <Header {...props} count={tags.length} />
      <ul aria-label={t('print.tags')} className="m-0 grid grid-cols-3 gap-3 p-0">
        {tags.map((tag) => (
          <Cut key={tag.item.id} className="flex aspect-square flex-col overflow-hidden rounded-lg text-center">
            <p className="pt-2 text-[10px] font-semibold text-muted">
              {pick(language, `${formatNumber(tag.total, language)}টির ${formatNumber(tag.index, language)} নম্বর`, `Piece ${tag.index} of ${tag.total}`)}
            </p>
            <div className="flex flex-1 flex-col items-center justify-center px-2">
              <p className="font-display text-5xl font-bold leading-none tabular-nums">{order.number}</p>
              <p className="mt-2 font-display text-lg font-bold">{tag.title}</p>
              {tag.item.wearer && <p className="truncate text-sm">{tag.item.wearer}</p>}
            </div>
            {tag.item.deliveryDate && (
              <p className={`${INK} py-1 text-panel`}>
                <span className="text-xs">{t('receipt.delivery')}: </span>
                <b className="font-display">{date(tag.item.deliveryDate, language)}</b>
              </p>
            )}
          </Cut>
        ))}
      </ul>
    </>
  );
}

/** F: tags with stage boxes to tick and a line for the worker. */
function WorkTags(props: FabricTagsPaperProps) {
  const { language, order, config } = props;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const tags = useTags(props);
  return (
    <>
      <Header {...props} count={tags.length} />
      <ul aria-label={t('print.tags')} className="m-0 grid grid-cols-2 gap-3 p-0">
        {tags.map((tag) => {
          const worker = tag.item.assignedTo ? config.staff.find((s) => s.id === tag.item.assignedTo)?.name : undefined;
          return (
            <Cut key={tag.item.id} className="rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 border-b-2 border-ink pb-2">
                <div className="min-w-0">
                  <p className="font-display text-3xl font-bold leading-none tabular-nums">{order.number}</p>
                  <p className="mt-1 font-display text-base font-bold">
                    {tag.title}
                    {tag.item.wearer && <span className="font-sans text-sm font-normal text-muted"> · {tag.item.wearer}</span>}
                  </p>
                </div>
                {tag.item.deliveryDate && (
                  <p className={`${INK} shrink-0 rounded-md px-2 text-center leading-tight text-panel`}>
                    <span className="block text-[10px] font-semibold">{t('receipt.delivery')}</span>
                    <span className="block font-display text-base font-bold">{date(tag.item.deliveryDate, language)}</span>
                  </p>
                )}
              </div>
              <ol className="m-0 mt-2 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs">
                {tag.item.stages.map((stage) => (
                  <li key={stage.key} className="flex items-center gap-1">
                    <span aria-hidden="true" className="size-3.5 rounded-sm border-2 border-ink" />
                    {labelIn(stage.label, language)}
                  </li>
                ))}
              </ol>
              <p className="mt-3 flex items-end gap-2 text-xs text-muted">
                {pick(language, 'কারিগর', 'Made by')}:
                <span className="flex-1 border-b border-ink pb-0.5 text-sm text-ink">{worker}</span>
              </p>
            </Cut>
          );
        })}
      </ul>
    </>
  );
}

export function FabricTagsPaper(props: FabricTagsPaperProps): ReactNode {
  if (props.variant === 'B') return <Luggage {...props} />;
  if (props.variant === 'C') return <TagAndStub {...props} />;
  if (props.variant === 'D') return <Strips {...props} />;
  if (props.variant === 'E') return <Squares {...props} />;
  if (props.variant === 'F') return <WorkTags {...props} />;
  return null;
}
