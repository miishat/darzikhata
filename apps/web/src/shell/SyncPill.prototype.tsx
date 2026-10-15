// PROTOTYPE (throwaway): audit #13. The sync status says "দেখতে হবে" (Needs Attention) without saying what, and the
// sheet it opens puts that same text on the online switch's row. Current plus five ways to name what is waiting and
// keep the switch about the connection, switchable via ?variant= on any page (open the header dot or sidebar block).
import { syncStatus, type ReviewItem, type SyncStatus } from '@darzikhata/domain';
import { useSearchParams } from 'react-router';
import { useSnapshot } from '../data/StoreContext';
import { useVisibleReview as useRealReview } from '../features/sync/useSync';
import { useI18n } from '../i18n/I18nProvider';
import { useVariant } from '../ui/PrototypeSwitcher';

export const SYNC_VARIANT_KEYS = ['0', 'V1', 'V2', 'V3', 'V4', 'V5'] as const;

export function useSyncVariants(): Record<string, string> {
  const pick = usePick();
  return {
    '0': pick('এখনকার: "দেখতে হবে"', 'Current: "Needs Attention"'),
    V1: pick('V1: "যাচাই বাকি ৩", যাচাই সারি সবার আগে', 'V1: "3 to Review", review row first'),
    V2: pick('V2: সংযোগ আর যাচাই আলাদা চিহ্নে', 'V2: connection and review as two separate signs'),
    V3: pick('V3: সুইচের নাম "অনলাইনে থাকুন"', 'V3: switch row named "Stay Online"'),
    V4: pick('V4: চাপলে সোজা যাচাই পাতায়', 'V4: tapping goes straight to Review'),
    V5: pick('V5: শিটে "যাচাই" আর "সংযোগ" দুই ভাগ', 'V5: sheet split into "Review" and "Connection"'),
  };
}

export function useSyncVariant(): string {
  return useVariant(SYNC_VARIANT_KEYS);
}

export function usePick() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

/** The words each variant uses; counts arrive already in the right script. */
export function useSyncWords() {
  const pick = usePick();
  return {
    toReview: (n: string) => pick(`যাচাই বাকি ${n}`, `${n} to Review`),
    reviewNow: (n: string) => pick(`যাচাই করুন (${n})`, `Review (${n})`),
    reviewShort: (n: string) => pick(`${n}টি যাচাই`, `${n} to Review`),
    reviewBanner: (n: string, count: number) => pick(`${n}টি পরিবর্তন আপনাকে যাচাই করতে হবে`, count === 1 ? `${n} change needs your review` : `${n} changes need your review`),
    reviewWhy: pick('অন্য ডিভাইসের সাথে মেলেনি, কোনটি রাখবেন বেছে নিন', 'They clashed with another device; pick which to keep'),
    connection: pick('ইন্টারনেট সংযোগ', 'Connection'),
    stayOnline: pick('অনলাইনে থাকুন', 'Stay Online'),
    nowOnline: pick('এখন অনলাইন', 'Online now'),
    nowOffline: pick('এখন অফলাইন', 'Offline now'),
    sectionReview: pick('যাচাই', 'Review'),
    sectionConnection: pick('সংযোগ', 'Connection'),
  };
}

/**
 * PROTOTYPE: the sync button and sheet read the review list through these, so the mockup always shows the
 * needs-review state. With no real review items it pretends there are 2; ?review=N picks the count (0 for none).
 */
export function useVisibleReview(): ReviewItem[] {
  const real = useRealReview();
  const [params] = useSearchParams();
  const asked = params.get('review');
  const count = asked !== null ? Math.max(0, Number(asked) || 0) : real.length > 0 ? real.length : 2;
  if (asked === null && real.length > 0) return real;
  return Array.from({ length: count }, (_, i) => real[i] ?? ({} as ReviewItem));
}

export function useSyncStatus(): SyncStatus {
  const { sync } = useSnapshot();
  const review = useVisibleReview();
  return syncStatus({ online: sync.online, syncing: sync.syncing, reviewCount: review.length });
}
