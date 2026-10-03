import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DarziDb } from '../../data/db';
import { StoreProvider } from '../../data/StoreContext';
import { ShopStore } from '../../data/store';
import { I18nProvider } from '../../i18n/I18nProvider';
import { PhotoPicker } from './PhotoPicker';

const dbs: DarziDb[] = [];
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const PHOTO = 'data:image/jpeg;base64,AAAA';

function Harness({ onIds }: { onIds(ids: string[]): void }) {
  const [ids, setIds] = useState<string[]>([]);
  return (
    <PhotoPicker
      photoIds={ids}
      compress={async () => PHOTO}
      onChange={(next) => {
        setIds(next);
        onIds(next);
      }}
    />
  );
}

describe('PhotoPicker', () => {
  it('shrinks, stores and shows photos, and can remove them', async () => {
    const db = new DarziDb('photos-test');
    dbs.push(db);
    const store = new ShopStore({ db });
    await store.startDemo('rahman');
    let latest: string[] = [];
    render(
      <StoreProvider store={store}>
        <I18nProvider>
          <Harness onIds={(ids) => (latest = ids)} />
        </I18nProvider>
      </StoreProvider>,
    );

    const input = screen.getByLabelText('ছবি যোগ করুন') as HTMLInputElement;
    expect(input.accept).toBe('image/*');
    expect(input.getAttribute('capture')).toBe('environment');
    await userEvent.upload(input, new File(['x'], 'a.jpg', { type: 'image/jpeg' }));

    const image = await screen.findByRole('img', { name: 'ছবি ১' });
    expect(image.getAttribute('src')).toBe(PHOTO);
    expect(latest).toHaveLength(1);
    expect(await store.getPhoto(latest[0]!)).toBe(PHOTO);

    await userEvent.click(screen.getByRole('button', { name: 'ছবি ১ সরান' }));
    expect(screen.queryByRole('img', { name: 'ছবি ১' })).toBeNull();
    expect(latest).toEqual([]);
  });

  it('shows an alert and still reports the photos that saved when one fails', async () => {
    const db = new DarziDb('photos-fail-test');
    dbs.push(db);
    const store = new ShopStore({ db });
    await store.startDemo('rahman');
    const real = store.savePhoto.bind(store);
    let calls = 0;
    vi.spyOn(store, 'savePhoto').mockImplementation((data: string) => {
      calls += 1;
      return calls === 2 ? Promise.reject(new Error('quota')) : real(data);
    });
    let latest: string[] = [];
    render(
      <StoreProvider store={store}>
        <I18nProvider>
          <Harness onIds={(ids) => (latest = ids)} />
        </I18nProvider>
      </StoreProvider>,
    );

    const input = screen.getByLabelText('ছবি যোগ করুন') as HTMLInputElement;
    await userEvent.upload(input, [
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['y'], 'b.jpg', { type: 'image/jpeg' }),
    ]);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(latest).toHaveLength(1);
    expect(await screen.findByRole('img', { name: 'ছবি ১' })).toBeTruthy();
  });
});
