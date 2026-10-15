// PROTOTYPE (throwaway): five ways to get rid of the garment card's own scrollbar on the desktop new order page.
// Switch with ?variant=0|1|2|3|4|5 at desktop width, with a garment added (a shirt shows it best).
//   1 the whole page scrolls instead; the receipt column stays in view beside it
//   2 as 1, and the garment tiles stay pinned at the top of the page while you scroll
//   3 tabs inside the card: Measurements, Design and Notes, Dates and Price; one shows at a time
//   4 sections that fold: Measurements open, the other two closed until opened (one open at a time)
//   5 compact: measurement groups side by side and tighter spacing, so most garments fit without scrolling
import type { Language } from '@darzikhata/domain';
import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export const SCROLL_VARIANTS = {
  '0': 'Current',
  '1': 'Page scrolls, receipt stays in view',
  '2': 'Page scrolls, garment tiles pinned',
  '3': 'Tabs inside the card',
  '4': 'Folding sections',
  '5': 'Compact, groups side by side',
} as const;
export const SCROLL_KEYS = Object.keys(SCROLL_VARIANTS);

const WORDS = {
  measurements: { bn: 'মাপ', en: 'Measurements' },
  design: { bn: 'ডিজাইন ও নোট', en: 'Design and Notes' },
  dates: { bn: 'তারিখ ও দাম', en: 'Dates and Price' },
} as const;
export type SectionWord = keyof typeof WORDS;
export const sectionWord = (language: Language, key: SectionWord) => WORDS[key][language === 'bn' ? 'bn' : 'en'];

export interface Section {
  id: SectionWord;
  label: string;
  node: ReactNode;
  /** A field inside shows an error, so the tab or heading says so even while it is closed. */
  bad: boolean;
  /** Shown beside the heading while open (variant 4). */
  hint?: string;
}

const DOT = <span aria-hidden="true" className="size-2 rounded-full bg-danger" />;

/** Variant 3: one section at a time under a tab row. */
export function SectionTabs({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<SectionWord>('measurements');
  const current = sections.find((s) => s.id === active) ?? sections[0]!;
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="flex gap-1 border-b border-line">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`gs-tab-${s.id}`}
            aria-selected={s.id === current.id}
            aria-controls="gs-panel"
            onClick={() => setActive(s.id)}
            className={`-mb-px inline-flex min-h-10 items-center gap-2 border-b-2 px-4 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
              s.id === current.id ? 'border-brand font-bold text-brand-strong' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {s.label}
            {s.bad && DOT}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="gs-panel" aria-labelledby={`gs-tab-${current.id}`}>
        {current.node}
      </div>
    </div>
  );
}

/** Variant 4: headings that fold, one open at a time. */
export function SectionFolds({ sections }: { sections: Section[] }) {
  const [open, setOpen] = useState<SectionWord>('measurements');
  return (
    <div className="flex flex-col gap-1.5">
      {sections.map((s) => {
        const on = s.id === open;
        return (
          <section key={s.id} className="rounded-xl border border-line">
            <h4>
              <button
                type="button"
                aria-expanded={on}
                aria-controls={`gs-fold-${s.id}`}
                onClick={() => setOpen(on ? ('' as SectionWord) : s.id)}
                className="flex min-h-9 w-full items-center gap-2 px-4 text-start font-semibold focus-visible:outline-2 focus-visible:outline-focus"
              >
                {s.label}
                {s.bad && DOT}
                {on && s.hint && <span className="text-sm font-normal text-muted">{s.hint}</span>}
                <ChevronDown aria-hidden="true" size={18} className={`ms-auto text-muted transition-transform ${on ? 'rotate-180' : ''}`} />
              </button>
            </h4>
            {on && (
              <div id={`gs-fold-${s.id}`} className="border-t border-line p-2">
                {s.node}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
