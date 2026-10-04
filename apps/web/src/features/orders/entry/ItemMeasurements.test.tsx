import { currentVersion, templateById } from '@darzikhata/domain';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from '../../../data/db';
import { StoreProvider } from '../../../data/StoreContext';
import { ShopStore } from '../../../data/store';
import { I18nProvider } from '../../../i18n/I18nProvider';
import type { DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { ItemMeasurements } from './ItemMeasurements';

const dbs: DarziDb[] = [];
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

describe('ItemMeasurements tiles', () => {
  it('does not show a restricted customer’s saved values as "before" to staff who may not see them', async () => {
    const db = new DarziDb(`item-meas-${dbs.length}`);
    dbs.push(db);
    const store = new ShopStore({ db });
    await store.startDemo('nakshi');
    await store.signOut();
    await store.signIn('nakshi-counter', '2222');
    const { state, config } = store.getSnapshot();
    const key = Object.keys(state.profiles).find((k) => state.customers[k.split(':')[0]!]?.gender === 'female')!;
    const [customerId, templateId] = key.split(':') as [string, string];
    const template = templateById(config!, templateId)!;
    const field = template.fields[0]!;
    const saved = currentVersion(state.profiles[key]!)!.values[field.key]!.value;

    const item: DraftItem = {
      key: 'k1',
      templateId,
      quantity: 1,
      price: null,
      wearer: '',
      measurements: { kind: 'new', values: { [field.key]: saved + 7 }, source: 'body', notes: '' },
      designNotes: '',
      fabricNote: '',
      photoIds: [],
      trialDate: '',
      deliveryDate: '',
    };
    const entry = {
      canSeeMeasurements: false,
      draft: { customer: { kind: 'existing', customerId } },
      updateItem: () => {},
    } as unknown as OrderEntry;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider store={store}>
        <I18nProvider>{children}</I18nProvider>
      </StoreProvider>
    );
    render(<ItemMeasurements entry={entry} item={item} errors={{}} tiles />, { wrapper });
    expect(await screen.findAllByRole('textbox')).not.toHaveLength(0);
    expect(screen.queryByText(/^আগে /)).toBeNull();
  });
});
