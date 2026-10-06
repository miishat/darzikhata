import { expect, type Locator, type Page } from '@playwright/test';

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

/** Opens a sample shop from the welcome screen, signed in as its owner. */
export async function openShop(page: Page, name: 'রহমান টেইলার্স' | 'নকশী বুটিক' | 'ইউনিফর্ম হাউস') {
  await page.goto('/');
  await page.getByRole('button', { name: `এই দোকান খুলুন: ${name}` }).click();
  await expect(page.getByRole('navigation', { name: 'প্রধান মেনু' })).toBeVisible();
}

/** Fills measurement fields by their labels inside a region. */
export async function fill(scope: Locator, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) await scope.getByLabel(label, { exact: true }).fill(value);
}

export const SHIRT = { 'ঝুল': '29', 'বুক': '38', 'পেট': '34', 'কাঁধ (পুট)': '17', 'হাতা': '23', 'গলা': '15½' };

/**
 * From an open New Order page in Rahman Tailors: a new customer, 2 shirts and 1 panjabi for
 * ৳2,400 with ৳1,000 up front, checks the balance, then saves. The app then shows the receipt.
 */
export async function takeFirstOrder(page: Page) {
  if (isPhone(page)) {
    const next = () => page.getByRole('button', { name: 'পরের ধাপ' }).click();
    await page.getByRole('button', { name: 'নতুন কাস্টমার' }).click();
    await page.getByLabel('নাম', { exact: true }).fill('জসিম উদ্দিন');
    await page.getByLabel('ফোন', { exact: true }).fill('01799887766');
    await next();

    await page.getByLabel('পোশাক', { exact: true }).selectOption({ label: 'শার্ট' });
    await page.getByRole('button', { name: 'পোশাক যোগ করুন' }).click();
    await page.getByLabel('পোশাক', { exact: true }).selectOption({ label: 'পাঞ্জাবি' });
    await page.getByRole('button', { name: 'পোশাক যোগ করুন' }).click();
    await page.getByRole('button', { name: 'শার্ট ১', exact: true }).click();
    const shirt = page.getByRole('region', { name: 'শার্ট ১' });
    await shirt.getByLabel('সংখ্যা').fill('২');
    await fill(shirt, SHIRT);
    await page.getByRole('button', { name: 'পাঞ্জাবি ২', exact: true }).click();
    await fill(page.getByRole('region', { name: 'পাঞ্জাবি ২' }), { ...SHIRT, 'ঝুল': '42' });
    await next();
    await next();

    await page.getByLabel('অগ্রিম').fill('১০০০');
    const summary = page.getByRole('table', { name: 'অর্ডারের হিসাব' });
    await expect(summary.getByRole('row', { name: /^মোট/ })).toContainText('৳২,৪০০');
    await expect(summary.getByRole('row', { name: /^বাকি/ })).toContainText('৳১,৪০০');
    await next();
    await page.getByRole('button', { name: 'অর্ডার সেভ করুন' }).click();
  } else {
    const bar = page.getByRole('region', { name: 'কাস্টমার', exact: true });
    const middle = page.getByRole('region', { name: 'পোশাক ও মাপ' });
    const right = page.getByRole('region', { name: 'অর্ডারের হিসাব' });
    await bar.getByRole('button', { name: 'নতুন কাস্টমার' }).click();
    await bar.getByLabel('নাম', { exact: true }).fill('জসিম উদ্দিন');
    await bar.getByLabel('ফোন', { exact: true }).fill('01799887766');

    // Shirt and panjabi share field labels, so fill only once the card shows the new garment.
    const showing = (name: string) => expect(middle.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
    await middle.getByRole('button', { name: '+ শার্ট' }).click();
    await showing('শার্ট ১');
    await middle.getByLabel('সংখ্যা').fill('২');
    await fill(middle, SHIRT);
    // Once there is a garment, more are added from the "add garment" tile's list.
    await middle.getByRole('button', { name: 'পোশাক যোগ করুন' }).click();
    await middle.getByRole('button', { name: '+ পাঞ্জাবি' }).click();
    await showing('পাঞ্জাবি ২');
    await fill(middle, { ...SHIRT, 'ঝুল': '42' });

    await right.getByLabel('অগ্রিম').fill('১০০০');
    await expect(right.getByRole('row', { name: /^মোট/ })).toContainText('৳২,৪০০');
    await expect(right.getByRole('row', { name: /^বাকি/ })).toContainText('৳১,৪০০');
    await right.getByRole('button', { name: 'অর্ডার সেভ করে রসিদ দেখান' }).click();
  }

}
