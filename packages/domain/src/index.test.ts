import { describe, expect, it } from 'vitest';
import * as domain from './index';

describe('public API', () => {
  it('exports the main entry points', () => {
    for (const name of [
      'applyEvent',
      'replay',
      'formatTaka',
      'parseMeasurement',
      'nextOrderNumber',
      'moneySummary',
      'searchCustomers',
      'publicOrderView',
      'pushEvents',
      'syncDevice',
      'trialsOn',
      'STARTER_TEMPLATES',
      'DEFAULT_ROLES',
    ]) {
      expect(domain, name).toHaveProperty(name);
    }
  });
});
