import { expect, test } from '@playwright/test';
import { openShop, takeFirstOrder } from './helpers';

// Presenter scenario 4: go offline, take an order and a payment, sync, and settle a conflict.
// Every sample shop starts with one waiting change: Sumon Das's phone and notes, edited here
// while another device changed his notes.
test('changes made offline sync later, and the waiting change is settled', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  const syncButton = page.locator('[data-tour="sync-status"]');
  const dialog = page.getByRole('dialog', { name: 'সিঙ্ক' });
  await expect(syncButton).toHaveAccessibleName('দেখতে হবে');

  await syncButton.click();
  await dialog.getByRole('switch', { name: 'অফলাইনে যান' }).click();
  await page.keyboard.press('Escape');
  await expect(syncButton).toHaveAccessibleName('অফলাইন');

  // The order and its advance stay on this device, even across a reload.
  await page.getByRole('link', { name: 'নতুন অর্ডার' }).click();
  await takeFirstOrder(page);
  await expect(page.getByRole('heading', { name: 'রসিদ' })).toBeVisible();
  await page.goto('/app/orders');
  await expect(syncButton).toHaveAccessibleName(/^অফলাইন · সিঙ্ক বাকি [১-৯]/);

  await syncButton.click();
  await expect(dialog.getByText(/^এই ডিভাইসে সিঙ্ক বাকি: /)).toBeVisible();
  await dialog.getByRole('switch', { name: 'অনলাইনে যান' }).click();
  await expect(dialog.getByText('সব পরিবর্তন সিঙ্ক হয়েছে')).toBeVisible();
  await expect(syncButton).toHaveAccessibleName('দেখতে হবে');

  await dialog.getByRole('link', { name: 'যাচাই করুন' }).click();
  await expect(page).toHaveURL(/\/app\/review$/);
  const entry = page.getByRole('region', { name: 'কাস্টমার: সুমন দাস' });
  await expect(entry.getByRole('row', { name: /^ফোন/ })).toContainText('01712345678');
  await entry.getByRole('button', { name: 'অপেক্ষমাণ পরিবর্তন রাখুন' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'সমাধান হয়েছে' })).toBeVisible();
  await expect(page.getByText('যাচাই করার মতো কিছু নেই')).toBeVisible();
  await expect(syncButton).toHaveAccessibleName('অনলাইন');
});
