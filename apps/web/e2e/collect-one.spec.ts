import { expect, test } from '@playwright/test';
import { isPhone, openShop } from './helpers';

// Presenter scenario 3: hand over one garment; the order stays open. In Rahman Tailors the sample
// order A-0032 always has three garments ready to collect.
test('handing over one garment leaves the order open', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  if (isPhone(page)) {
    // On a phone, Home has a ready tile; it opens Orders filtered to ready garments.
    await page.getByRole('region', { name: 'আজকের কাজ' }).getByRole('link', { name: /রেডি/ }).click();
    await page.getByRole('list', { name: 'অর্ডার তালিকা' }).getByRole('link', { name: /A-0032/ }).click();
  } else {
    const ready = page.getByRole('region', { name: 'নেওয়ার জন্য রেডি' });
    await ready.getByRole('link', { name: 'A-0032' }).click();
  }

  // On a phone the order fills the page; on a laptop it opens in a panel beside the list.
  await expect(page.getByRole('heading', { name: 'A-0032' })).toBeVisible();
  const detail = isPhone(page) ? page.getByRole('main') : page.getByRole('region', { name: 'অর্ডারের বিস্তারিত' });
  await expect(detail.getByText('চলমান', { exact: true })).toBeVisible();
  await expect(detail.getByRole('button', { name: 'হস্তান্তর করুন' })).toHaveCount(3);

  await detail.getByRole('button', { name: 'হস্তান্তর করুন' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'হস্তান্তর নিশ্চিত করুন' });
  await dialog.getByRole('button', { name: 'নিশ্চিত করুন' }).click();
  await expect(dialog).toBeHidden();

  // The laptop panel says "ধাপ: ডেলিভারি হয়েছে"; the phone card shows a stage pill and tracker instead,
  // so there the fewer hand-over buttons below are the proof.
  if (!isPhone(page)) await expect(detail.getByText('ধাপ: ডেলিভারি হয়েছে')).toHaveCount(1);
  await expect(detail.getByRole('button', { name: 'হস্তান্তর করুন' })).toHaveCount(2);
  await expect(detail.getByText('চলমান', { exact: true })).toBeVisible();
});
