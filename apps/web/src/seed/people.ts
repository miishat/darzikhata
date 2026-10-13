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

/** Used once the first twenty are taken, so a bigger shop never repeats a name. */
export const MORE_MEN: SeedPerson[] = [
  man('আনোয়ার হোসেন', 'Anwar Hossain'),
  man('মাসুদ রানা', 'Masud Rana'),
  man('শাহীন আলম', 'Shahin Alam'),
  man('নুরুল আমিন', 'Nurul Amin'),
  man('সোহেল রানা', 'Sohel Rana'),
  man('জুয়েল আহমেদ', 'Jewel Ahmed'),
  man('তৌহিদ ইসলাম', 'Touhid Islam'),
  man('মনির হোসেন', 'Monir Hossain'),
  man('আশরাফুল আলম', 'Ashraful Alam'),
  man('রুবেল মিয়া', 'Rubel Mia'),
  man('সজীব আহমেদ', 'Sajib Ahmed'),
  man('অনিক সরকার', 'Anik Sarker'),
  man('হাসান মাহমুদ', 'Hasan Mahmud'),
  man('পলাশ কুমার', 'Palash Kumar'),
  man('ইকবাল হোসেন', 'Iqbal Hossain'),
  man('শামীম আহসান', 'Shamim Ahsan'),
  man('আবির খান', 'Abir Khan'),
  man('মেহেদী হাসান', 'Mehedi Hasan'),
  man('নাঈম উদ্দিন', 'Naeem Uddin'),
  man('ফয়সাল আহমেদ', 'Faisal Ahmed'),
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

export const MORE_WOMEN: SeedPerson[] = [
  woman('নাজমা আক্তার', 'Nazma Akter'),
  woman('সালমা খাতুন', 'Salma Khatun'),
  woman('শাহনাজ পারভীন', 'Shahnaz Parvin'),
  woman('ফারহানা ইসলাম', 'Farhana Islam'),
  woman('জেসমিন আরা', 'Jesmin Ara'),
  woman('সুমাইয়া হক', 'Sumaiya Haque'),
  woman('তাসনিম জারা', 'Tasnim Zara'),
  woman('রুবিনা ইয়াসমিন', 'Rubina Yasmin'),
  woman('মাহফুজা আক্তার', 'Mahfuza Akter'),
  woman('শাপলা বেগম', 'Shapla Begum'),
  woman('নাদিয়া রহমান', 'Nadia Rahman'),
  woman('ইশরাত জাহান', 'Ishrat Jahan'),
  woman('অনামিকা দাস', 'Anamika Das'),
  woman('সাদিয়া আফরিন', 'Sadia Afrin'),
  woman('লিপি আক্তার', 'Lipi Akter'),
  woman('কহিনুর বেগম', 'Kohinoor Begum'),
  woman('বিথি রানী', 'Bithi Rani'),
  woman('মুনমুন নাহার', 'Munmun Nahar'),
  woman('শিউলি আক্তার', 'Shiuli Akter'),
  woman('তামান্না হোসেন', 'Tamanna Hossain'),
];

export const CHILDREN: string[] = [
  'রাফি', 'তানহা', 'আয়ান', 'নাবিলা', 'সামি', 'রিয়া', 'ফাহিম', 'মাহি', 'আরাফ', 'সাদিয়া', 'তাসিন', 'নুহা',
];

/** Design notes by garment, so a panjabi never gets a blouse's note. Empty entries mean "no note". */
export const DESIGN_NOTES: Record<string, string[]> = {
  shirt: ['কলার একটু চওড়া', 'বুকে এক পকেট', 'হাতায় কাফলিং, ডাবল বোতাম', 'ফিটিং একটু ঢিলা', 'সামনে লুকানো বোতাম', 'স্লিম ফিট, পিছনে দুটো প্লিট', '', ''],
  pant: ['দুই পাশে পকেট, পিছনে এক', 'মুহুরি ১৪ ইঞ্চি, সোজা কাট', 'কোমরে বেল্ট লুপ ছাড়া', 'একটু ঢিলা থাই', 'জিপ ছাড়া, বোতাম', '', ''],
  panjabi: ['গলায় সূক্ষ্ম কাজ', 'কাঁধে প্লেট', 'দুই পকেট, ঢাকনা সহ', 'ঈদের জন্য, হালকা এমব্রয়ডারি', 'বুকে চিকন প্লেট', 'কলার ছাড়া, গোল গলা', '', ''],
  'salwar-kameez': ['গলায় পাইপিং', 'পাশে স্লিট, হাতায় লেস', 'সামনের গলা গোল, পিছনে ডিপ', 'ওড়নার সাথে মিলিয়ে বর্ডার', 'কামিজ লম্বা, সালোয়ার প্যালাজো কাট', '', ''],
  blouse: ['পিছনের গলা ডিপ, ডোরি সহ', 'কনুই-হাতা, হাতায় লেস', 'সামনে হুক, পিছনে জিপ', 'প্যাডেড, বোট নেক', 'হাতা ছাড়া, গলায় কাজ', '', ''],
  'bridal-lehenga': ['জরির কাজ, পুরো ঘেরে', 'ব্লাউজে হাতের কাজ, ভারী ওড়না', 'কনের জন্য, ওড়নায় চুমকি বর্ডার', 'স্কার্টে তিন লেয়ার, ক্যানক্যান সহ'],
  'school-shirt': ['বুক পকেটে স্কুলের লোগো', ''],
  'school-pant': ['কোমরে ইলাস্টিক', ''],
  alteration: ['মুহুরি ছোট করা', 'কোমর ১ ইঞ্চি ছোট করা', 'হাতা খাটো', 'কাঁধ ঠিক করা', 'ঝুল কমানো', 'বোতাম বদল'],
};

export const FABRIC_NOTES: string[] = [
  'কাস্টমারের কাপড়, সাদা সুতি',
  'নীল লিনেন',
  'দোকানের কাপড় #১২',
  'সিল্ক, মেরুন',
  'জর্জেট, গোলাপি',
  'কাস্টমারের কাপড়, ২ গজ',
  'খদ্দর, অফ-হোয়াইট',
  'কটন, হালকা ধূসর',
  'কাতান, সবুজ',
  'মসলিন, ক্রিম',
  '',
];

export const FITTING_NOTES: string[] = [
  'কাঁধ ¼ ইঞ্চি কমাতে হবে',
  'হাতা ½ ইঞ্চি লম্বা',
  'কোমর একটু ঢিলা করতে হবে',
  'গলা আরেকটু নিচে নামাতে হবে',
  'ঝুল ১ ইঞ্চি কমাতে হবে',
  'বুক সামান্য টাইট, ½ ইঞ্চি ছাড়তে হবে',
];

/** Why a garment went back a stage during fitting. */
export const REWORK_REASONS: string[] = [
  'ট্রায়ালে ফিটিং ঠিক হয়নি',
  'সেলাই খুলে গেছে, আবার করতে হবে',
  'কাপড়ে দাগ লেগেছে, ঠিক করা হচ্ছে',
  'মাপে ভুল ধরা পড়েছে',
];

/** Who a garment is for when it is not the customer: a parent ordering for a child, a spouse and so on. */
export const WEARERS = {
  male: ['ছেলে', 'ভাই', 'বাবা', 'বড় ছেলে', 'ছোট ভাই'],
  female: ['মেয়ে', 'বোন', 'মা', 'বড় মেয়ে', 'ননদ'],
};

/** Garments cut for women; the rest are men's. */
export const WOMENS_GARMENTS = ['salwar-kameez', 'blouse', 'bridal-lehenga'];

export const ORDER_NOTES: string[] = [
  'ডেলিভারির আগে ফোন দেবেন',
  'অফিস থেকে নেবেন, সন্ধ্যার পর',
  'বিয়ের অনুষ্ঠানের জন্য, দেরি করা যাবে না',
  'ঈদের আগে লাগবে',
  'কাপড় আগেই দিয়ে গেছেন',
  'ছেলে এসে নিয়ে যাবে',
];

/** Notes kept on a customer; every few customers get one. */
export const CUSTOMER_NOTES: string[] = [
  'কলার একটু ছোট পছন্দ করেন',
  'ডান কাঁধ সামান্য নিচু',
  'সবসময় ফোন করে আসেন',
  'বাকিতে নেন না, নগদে দেন',
  'বিয়ের মাপ আলাদা রাখা আছে',
  'মোটা কাপড়ে ঢিলা ফিট চান',
];

export type SwatchPattern = 'stripes' | 'dots' | 'check' | 'waves';

/** Fabric and design reference images the sample shops attach to some garments: background, accent, pattern. */
export const PHOTO_STYLES: Array<[string, string, SwatchPattern]> = [
  ['#e8d9c5', '#8b5e34', 'stripes'],
  ['#d7e3f4', '#2f5d9e', 'check'],
  ['#f3d9e2', '#b03a63', 'dots'],
  ['#dbeadb', '#2f7a4d', 'waves'],
  ['#efe6c8', '#a87f1a', 'dots'],
  ['#e1dcf0', '#5b4a9e', 'stripes'],
];

/** A small SVG swatch as a data URL, standing in for a photo of the fabric or design. */
export function swatchDataUrl([bg, accent, pattern]: [string, string, SwatchPattern]): string {
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);
  const shapes: Record<SwatchPattern, string> = {
    stripes: range(8).map((i) => `<rect x="${i * 20 + 6}" y="0" width="8" height="160" fill="${accent}" opacity=".55"/>`).join(''),
    dots: range(24).map((i) => `<circle cx="${(i % 6) * 28 + 14}" cy="${Math.floor(i / 6) * 40 + 20}" r="7" fill="${accent}" opacity=".6"/>`).join(''),
    check:
      range(6).map((i) => `<rect x="${i * 30}" y="0" width="10" height="160" fill="${accent}" opacity=".35"/>`).join('') +
      range(6).map((i) => `<rect x="0" y="${i * 30}" width="160" height="10" fill="${accent}" opacity=".35"/>`).join(''),
    waves: range(6).map((i) => `<path d="M0 ${i * 28 + 14} q20 -16 40 0 t40 0 t40 0 t40 0" fill="none" stroke="${accent}" stroke-width="4" opacity=".6"/>`).join(''),
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="${bg}"/>${shapes[pattern]}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
