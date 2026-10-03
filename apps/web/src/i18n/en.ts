import type { Messages } from './bn';

export const en: Messages = {
  'app.name': 'DarziKhata',
  'app.demo': 'Demo',
  'common.loading': 'Loading…',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.close': 'Close',

  'welcome.title': 'DarziKhata demo',
  'welcome.subtitle': 'Measurements, orders and balances in one place. Pick a sample shop.',
  'welcome.note': 'All data stays in this browser only. You can reset it at any time.',
  'welcome.open': 'Open this shop',

  'auth.whoIsUsing': 'Who is using this device?',
  'auth.enterPin': '{name}, enter your PIN',
  'auth.wrongPin': 'Wrong PIN, please try again',
  'auth.back': 'Someone else',
  'auth.demoPins': 'Demo PINs, in list order: 1111, 2222, 3333…',

  'nav.dashboard': 'Home',
  'nav.orders': 'Orders',
  'nav.customers': 'Customers & measurements',
  'nav.customersShort': 'Customers',
  'nav.work': 'Work lists',
  'nav.workShort': 'Work',
  'nav.payments': 'Payments',
  'nav.settings': 'Settings',
  'nav.more': 'More',
  'nav.newOrder': 'New order',
  'nav.main': 'Main menu',

  'shell.online': 'Online',
  'shell.offline': 'Offline',
  'shell.switchUser': 'Switch user',
  'shell.signedInAs': '{name} ({role})',

  'placeholder.body': 'This part is built in a later step.',
  'access.denied': 'You do not have permission to see this.',

  'more.language': 'Language',
  'more.layout': 'Screen layout',
  'more.layout.auto': 'Match screen',
  'more.layout.mobile': 'Mobile',
  'more.layout.desktop': 'Desktop',
  'more.demo': 'Demo',
  'more.changeShop': 'Choose another sample shop',
  'more.reset': 'Reset demo data',
  'more.resetConfirm': 'All changes on this device will be erased and the sample data restored.',
  'more.changeShopConfirm': 'All demo data for this shop will be erased.',

  'input.invalidMeasurement': 'Could not read that measurement. Try 38½ or 38.5',
  'input.invalidMoney': 'Could not read that amount',
  'pin.delete': 'Delete last digit',
  'pin.label': 'PIN',
};
