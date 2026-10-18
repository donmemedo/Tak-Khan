// Client-safe shared code: types, dictionary (fa/en), formatting, POST helper.
export type Lang = "fa" | "en";
export type L10n = Record<Lang, string>;

export type Article = {
  id: string; publisher: string; topic: string; price: number; minutes: number; sold: number;
  title: L10n; dek: L10n; owned: boolean; purchased: boolean;
};
export type ArticleFull = Article & {
  body: Record<Lang, string[]>; locked: boolean; refundable: boolean; balance: number; authed: boolean; sub_price: number;
};
export type Pack = L10n & { amount: number };
export type Meta = {
  topics: Record<string, L10n>;
  publishers: Record<string, L10n & { hue: number }>;
  packs: Record<string, Pack>;
  sub_price: number;
  gifts: number[];
};
export type TxKind = "purchase" | "refund" | "topup" | "welcome" | "subscription" | "gift_sent" | "gift_received";
export type Tx = { id: number; kind: TxKind; amount: number; ref: string; ts: number; title: L10n | null };
export type WalletData = {
  balance: number; tx: Tx[]; packs: Record<string, Pack>;
  gifts: { code: string; amount: number; redeemed: number }[]; gift_amounts: number[];
};
export type Me = { phone: string; balance: number };
export type Sub = { topic: string; expires: number };
export type Stats = {
  gross: number; publisher_share: number; platform_share: number; sales: number;
  publishers: (L10n & { id: string; hue: number; sales: number; gross: number; share: number; articles: number })[];
  top: { id: string; title: L10n; publisher: string; revenue: number }[];
};

export const REASONS = ["not_interesting", "misleading", "low_quality", "already_read", "other"] as const;
export const AVG_PRICE = 13_000;

const fa = {
  brand: "خوانا",
  nav: { discover: "کشف", library: "کتابخانه", wallet: "کیف پول", publishers: "ناشران" },
  theme: { system: "خودکار", light: "روشن", dark: "تیره" },
  otherLang: "English",
  hero: {
    badge: "بازپرداخت کامل تا ۲۴ ساعت",
    a: "فقط برای همان چیزی که می‌خوانید،",
    b: "بپردازید.",
    sub: "مقاله‌های منتخب از بهترین رسانه‌های فارسی، بدون اشتراک اجباری. اگر نپسندیدید، پولتان به کیف پول برمی‌گردد.",
    publishers: "ناشر همکار", articles: "مقاله‌ی منتخب", share: "سهم ناشر از هر خرید",
  },
  search: "جستجو در مقاله‌ها",
  all: "همه",
  empty: "مقاله‌ای پیدا نشد. عبارت دیگری را جستجو کنید.",
  minRead: (n: string) => `${n} دقیقه`,
  owned: "خریداری‌شده",
  back: "بازگشت",
  cancel: "انصراف",
  toman: "تومان",
  paywall: {
    title: "ادامه‌ی این مقاله را بخوانید",
    sub: "یک بار بپردازید و برای همیشه در کتابخانه‌تان نگه دارید. اگر نپسندیدید، تا ۲۴ ساعت مبلغ کامل برمی‌گردد.",
    buy: (p: string) => `خرید با ${p}`,
    balance: "موجودی شما",
    short: "موجودی کیف پول برای این مقاله کافی نیست.",
    topup: "افزایش اعتبار",
  },
  refund: {
    q: "این مقاله را نپسندیدید؟",
    hint: "تا ۲۴ ساعت بعد از خرید، مبلغ کامل به کیف پولتان برمی‌گردد.",
    cta: "بازپرداخت",
    title: "چرا این مقاله را نپسندیدید؟",
    sub: "پاسخ شما به ناشر کمک می‌کند محتوای بهتری بنویسد.",
    confirm: (p: string) => `بازپرداخت ${p}`,
    done: "مبلغ به کیف پول شما برگشت",
  },
  reasons: {
    not_interesting: "جذاب نبود", misleading: "تیتر گمراه‌کننده بود", low_quality: "کیفیت پایینی داشت",
    already_read: "قبلاً خوانده بودم", other: "دلیل دیگر",
  },
  auth: {
    login: "ورود", logout: "خروج",
    title: "ورود یا ثبت‌نام",
    sub: "شماره موبایل خود را وارد کنید تا کد تایید برایتان پیامک شود.",
    phone: "شماره موبایل", send: "دریافت کد تایید",
    codeTitle: "کد تایید را وارد کنید",
    codeSub: (p: string) => `کد ۵ رقمی به ${p} پیامک شد.`,
    code: "کد تایید", verify: "تایید و ورود", edit: "ویرایش شماره", resend: "ارسال دوباره کد",
    resendIn: (s: string) => `ارسال دوباره تا ${s} ثانیه`,
    demo: (c: string) => `کد آزمایشی: ${c}`,
    welcome: "۶۰٬۰۰۰ تومان اعتبار هدیه برای اولین ورود",
    terms: "ورود شما به معنای پذیرش شرایط استفاده و حریم خصوصی خواناست.",
    toBuy: "ورود و خرید",
  },
  sub: {
    pitch: (t: string, p: string) => `اشتراک ماهانه‌ی ${t}: همه‌ی مقاله‌های این موضوع، ۳۰ روز، با ${p}`,
    cta: "اشتراک", or: "یا",
    active: (t: string, d: string) => `اشتراک ${t} فعال است تا ${d}`,
    done: "اشتراک فعال شد",
    mine: "اشتراک‌های من", renew: "تمدید",
    until: (d: string) => `تا ${d}`,
  },
  gift: {
    title: "کارت هدیه",
    sub: "اعتبار مطالعه هدیه بدهید یا کارت هدیه‌ی خود را فعال کنید.",
    make: "ساخت کارت هدیه",
    made: "کارت هدیه ساخته شد. این کد را برای دوستتان بفرستید:",
    copy: "کپی", copied: "کپی شد",
    code: "کد کارت هدیه", redeem: "فعال‌سازی", redeemed: "کارت هدیه فعال شد",
    mine: "کارت‌های ساخته‌شده", used: "استفاده‌شده", unused: "استفاده‌نشده",
  },
  forYou: "پیشنهاد برای شما",
  forYouSub: "بر اساس موضوع‌هایی که می‌خوانید",
  state: {
    error: "مشکلی پیش آمد", errorSub: "ارتباط با سرور برقرار نشد. چند لحظه بعد دوباره امتحان کنید.", retry: "تلاش دوباره",
    notFound: "این صفحه پیدا نشد", notFoundSub: "شاید این صفحه جابه‌جا یا حذف شده باشد.", home: "بازگشت به صفحه اصلی",
  },
  errors: {
    login_required: "برای ادامه وارد شوید", invalid_phone: "شماره موبایل نادرست است",
    otp_cooldown: "کمی صبر کنید و دوباره درخواست دهید", otp_expired: "کد منقضی شده است. کد جدید بگیرید.",
    otp_wrong: "کد تایید نادرست است", invalid_code: "کد کارت هدیه نادرست است یا قبلاً استفاده شده",
    insufficient_balance: "موجودی کافی نیست", already_owned: "این مقاله را قبلاً خریده‌اید",
    not_refundable: "این خرید دیگر قابل بازپرداخت نیست", refund_limit: "به سقف بازپرداخت این ماه رسیده‌اید",
    generic: "مشکلی پیش آمد. دوباره امتحان کنید.",
  } as Record<string, string>,
  wallet: {
    title: "کیف پول",
    balance: "موجودی",
    card: "کارت مطالعه",
    approx: (n: string) => `حدود ${n} مقاله`,
    packs: "افزایش اعتبار",
    packsSub: "یک بسته انتخاب کنید. اعتبار شما هرگز منقضی نمی‌شود.",
    add: "افزودن",
    added: "اضافه شد",
    popular: "محبوب",
    history: "تاریخچه تراکنش‌ها",
    none: "هنوز تراکنشی ندارید",
    kind: {
      purchase: "خرید مقاله", refund: "بازپرداخت", topup: "افزایش اعتبار", welcome: "اعتبار هدیه خوش‌آمد",
      subscription: "اشتراک موضوعی", gift_sent: "ساخت کارت هدیه", gift_received: "فعال‌سازی کارت هدیه",
    } as Record<TxKind, string>,
  },
  lib: {
    title: "کتابخانه من",
    sub: "مقاله‌هایی که خریده‌اید، همیشه اینجا هستند.",
    empty: "هنوز مقاله‌ای نخریده‌اید",
    cta: "کشف مقاله‌ها",
  },
  pub: {
    title: "پیش‌خوان ناشران",
    sub: "شفافیت کامل در تقسیم درآمد: ۷۰٪ برای ناشر، ۳۰٪ برای خوانا.",
    gross: "فروش کل", share: "سهم ناشران", platform: "سهم خوانا", sales: "تعداد فروش",
    split: "تقسیم درآمد", byPublisher: "درآمد به تفکیک ناشر", top: "پرفروش‌ترین مقاله‌ها",
    articles: (n: string) => `${n} مقاله`,
  },
};

const en: typeof fa = {
  brand: "Khana",
  nav: { discover: "Discover", library: "Library", wallet: "Wallet", publishers: "Publishers" },
  theme: { system: "Automatic", light: "Light", dark: "Dark" },
  otherLang: "فارسی",
  hero: {
    badge: "Full refund within 24 hours",
    a: "Pay only for",
    b: "what you read.",
    sub: "Hand-picked articles from the best Persian publishers. No forced subscriptions. Not for you? Your money goes straight back to your wallet.",
    publishers: "partner publishers", articles: "curated articles", share: "of every sale to the publisher",
  },
  search: "Search articles",
  all: "All",
  empty: "No articles found. Try another search.",
  minRead: (n) => `${n} min`,
  owned: "Owned",
  back: "Back",
  cancel: "Cancel",
  toman: "Toman",
  paywall: {
    title: "Keep reading",
    sub: "Pay once and keep it in your library forever. Not for you? Get a full refund within 24 hours.",
    buy: (p) => `Buy for ${p}`,
    balance: "Your balance",
    short: "Your wallet balance isn't enough for this article.",
    topup: "Top up",
  },
  refund: {
    q: "Not for you?",
    hint: "Get the full amount back to your wallet within 24 hours of buying.",
    cta: "Refund",
    title: "Why wasn't it for you?",
    sub: "Your answer helps the publisher write better stories.",
    confirm: (p) => `Refund ${p}`,
    done: "Refunded to your wallet",
  },
  reasons: {
    not_interesting: "Not interesting", misleading: "Misleading headline", low_quality: "Low quality",
    already_read: "Already read it", other: "Something else",
  },
  auth: {
    login: "Log in", logout: "Log out",
    title: "Log in or sign up",
    sub: "Enter your mobile number and we'll text you a verification code.",
    phone: "Mobile number", send: "Get verification code",
    codeTitle: "Enter the verification code",
    codeSub: (p) => `We texted a 5-digit code to ${p}.`,
    code: "Verification code", verify: "Verify and log in", edit: "Change number", resend: "Resend code",
    resendIn: (s) => `Resend in ${s}s`,
    demo: (c) => `Demo code: ${c}`,
    welcome: "60,000 Toman welcome credit on your first login",
    terms: "By logging in you agree to Khana's terms of service and privacy policy.",
    toBuy: "Log in to buy",
  },
  sub: {
    pitch: (t, p) => `${t} monthly pass: every article in this topic for 30 days, ${p}`,
    cta: "Subscribe", or: "or",
    active: (t, d) => `Your ${t} pass is active until ${d}`,
    done: "Subscription activated",
    mine: "My subscriptions", renew: "Renew",
    until: (d) => `Until ${d}`,
  },
  gift: {
    title: "Gift card",
    sub: "Give reading credit, or redeem a gift card you received.",
    make: "Create gift card",
    made: "Gift card created. Send this code to your friend:",
    copy: "Copy", copied: "Copied",
    code: "Gift card code", redeem: "Redeem", redeemed: "Gift card redeemed",
    mine: "Cards you created", used: "Used", unused: "Unused",
  },
  forYou: "Picked for you",
  forYouSub: "Based on the topics you read",
  state: {
    error: "Something went wrong", errorSub: "We couldn't reach the server. Please try again in a moment.", retry: "Try again",
    notFound: "Page not found", notFoundSub: "This page may have moved or been removed.", home: "Back to home",
  },
  errors: {
    login_required: "Please log in to continue", invalid_phone: "That mobile number isn't valid",
    otp_cooldown: "Please wait a moment before requesting again", otp_expired: "The code has expired. Request a new one.",
    otp_wrong: "That verification code isn't right", invalid_code: "This gift code is invalid or already used",
    insufficient_balance: "Not enough balance", already_owned: "You already own this article",
    not_refundable: "This purchase can no longer be refunded", refund_limit: "You've reached this month's refund limit",
    generic: "Something went wrong. Please try again.",
  },
  wallet: {
    title: "Wallet",
    balance: "Balance",
    card: "Reading card",
    approx: (n) => `About ${n} articles`,
    packs: "Top up",
    packsSub: "Pick a pack. Your credit never expires.",
    add: "Add",
    added: "Added",
    popular: "Popular",
    history: "Transaction history",
    none: "No transactions yet",
    kind: {
      purchase: "Article purchase", refund: "Refund", topup: "Top-up", welcome: "Welcome credit",
      subscription: "Topic subscription", gift_sent: "Gift card created", gift_received: "Gift card redeemed",
    },
  },
  lib: {
    title: "My library",
    sub: "Everything you've bought, always here.",
    empty: "You haven't bought any articles yet",
    cta: "Discover articles",
  },
  pub: {
    title: "Publisher dashboard",
    sub: "Fully transparent revenue split: 70% to the publisher, 30% to Khana.",
    gross: "Gross sales", share: "Publishers' share", platform: "Khana's share", sales: "Articles sold",
    split: "Revenue split", byPublisher: "Revenue by publisher", top: "Top-selling articles",
    articles: (n) => `${n} articles`,
  },
};

export const dict = { fa, en };
export type Dict = typeof fa;

const locale = (lang: Lang) => (lang === "fa" ? "fa-IR" : "en-US");
export const fmt = (n: number, lang: Lang, compact = false) =>
  new Intl.NumberFormat(locale(lang), compact ? { notation: "compact", maximumFractionDigits: 1 } : {}).format(n);
export const toman = (n: number, lang: Lang, compact = false) => `${fmt(n, lang, compact)} ${dict[lang].toman}`;
export const date = (ts: number, lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium", timeStyle: "short" }).format(ts * 1000);

export const day = (ts: number, lang: Lang) => new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium" }).format(ts * 1000);
export const digits = (s: string, lang: Lang) => (lang === "fa" ? s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : s);
export const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
export const safeNext = (n?: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function get<T>(path: string): Promise<T> {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error("generic");
  return r.json();
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.detail === "string" ? j.detail : "generic");
  return j as T;
}
