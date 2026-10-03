export interface SeedPerson {
  bn: string;
  en: string;
  gender: 'male' | 'female';
}

const man = (bn: string, en: string): SeedPerson => ({ bn, en, gender: 'male' });
const woman = (bn: string, en: string): SeedPerson => ({ bn, en, gender: 'female' });

export const MEN: SeedPerson[] = [
  man('রহিম উদ্দিন', 'Rahim Uddin'),
  man('করিম মিয়া', 'Karim Mia'),
  man('আব্দুল হক', 'Abdul Haque'),
  man('মোহাম্মদ আলী', 'Mohammad Ali'),
  man('জাহাঙ্গীর আলম', 'Jahangir Alam'),
  man('সাকিব হাসান', 'Sakib Hasan'),
  man('তানভীর আহমেদ', 'Tanvir Ahmed'),
  man('রাশেদ চৌধুরী', 'Rashed Chowdhury'),
  man('ফারুক হোসেন', 'Faruk Hossain'),
  man('নাজমুল ইসলাম', 'Nazmul Islam'),
  man('মাহবুব রহমান', 'Mahbub Rahman'),
  man('শফিকুল ইসলাম', 'Shafiqul Islam'),
  man('আরিফ খান', 'Arif Khan'),
  man('মিজানুর রহমান', 'Mizanur Rahman'),
  man('হাবিবুর রহমান', 'Habibur Rahman'),
  man('কামরুল হাসান', 'Kamrul Hasan'),
  man('সুমন দাস', 'Sumon Das'),
  man('বিপ্লব বড়ুয়া', 'Biplob Barua'),
  man('ইমরান হোসেন', 'Imran Hossain'),
  man('রফিকুল আমিন', 'Rafiqul Amin'),
];

export const WOMEN: SeedPerson[] = [
  woman('শিরিন আক্তার', 'Shirin Akter'),
  woman('ফাতেমা বেগম', 'Fatema Begum'),
  woman('নুসরাত জাহান', 'Nusrat Jahan'),
  woman('সুলতানা রাজিয়া', 'Sultana Razia'),
  woman('তাহমিনা খাতুন', 'Tahmina Khatun'),
  woman('রুমানা ইসলাম', 'Rumana Islam'),
  woman('শারমিন সুলতানা', 'Sharmin Sultana'),
  woman('মরিয়ম নেসা', 'Mariam Nesa'),
  woman('জান্নাতুল ফেরদৌস', 'Jannatul Ferdous'),
  woman('লাবণ্য দাস', 'Labonno Das'),
  woman('সাবরিনা হক', 'Sabrina Haque'),
  woman('আয়েশা সিদ্দিকা', 'Ayesha Siddika'),
  woman('রেহানা পারভীন', 'Rehana Parvin'),
  woman('মৌসুমী রায়', 'Mousumi Roy'),
  woman('নাসরিন সুলতানা', 'Nasrin Sultana'),
  woman('ফারজানা ইয়াসমিন', 'Farzana Yasmin'),
  woman('তানজিলা হোসেন', 'Tanzila Hossain'),
  woman('মিতু আক্তার', 'Mitu Akter'),
  woman('রোকসানা বেগম', 'Roksana Begum'),
  woman('পপি চৌধুরী', 'Popy Chowdhury'),
];

export const CHILDREN: string[] = [
  'রাফি', 'তানহা', 'আয়ান', 'নাবিলা', 'সামি', 'রিয়া', 'ফাহিম', 'মাহি', 'আরাফ', 'সাদিয়া', 'তাসিন', 'নুহা',
];

export const DESIGN_NOTES: string[] = [
  'কলার একটু চওড়া',
  'দুই পকেট, ঢাকনা সহ',
  'হাতায় কাফলিং',
  'ফিটিং একটু ঢিলা',
  'সামনে লুকানো বোতাম',
  'গলায় সূক্ষ্ম কাজ',
  '',
  '',
];

export const FABRIC_NOTES: string[] = ['কাস্টমারের কাপড়, সাদা সুতি', 'নীল লিনেন', 'দোকানের কাপড় #১২', 'সিল্ক, মেরুন', 'জর্জেট, গোলাপি', ''];

export const FITTING_NOTES: string[] = ['কাঁধ ¼ ইঞ্চি কমাতে হবে', 'হাতা ½ ইঞ্চি লম্বা', 'কোমর একটু ঢিলা করতে হবে'];
