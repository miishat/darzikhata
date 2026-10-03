import type { ApplyOutcome, Language } from '@darzikhata/domain';
import { translate } from '../../i18n/format';

/** What to tell the person when a save did not go through; null when it did. */
export function problemText(outcome: ApplyOutcome, language: Language): string | null {
  switch (outcome.kind) {
    case 'conflict':
      return translate(language, 'save.conflict');
    case 'rejected':
      return translate(language, 'save.rejected', { reason: outcome.reason });
    default:
      return null;
  }
}
