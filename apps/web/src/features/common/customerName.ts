import type { Language } from '@darzikhata/domain';

/** The customer's name in the app's language: their English name in English when they have one, so the two scripts don't mix. */
export function customerName(customer: { name: string; nameAlt: string | null }, language: Language): string {
  return language === 'en' && customer.nameAlt?.trim() ? customer.nameAlt : customer.name;
}
