import { expect, test } from '@playwright/test';
import { openShop, takeFirstOrder } from './helpers';

// Presenter scenario 1: a new customer orders 2 shirts and 1 panjabi for ৳2,400 and pays ৳1,000
// up front; the receipt shows a ৳1,400 balance.
test('a new customer’s first order ends on a receipt with the balance', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  await page.getByRole('link', { name: '+ নতুন অর্ডার' }).click();

  await takeFirstOrder(page);

  await expect(page.getByRole('heading', { name: 'রসিদ' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'হিসাব' }).getByRole('row', { name: /^বাকি/ })).toContainText('৳১,৪০০');
});
