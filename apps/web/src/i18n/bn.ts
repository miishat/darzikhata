/** Bangla is the source of truth for message keys; English must provide every key. */
export const bn = {
  'app.name': 'দর্জিখাতা',
  'app.demo': 'ডেমো',
  'common.loading': 'লোড হচ্ছে…',
  'common.cancel': 'বাতিল',
  'common.confirm': 'নিশ্চিত করুন',
  'common.close': 'বন্ধ করুন',

  'welcome.title': 'দর্জিখাতা ডেমো',
  'welcome.subtitle': 'মাপ, অর্ডার আর বাকি টাকার হিসাব এক জায়গায়। একটি নমুনা দোকান বেছে নিন।',
  'welcome.note': 'সব তথ্য শুধু এই ব্রাউজারে থাকে। যেকোনো সময় রিসেট করা যায়।',
  'welcome.open': 'এই দোকান খুলুন',

  'auth.whoIsUsing': 'কে ব্যবহার করছেন?',
  'auth.enterPin': '{name}, আপনার পিন দিন',
  'auth.wrongPin': 'পিন মেলেনি, আবার চেষ্টা করুন',
  'auth.back': 'অন্য কেউ',
  'auth.demoPins': 'ডেমো পিন: তালিকার ক্রম অনুযায়ী ১১১১, ২২২২, ৩৩৩৩…',

  'nav.dashboard': 'হোম',
  'nav.orders': 'অর্ডার',
  'nav.customers': 'কাস্টমার ও মাপ',
  'nav.customersShort': 'কাস্টমার',
  'nav.work': 'কাজের তালিকা',
  'nav.workShort': 'কাজ',
  'nav.payments': 'পেমেন্ট',
  'nav.settings': 'সেটিংস',
  'nav.more': 'আরও',
  'nav.newOrder': 'নতুন অর্ডার',
  'nav.main': 'প্রধান মেনু',

  'shell.online': 'অনলাইন',
  'shell.offline': 'অফলাইন',
  'shell.switchUser': 'ইউজার বদলান',
  'shell.signedInAs': '{name} ({role})',

  'placeholder.body': 'এই অংশটি পরের ধাপে তৈরি হবে।',
  'access.denied': 'এই অংশ দেখার অনুমতি আপনার নেই।',

  'more.language': 'ভাষা',
  'more.layout': 'স্ক্রিন লেআউট',
  'more.layout.auto': 'স্ক্রিন অনুযায়ী',
  'more.layout.mobile': 'মোবাইল',
  'more.layout.desktop': 'ডেস্কটপ',
  'more.demo': 'ডেমো',
  'more.changeShop': 'অন্য নমুনা দোকান বেছে নিন',
  'more.reset': 'ডেমো ডেটা রিসেট করুন',
  'more.resetConfirm': 'এই ডিভাইসের সব পরিবর্তন মুছে যাবে এবং নমুনা ডেটা আবার শুরু হবে।',
  'more.changeShopConfirm': 'এই দোকানের সব ডেমো ডেটা মুছে যাবে।',

  'input.invalidMeasurement': 'মাপ বোঝা যায়নি। যেমন ৩৮½ বা 38.5 লিখুন',
  'input.invalidMoney': 'টাকার অঙ্ক বোঝা যায়নি',
  'pin.delete': 'শেষ সংখ্যা মুছুন',
  'pin.label': 'পিন',
  'unsaved.title': 'না সেভ করে চলে যাবেন?',
  'unsaved.body': 'এই পাতায় যা লিখেছেন তা সেভ হয়নি।',
  'unsaved.stay': 'এখানেই থাকুন',
  'unsaved.leave': 'সেভ না করে যান',
} as const;

export type MessageKey = keyof typeof bn;
export type Messages = Record<MessageKey, string>;
