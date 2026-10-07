// PROTOTYPE (throwaway): desktop layouts for the welcome screen, switched with ?variant=. Never merged.
import { roleOf, type Language } from '@darzikhata/domain';
import {
  ArrowRight,
  Banknote,
  Building2,
  ClipboardList,
  MapPin,
  Printer,
  Ruler,
  Shirt,
  Sparkles,
  Store,
  Users,
  WifiOff,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { SEED_SHOPS, shopConfig, type SeedShopInfo, type SeedShopKey } from '../../seed/shops';
import { LanguageToggle } from '../../shell/ShellParts';
import { Avatar } from '../../ui/Avatar';
import { BrandMark } from '../../ui/BrandMark';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';

export const WELCOME_VARIANTS = {
  A: 'Current welcome',
  B: 'Split screen: a navy panel with the title and what the app does on the left, the three shops as big cards on the right',
  C: 'Three columns: a navy band across the top, then the shops side by side with their staff, branches and garments',
  D: 'Pick then open: the shops as a list on the left, a full preview of the picked one on the right with its people',
  E: 'Centred and light: the title, the three shops in a row, then a strip of what you can try',
  F: 'E with the subtitle on one line, and what you can try as a row of chips with the label beside them',
  G: 'E with the subtitle on one line, and what you can try as six small cards that each say what the feature does',
  H: 'E with the subtitle on one line, no strip: each shop card lists what to try in that shop',
  I: 'E with the subtitle on one line, and what you can try as one white bar split into six',
};

export function useWelcomeVariant() {
  return useVariant(Object.keys(WELCOME_VARIANTS));
}

export function WelcomeSwitcher() {
  return <PrototypeSwitcher variants={WELCOME_VARIANTS} />;
}

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);

const ICON: Record<SeedShopKey, LucideIcon> = { rahman: Shirt, nakshi: Sparkles, uniform: Building2 };

export interface WelcomeScreenProps {
  variant: string;
  opening: SeedShopKey | null;
  onOpen(key: SeedShopKey): void;
}

const FEATURES: Array<{ icon: LucideIcon; bn: string; en: string }> = [
  { icon: Ruler, bn: 'মাপের খাতা', en: 'Measurement book' },
  { icon: ClipboardList, bn: 'অর্ডার ও ডেলিভারি', en: 'Orders and delivery' },
  { icon: Banknote, bn: 'বাকি ও পেমেন্ট', en: 'Balances and payments' },
  { icon: Wrench, bn: 'কাজের তালিকা', en: 'Work list' },
  { icon: Printer, bn: 'রসিদ, স্লিপ ও ট্যাগ প্রিন্ট', en: 'Receipts, slips and tags' },
  { icon: WifiOff, bn: 'ইন্টারনেট ছাড়াও চলে', en: 'Works offline' },
];

function useFacts(shop: SeedShopInfo) {
  const { language, label, number } = useI18n();
  const config = shopConfig(shop.key);
  const staff = config.staff.filter((s) => s.active);
  return {
    config,
    staff,
    staffText: pick(language, `${number(staff.length)} জন`, staff.length === 1 ? '1 person' : `${staff.length} people`),
    branchText: config.branches.map((b) => label(b.name)).join(', '),
    garments: config.templates.filter((t) => t.id !== 'alteration').map((t) => label(t.name)),
    address: config.profile.address,
  };
}

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((g) => (
        <span key={g} className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold">
          {g}
        </span>
      ))}
    </div>
  );
}

function OpenButton({ props, shop, wide = false }: { props: WelcomeScreenProps; shop: SeedShopInfo; wide?: boolean }) {
  const { t, label } = useI18n();
  return (
    <button
      type="button"
      disabled={props.opening !== null}
      onClick={() => props.onOpen(shop.key)}
      aria-label={`${t('welcome.open')}: ${label(shop.name)}`}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 ${wide ? 'w-full' : ''}`}
    >
      {t('welcome.open')}
      <ArrowRight aria-hidden="true" className="size-4" />
    </button>
  );
}

function ShopIcon({ shop, big = false }: { shop: SeedShopInfo; big?: boolean }) {
  const Icon = ICON[shop.key];
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong ${big ? 'size-14' : 'size-12'}`}>
      <Icon aria-hidden="true" size={big ? 28 : 24} />
    </span>
  );
}

function Brand({ onDark = false }: { onDark?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <BrandMark size={36} />
        <span className="font-display text-lg font-bold">{t('app.name')}</span>
      </div>
      <LanguageToggle onDark={onDark} />
    </div>
  );
}

/** B: navy panel left, shop cards right. */
function Split(props: WelcomeScreenProps) {
  const { t, language } = useI18n();
  return (
    <main className="grid min-h-dvh grid-cols-[minmax(24rem,2fr)_3fr]">
      <section className="flex flex-col bg-navy p-10 text-on-navy">
        <Brand onDark />
        <div className="my-auto py-10">
          <h1 className="font-display text-5xl font-bold leading-tight">{t('welcome.title')}</h1>
          <p className="mt-3 max-w-md text-lg text-on-navy-muted">{t('welcome.subtitle')}</p>
          <ul className="m-0 mt-8 grid list-none grid-cols-2 gap-x-6 gap-y-3 p-0">
            {FEATURES.map((f) => (
              <li key={f.en} className="flex items-center gap-2.5 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-raised">
                  <f.icon aria-hidden="true" className="size-4" />
                </span>
                {pick(language, f.bn, f.en)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-on-navy-muted">{t('welcome.note')}</p>
      </section>
      <section className="flex flex-col justify-center gap-4 bg-surface p-10">
        <h2 className="text-sm font-bold tracking-wide text-muted uppercase">{pick(language, 'একটি নমুনা দোকান বাছুন', 'Pick a sample shop')}</h2>
        {SEED_SHOPS.map((shop) => (
          <SplitCard key={shop.key} shop={shop} props={props} />
        ))}
      </section>
    </main>
  );
}

function SplitCard({ shop, props }: { shop: SeedShopInfo; props: WelcomeScreenProps }) {
  const { label } = useI18n();
  const facts = useFacts(shop);
  return (
    <article className="flex items-center gap-5 rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <ShopIcon shop={shop} big />
      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="font-display text-xl font-bold">{label(shop.name)}</h3>
        <p className="text-sm text-muted">{label(shop.summary)}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Fact icon={Users}>{facts.staffText}</Fact>
          <Fact icon={Store}>{facts.branchText}</Fact>
        </div>
        <Chips items={facts.garments} />
      </div>
      <OpenButton props={props} shop={shop} />
    </article>
  );
}

/** C: navy band, three columns. */
function Columns(props: WelcomeScreenProps) {
  const { t } = useI18n();
  return (
    <main className="min-h-dvh bg-surface">
      <header className="bg-navy px-12 pt-6 pb-24 text-on-navy">
        <div className="mx-auto max-w-6xl">
          <Brand onDark />
          <h1 className="mt-10 font-display text-4xl font-bold">{t('welcome.title')}</h1>
          <p className="mt-2 text-lg text-on-navy-muted">{t('welcome.subtitle')}</p>
        </div>
      </header>
      <div className="mx-auto -mt-16 grid max-w-6xl grid-cols-3 gap-5 px-12">
        {SEED_SHOPS.map((shop) => (
          <ColumnCard key={shop.key} shop={shop} props={props} />
        ))}
      </div>
      <p className="mx-auto max-w-6xl px-12 py-8 text-center text-sm text-muted">{t('welcome.note')}</p>
    </main>
  );
}

function ColumnCard({ shop, props }: { shop: SeedShopInfo; props: WelcomeScreenProps }) {
  const { label, language } = useI18n();
  const facts = useFacts(shop);
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6 shadow-lg">
      <ShopIcon shop={shop} big />
      <div>
        <h2 className="font-display text-2xl font-bold">{label(shop.name)}</h2>
        <p className="mt-1 text-sm text-muted">{label(shop.summary)}</p>
      </div>
      <div className="space-y-2 border-t border-line pt-4">
        <Fact icon={Users}>{facts.staffText}</Fact>
        <Fact icon={Store}>{facts.branchText}</Fact>
        <Fact icon={MapPin}>{facts.address}</Fact>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted">{pick(language, 'পোশাক', 'Garments')}</p>
        <Chips items={facts.garments} />
      </div>
      <div className="mt-auto pt-2">
        <OpenButton props={props} shop={shop} wide />
      </div>
    </article>
  );
}

/** D: list then preview. */
function PickPreview(props: WelcomeScreenProps) {
  const { t, label, language } = useI18n();
  const [key, setKey] = useState<SeedShopKey>('rahman');
  const shop = SEED_SHOPS.find((s) => s.key === key)!;
  return (
    <main className="flex min-h-dvh flex-col bg-surface px-12 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <Brand />
        <h1 className="mt-10 font-display text-4xl font-bold">{t('welcome.title')}</h1>
        <p className="mt-2 text-lg text-muted">{t('welcome.subtitle')}</p>
        <div className="mt-8 grid grid-cols-[22rem_1fr] gap-6">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {SEED_SHOPS.map((s) => {
              const on = s.key === key;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setKey(s.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-start focus-visible:outline-2 focus-visible:outline-focus ${on ? 'border-brand bg-panel ring-2 ring-brand' : 'border-line bg-panel hover:bg-brand-soft'}`}
                  >
                    <ShopIcon shop={s} />
                    <span className="min-w-0">
                      <span className="block font-display text-lg font-bold">{label(s.name)}</span>
                      <span className="block text-sm text-muted">{label(s.summary)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            <li className="px-1 pt-2 text-sm text-muted">{t('welcome.note')}</li>
          </ul>
          <Preview key={shop.key} shop={shop} props={props} language={language} />
        </div>
      </div>
    </main>
  );
}

function Preview({ shop, props, language }: { shop: SeedShopInfo; props: WelcomeScreenProps; language: Language }) {
  const { label } = useI18n();
  const facts = useFacts(shop);
  return (
    <section aria-label={label(shop.name)} className="flex flex-col gap-6 rounded-3xl border border-line bg-panel p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <ShopIcon shop={shop} big />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-3xl font-bold">{label(shop.name)}</h2>
          <p className="mt-1 text-muted">{label(shop.summary)}</p>
        </div>
        <OpenButton props={props} shop={shop} />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted">{pick(language, 'দোকান', 'Shop')}</p>
          <Fact icon={Store}>{facts.branchText}</Fact>
          <Fact icon={MapPin}>{facts.address}</Fact>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">{pick(language, 'পোশাক', 'Garments')}</p>
          <Chips items={facts.garments} />
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-semibold text-muted">
          {pick(language, 'কারা আছেন', 'Who works here')} · {facts.staffText}
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
          {facts.staff.map((person) => {
            const role = roleOf(facts.config, person.id);
            return (
              <li key={person.id} className="flex items-center gap-2.5 rounded-xl bg-surface py-2 ps-2 pe-4">
                <Avatar id={person.id} name={person.name} />
                <span>
                  <span className="block text-sm font-semibold">{person.name}</span>
                  <span className="block text-xs text-muted">{role ? label(role.name) : ''}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** E: centred, light, features strip. */
function Centred(props: WelcomeScreenProps) {
  const { t, label, language } = useI18n();
  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-soft to-surface px-12 py-6">
      <div className="ms-auto">
        <LanguageToggle />
      </div>
      <div className="mx-auto mt-[6vh] flex w-full max-w-5xl flex-col items-center text-center">
        <BrandMark size={64} />
        <h1 className="mt-5 font-display text-5xl font-bold">{t('welcome.title')}</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">{t('welcome.subtitle')}</p>
        <ul className="m-0 mt-10 grid w-full list-none grid-cols-3 gap-4 p-0">
          {SEED_SHOPS.map((shop) => (
            <li key={shop.key}>
              <button
                type="button"
                disabled={props.opening !== null}
                onClick={() => props.onOpen(shop.key)}
                aria-label={`${t('welcome.open')}: ${label(shop.name)}`}
                className="group flex h-full w-full flex-col items-center gap-3 rounded-3xl border border-line bg-panel px-5 py-7 text-center shadow-sm transition-shadow hover:border-brand hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
              >
                <ShopIcon shop={shop} big />
                <span className="font-display text-xl font-bold">{label(shop.name)}</span>
                <span className="text-sm text-muted">{label(shop.summary)}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand-strong">
                  {t('welcome.open')}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-12 w-full border-t border-line pt-6">
          <p className="mb-4 text-xs font-bold tracking-wide text-muted uppercase">{pick(language, 'যা যা করে দেখতে পারেন', 'What you can try')}</p>
          <ul className="m-0 grid list-none grid-cols-6 gap-3 p-0">
            {FEATURES.map((f) => (
              <li key={f.en} className="flex flex-col items-center gap-2 text-sm">
                <span className="flex size-10 items-center justify-center rounded-xl bg-panel text-brand-strong shadow-sm">
                  <f.icon aria-hidden="true" className="size-5" />
                </span>
                {pick(language, f.bn, f.en)}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-10 text-sm text-muted">{t('welcome.note')}</p>
      </div>
    </main>
  );
}

const DETAILS: Record<string, { bn: string; en: string }> = {
  'Measurement book': { bn: 'প্রত্যেক কাস্টমারের মাপ, পোশাক ধরে', en: 'Every customer’s measurements, by garment' },
  'Orders and delivery': { bn: 'ট্রায়াল আর ডেলিভারির তারিখসহ', en: 'With trial and delivery dates' },
  'Balances and payments': { bn: 'কে কত দিল, কত বাকি', en: 'Who paid what, and what is still due' },
  'Work list': { bn: 'কে কী সেলাই করছে, কোন ধাপে', en: 'Who is making what, at which stage' },
  'Receipts, slips and tags': { bn: 'রসিদ, কাজের স্লিপ, কাপড়ের ট্যাগ', en: 'Receipts, job slips and fabric tags' },
  'Works offline': { bn: 'নেট ফিরলে নিজে মিলিয়ে নেয়', en: 'Syncs by itself when the internet is back' },
};

const TRY_HERE: Record<SeedShopKey, Array<{ bn: string; en: string }>> = {
  rahman: [
    { bn: 'মাপ নিয়ে নতুন অর্ডার', en: 'Take measurements and an order' },
    { bn: 'রসিদ প্রিন্ট', en: 'Print a receipt' },
    { bn: 'বাকি টাকা আদায়', en: 'Collect a balance' },
  ],
  nakshi: [
    { bn: 'ট্রায়াল আর QC', en: 'Trials and QC' },
    { bn: 'আলাদা স্টাফ হয়ে ঢোকা', en: 'Sign in as different staff' },
    { bn: 'মেয়েদের মাপ গোপন রাখা', en: 'Keep women’s measurements private' },
  ],
  uniform: [
    { bn: 'স্কুলের গ্রুপ অর্ডার', en: 'A school group order' },
    { bn: 'দোকান আর কারখানা', en: 'Shop and workshop' },
    { bn: 'অনেক কাপড়ের ট্যাগ', en: 'Tags for a big order' },
  ],
};

/** E's page with the subtitle on one line; `children` is how "what you can try" shows. */
function CentredBase({ props, children, perShop }: { props: WelcomeScreenProps; children?: ReactNode; perShop?: (shop: SeedShopInfo) => ReactNode }) {
  const { t, label } = useI18n();
  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-soft to-surface px-12 py-6">
      <div className="ms-auto">
        <LanguageToggle />
      </div>
      <div className="mx-auto mt-[6vh] flex w-full max-w-5xl flex-col items-center text-center">
        <BrandMark size={64} />
        <h1 className="mt-5 font-display text-5xl font-bold">{t('welcome.title')}</h1>
        <p className="mt-3 text-lg whitespace-nowrap text-muted">{t('welcome.subtitle')}</p>
        <ul className="m-0 mt-10 grid w-full list-none grid-cols-3 gap-4 p-0">
          {SEED_SHOPS.map((shop) => (
            <li key={shop.key}>
              <button
                type="button"
                disabled={props.opening !== null}
                onClick={() => props.onOpen(shop.key)}
                aria-label={`${t('welcome.open')}: ${label(shop.name)}`}
                className="group flex h-full w-full flex-col items-center gap-3 rounded-3xl border border-line bg-panel px-5 py-7 text-center shadow-sm transition-shadow hover:border-brand hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
              >
                <ShopIcon shop={shop} big />
                <span className="font-display text-xl font-bold">{label(shop.name)}</span>
                <span className="text-sm text-muted">{label(shop.summary)}</span>
                {perShop?.(shop)}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand-strong">
                  {t('welcome.open')}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {children}
        <p className="mt-10 text-sm text-muted">{t('welcome.note')}</p>
      </div>
    </main>
  );
}

const tryLabel = (language: Language) => pick(language, 'যা যা করে দেখতে পারেন', 'What you can try');

/** F: features as a row of chips, the label on the same line. */
function CentredChips(props: WelcomeScreenProps) {
  const { language } = useI18n();
  return (
    <CentredBase props={props}>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        <span className="me-2 text-sm font-semibold text-muted">{tryLabel(language)}:</span>
        {FEATURES.map((f) => (
          <span key={f.en} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-sm">
            <f.icon aria-hidden="true" className="size-4 text-brand-strong" />
            {pick(language, f.bn, f.en)}
          </span>
        ))}
      </div>
    </CentredBase>
  );
}

/** G: features as six small cards, each with a line on what it does. */
function CentredCards(props: WelcomeScreenProps) {
  const { language } = useI18n();
  return (
    <CentredBase props={props}>
      <section className="mt-12 w-full text-start">
        <h2 className="mb-4 text-center font-display text-xl font-bold">{tryLabel(language)}</h2>
        <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
          {FEATURES.map((f) => (
            <li key={f.en} className="flex items-start gap-3 rounded-2xl bg-panel/70 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                <f.icon aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{pick(language, f.bn, f.en)}</span>
                <span className="block text-sm text-muted">{pick(language, DETAILS[f.en]!.bn, DETAILS[f.en]!.en)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </CentredBase>
  );
}

/** H: no strip; each shop card says what to try in that shop. */
function CentredPerShop(props: WelcomeScreenProps) {
  const { language } = useI18n();
  return (
    <CentredBase
      props={props}
      perShop={(shop) => (
        <span className="mt-1 w-full border-t border-line pt-3 text-start">
          <span className="mb-1.5 block text-xs font-semibold text-muted">{pick(language, 'এখানে করে দেখুন', 'Try here')}</span>
          {TRY_HERE[shop.key].map((item) => (
            <span key={item.en} className="flex items-center gap-2 py-0.5 text-sm">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand" />
              {pick(language, item.bn, item.en)}
            </span>
          ))}
        </span>
      )}
    />
  );
}

/** I: features as a single white bar split into six, icon beside the words. */
function CentredBar(props: WelcomeScreenProps) {
  const { language } = useI18n();
  return (
    <CentredBase props={props}>
      <section aria-label={tryLabel(language)} className="mt-10 w-full">
        <ul className="m-0 grid list-none grid-cols-6 divide-x divide-line overflow-hidden rounded-2xl border border-line bg-panel p-0 shadow-sm rtl:divide-x-reverse">
          {FEATURES.map((f) => (
            <li key={f.en} className="flex items-center justify-center gap-2 px-3 py-4 text-sm">
              <f.icon aria-hidden="true" className="size-5 shrink-0 text-brand-strong" />
              <span className="text-start leading-tight">{pick(language, f.bn, f.en)}</span>
            </li>
          ))}
        </ul>
      </section>
    </CentredBase>
  );
}

export function WelcomeScreen(props: WelcomeScreenProps): ReactNode {
  if (props.variant === 'F') return <CentredChips {...props} />;
  if (props.variant === 'G') return <CentredCards {...props} />;
  if (props.variant === 'H') return <CentredPerShop {...props} />;
  if (props.variant === 'I') return <CentredBar {...props} />;
  if (props.variant === 'B') return <Split {...props} />;
  if (props.variant === 'C') return <Columns {...props} />;
  if (props.variant === 'D') return <PickPreview {...props} />;
  if (props.variant === 'E') return <Centred {...props} />;
  return null;
}
