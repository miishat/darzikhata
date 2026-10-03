import type { Language } from '@darzikhata/domain';
import type { MessageKey } from '../../i18n/bn';
import { translate } from '../../i18n/format';

/** Problems people can cause from the settings screens, by the code's first part. */
const MESSAGES: Record<string, MessageKey> = {
  'no-shop-name': 'settings.problem.shopName',
  'no-owner': 'settings.problem.noManager',
  'self-inactive': 'settings.problem.self',
  'invalid-link-expiry': 'settings.problem.linkExpiry',
  'invalid-pin': 'settings.problem.pin',
};

/**
 * One sentence per problem that stopped a settings change. Codes such as "invalid-pin:staff-1"
 * are matched by their first part; anything else is shown as a plain "could not save".
 */
export function configProblemText(problems: string[], language: Language): string {
  const keys = new Set<string>();
  const texts: string[] = [];
  for (const problem of problems) {
    const key = MESSAGES[problem.split(':')[0]!];
    if (key && keys.has(key)) continue;
    if (key) keys.add(key);
    texts.push(key ? translate(language, key) : translate(language, 'save.rejected', { reason: problem }));
  }
  return texts.join(' ');
}
