// PROTOTYPE (throwaway): five ways to stop the phone order screen's floating balance pill from covering content, each
// with a clearer next-stage button. Switch with ?variant=0|1|2|3|4|5 on a phone order page.
//   1 no floating pill: "take payment" joins the money card at the top; button says what to do ("start cutting")
//   2 a slim bar fixed above the tabs, never a pill; button reads "Next: cutting"
//   3 the balance moves into the header as a chip; button shows "Next step" over the stage name
//   4 the pill hides while you scroll and comes back when you stop; button says what to do
//   5 the payment bar stays open, so it is a solid bar; button says what to do
import type { Language, Stage } from '@darzikhata/domain';

export const ORDER_DETAIL_VARIANTS = {
  '0': 'Current',
  '1': 'Take payment in the money card, no pill',
  '2': 'Slim bar above the tabs',
  '3': 'Balance chip in the header',
  '4': 'Pill hides while scrolling',
  '5': 'Payment bar always open',
} as const;
export const ORDER_DETAIL_KEYS = Object.keys(ORDER_DETAIL_VARIANTS);

type Words = { bn: string; en: string };

/** What to do to reach a stage, for the stages shops start with. A shop's own stage falls back to "Next: …". */
const ACTION: Record<string, Words> = {
  cutting: { bn: 'কাটিং শুরু করুন', en: 'Start cutting' },
  stitching: { bn: 'সেলাই শুরু করুন', en: 'Start stitching' },
  embroidery: { bn: 'এমব্রয়ডারি শুরু করুন', en: 'Start embroidery' },
  working: { bn: 'কাজ শুরু করুন', en: 'Start work' },
  trial: { bn: 'ট্রায়ালের জন্য তৈরি', en: 'Ready for trial' },
  qc: { bn: 'মান যাচাই করুন', en: 'Check quality' },
};
const READY: Words = { bn: 'রেডি হয়েছে', en: 'Mark ready' };

const pick = (w: Words, language: Language) => (language === 'bn' ? w.bn : w.en);

export function nextLabel(stage: Stage, language: Language): string {
  const name = pick(stage.label, language);
  return pick({ bn: `পরের ধাপ: ${name}`, en: `Next: ${name}` }, language);
}

export function actionLabel(stage: Stage, language: Language): string {
  if (stage.group === 'ready') return pick(READY, language);
  const known = ACTION[stage.key];
  return known ? pick(known, language) : nextLabel(stage, language);
}

export const NEXT_STEP: Words = { bn: 'পরের ধাপ', en: 'Next step' };
export const BALANCE_CHIP: Words = { bn: '{amount} বাকি', en: '{amount} due' };
export const words = (w: Words, language: Language) => pick(w, language);
