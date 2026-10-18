"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { fmt, get, post, REASONS, toman, type ArticleFull, type Meta } from "@/lib/core";
import { useLang } from "./Shell";
import { Cover, Icon, Spinner } from "./ui";

const spring = { type: "spring", bounce: 0.15, duration: 0.5 } as const;

export default function Reader({ initial, meta }: { initial: ArticleFull; meta: Meta }) {
  const { lang, t } = useLang();
  const [a, setA] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 30 });
  const pub = meta.publishers[a.publisher];
  const short = a.authed && a.locked && a.balance < a.price;
  const router = useRouter();
  const loginHref = `/login?next=${encodeURIComponent(`/article/${a.id}`)}`;

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [sheet]);

  async function act(run: () => Promise<ArticleFull>, done?: string) {
    setBusy(true);
    try {
      setA(await run());
      if (done) setToast(done);
      router.refresh(); // header balance
    } catch (e) {
      const m = (e as Error).message;
      if (m === "login_required") return router.push(loginHref);
      setToast(t.errors[m] ?? t.errors.generic);
    } finally {
      setBusy(false);
      setSheet(false);
    }
  }

  return (
    <>
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-linear-to-r from-accent to-accent-2 rtl:origin-right" />

      <Link href="/" className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-muted hover:text-fg">
        <Icon name="back" className="size-4 rtl:rotate-180" />{t.back}
      </Link>

      <Cover id={a.id} hue={pub.hue} className="mt-3 aspect-[4/3] rounded-[32px] sm:aspect-[21/9]">
        <div className="absolute bottom-5 start-5 flex gap-2">
          <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">{meta.topics[a.topic][lang]}</span>
          <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">{pub[lang]}</span>
        </div>
      </Cover>

      <header className="mx-auto mt-8 max-w-3xl">
        <h1 className="display text-4xl md:text-6xl">{a.title[lang]}</h1>
        <p className="mt-4 text-xl text-muted md:text-2xl">{a.dek[lang]}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-6 text-sm text-muted">
          <span className="font-semibold text-fg">{pub[lang]}</span>
          <span className="flex items-center gap-1.5"><Icon name="clock" className="size-4" />{t.minRead(fmt(a.minutes, lang))}</span>
          <span className={`ms-auto rounded-full px-3 py-1 font-bold ${a.owned ? "bg-good/15 text-good" : "bg-fg/[.07] text-fg"}`}>
            {a.owned ? t.owned : toman(a.price, lang)}
          </span>
        </div>
      </header>

      <article className="reading mx-auto mt-8 max-w-3xl space-y-6">
        {a.body[lang].map((p, i) => (
          <motion.p key={`${lang}-${i}`} className={a.locked ? "fade-out" : ""}
            initial={i ? { opacity: 0, y: 18, filter: "blur(8px)" } : false}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ ...spring, duration: 0.8, delay: (i - 1) * 0.1 }}>
            {p}
          </motion.p>
        ))}
      </article>

      <AnimatePresence mode="wait">
        {a.locked ? (
          <motion.section key="pay" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} transition={spring}
            className="glass relative mx-auto mt-2 max-w-xl overflow-hidden rounded-[32px] p-6 text-center md:p-9">
            <div aria-hidden className="absolute -top-28 start-1/2 size-72 -translate-x-1/2 rounded-full bg-accent/30 blur-3xl rtl:translate-x-1/2" />
            <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-fg text-bg"><Icon name="lock" className="size-6" /></div>
            <h2 className="relative mt-5 text-2xl font-extrabold md:text-3xl">{t.paywall.title}</h2>
            <p className="relative mt-2 text-muted">{t.paywall.sub}</p>
            {!a.authed ? (
              <Link href={loginHref} className="relative mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-linear-to-r from-accent to-accent-2 text-lg font-bold text-white shadow-lg shadow-accent/30 active:scale-[.97]">
                {t.auth.toBuy}
              </Link>
            ) : short ? (
              <>
                <p className="relative mt-5 text-sm font-semibold text-accent-2">{t.paywall.short}</p>
                <Link href="/wallet" className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-fg py-4 text-lg font-bold text-bg active:scale-[.97]">
                  <Icon name="plus" />{t.paywall.topup}
                </Link>
              </>
            ) : (
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => act(() => post(`/api/articles/${a.id}/buy`))} disabled={busy}
                className="relative mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-linear-to-r from-accent to-accent-2 text-lg font-bold text-white shadow-lg shadow-accent/30 disabled:opacity-70">
                {busy ? <Spinner /> : t.paywall.buy(toman(a.price, lang))}
              </motion.button>
            )}
            {a.authed && <p className="relative mt-3 text-sm text-muted">{t.paywall.balance}: <b className="text-fg">{toman(a.balance, lang)}</b></p>}
            <div className="relative mt-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />{t.sub.or}<span className="h-px flex-1 bg-line" /></div>
            <motion.button whileTap={{ scale: 0.97 }} disabled={busy}
              onClick={() => a.authed
                ? act(() => post("/api/subscriptions", { topic: a.topic }).then(() => get<ArticleFull>(`/api/articles/${a.id}`)), t.sub.done)
                : router.push(loginHref)}
              className="relative mt-4 flex w-full items-center gap-3 rounded-2xl border border-line p-4 text-start text-sm font-semibold hover:bg-fg/[.04]">
              <Icon name="star" className="size-5 shrink-0 text-accent-3" />
              <span className="flex-1">{t.sub.pitch(meta.topics[a.topic][lang], toman(a.sub_price, lang))}</span>
            </motion.button>
          </motion.section>
        ) : a.refundable ? (
          <motion.section key="refund" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ...spring, delay: 0.4 }}
            className="glass mx-auto mt-12 flex max-w-3xl items-center gap-4 rounded-3xl p-4 ps-5">
            <Icon name="shield" className="size-7 shrink-0 text-good" />
            <div className="flex-1 text-sm">
              <b className="text-base">{t.refund.q}</b>
              <div className="text-muted">{t.refund.hint}</div>
            </div>
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => { setReason(null); setSheet(true); }}
              className="shrink-0 rounded-full bg-fg/[.07] px-4 py-2.5 text-sm font-bold hover:bg-fg/[.12]">{t.refund.cta}</motion.button>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {sheet && (
          <>
            <motion.div key="scrim" className="fixed inset-0 z-50 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div key="sheet" role="dialog" aria-modal="true" aria-label={t.refund.title}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[32px] border border-line bg-solid/95 p-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-2xl backdrop-blur-2xl sm:bottom-6 sm:rounded-[32px]"
              initial={{ y: "110%" }} animate={{ y: 0 }} exit={{ y: "110%" }} transition={{ type: "spring", bounce: 0.12, duration: 0.5 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.04, bottom: 0.7 }}
              onDragEnd={(_, i) => (i.offset.y > 110 || i.velocity.y > 500) && setSheet(false)}>
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-fg/20" />
              <h3 className="text-xl font-extrabold">{t.refund.title}</h3>
              <p className="mt-1 text-sm text-muted">{t.refund.sub}</p>
              <div className="mt-5 grid gap-2" role="radiogroup">
                {REASONS.map((r) => (
                  <button key={r} role="radio" aria-checked={reason === r} onClick={() => setReason(r)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-start font-semibold transition-colors ${reason === r ? "border-accent bg-accent/10 text-accent" : "border-line hover:bg-fg/[.04]"}`}>
                    {t.reasons[r]}
                    {reason === r && <Icon name="check" className="size-5" />}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setSheet(false)} className="flex-1 rounded-2xl bg-fg/[.07] py-3.5 font-bold">{t.cancel}</button>
                <motion.button whileTap={{ scale: 0.96 }} disabled={!reason || busy}
                  onClick={() => act(() => post(`/api/articles/${a.id}/refund`, { reason }), t.refund.done)}
                  className="flex flex-[2] items-center justify-center rounded-2xl bg-fg py-3.5 font-bold text-bg disabled:opacity-40">
                  {busy ? <Spinner /> : t.refund.confirm(toman(a.price, lang))}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={spring} className="fixed inset-x-0 bottom-28 z-[60] mx-auto w-fit max-w-[90vw] rounded-full bg-fg px-5 py-3 text-sm font-semibold text-bg shadow-2xl md:bottom-8">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
