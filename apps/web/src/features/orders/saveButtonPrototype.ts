// PROTOTYPE (throwaway): how the desktop new order Save button looks before a customer is picked.
// Switch with ?variant=0|1|2|3|4|5 on /app/orders/new at desktop width.
//   1 the button stays but looks faded, with a line above it saying a customer is needed; clicking it jumps to the search
//   2 the button itself becomes "Pick a Customer First" (outlined) and jumps to the search; it turns into Save once picked
//   3 a short checklist above the button (customer, garment); the button turns solid once both are ticked
//   4 the receipt starts with a "Customer" row that says "Pick a Customer" in link colour; the button stays faded until then
//   5 the customer bar is outlined with a "Start Here" tag, and the faded button shows a lock with the reason beside it
import type { Language } from '@darzikhata/domain';

export const SAVE_VARIANTS = {
  '0': 'Current',
  '1': 'Faded button with a note above',
  '2': 'Button says pick a customer first',
  '3': 'Checklist above the button',
  '4': 'Customer row at the top of the receipt',
  '5': 'Customer bar marked Start Here, locked button',
} as const;
export const SAVE_KEYS = Object.keys(SAVE_VARIANTS);

const WORDS = {
  needCustomer: { bn: 'সেভ করতে আগে কাস্টমার বেছে নিন', en: 'Pick a Customer to Save' },
  pickFirst: { bn: 'আগে কাস্টমার বেছে নিন', en: 'Pick a Customer First' },
  customer: { bn: 'কাস্টমার', en: 'Customer' },
  garment: { bn: 'অন্তত একটি পোশাক', en: 'At Least One Garment' },
  startHere: { bn: 'এখান থেকে শুরু', en: 'Start Here' },
} as const;
export type SaveWord = keyof typeof WORDS;
export const saveWord = (language: Language, key: SaveWord) => WORDS[key][language === 'bn' ? 'bn' : 'en'];
