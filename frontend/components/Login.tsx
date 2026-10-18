"use client";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { digits, fmt, post, toLatin } from "@/lib/core";
import { useLang } from "./Shell";
import { Icon, Spinner } from "./ui";

const spring = { type: "spring", bounce: 0.15, duration: 0.45 } as const;
const field = "w-full rounded-2xl border border-line bg-solid/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";
const primary = "mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-linear-to-r from-accent to-accent-2 text-lg font-bold text-white shadow-lg shadow-accent/25 transition active:scale-[.97] disabled:opacity-50";

export default function Login({ next }: { next: string }) {
  const { lang, t } = useLang();
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demo, setDemo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const slide = lang === "fa" ? -40 : 40;

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await post<{ phone: string; cooldown: number; demo_code?: string }>("/api/auth/otp", { phone });
      setPhone(r.phone);
      setDemo(r.demo_code ?? null);
      setLeft(r.cooldown);
      setCode("");
      setStep("code");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(c = code) {
    setBusy(true);
    setErr(null);
    try {
      await post("/api/auth/verify", { phone, code: c });
      router.replace(next);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setCode("");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[70dvh] max-w-md place-items-center">
      <motion.div layout transition={spring} className="glass relative w-full overflow-hidden rounded-[32px] p-7 md:p-9">
        <div aria-hidden className="absolute -top-24 end-[-20%] size-64 rounded-full bg-accent/25 blur-3xl" />
        <span className="relative grid size-14 place-items-center rounded-2xl bg-linear-to-br from-accent via-accent-2 to-accent-3 text-2xl font-black text-white shadow-lg">
          {lang === "fa" ? "خ" : "K"}
        </span>

        <AnimatePresence mode="wait" initial={false}>
          {step === "phone" ? (
            <motion.form key="phone" onSubmit={send} className="relative mt-6"
              initial={{ opacity: 0, x: -slide }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -slide }} transition={spring}>
              <h1 className="text-3xl font-extrabold">{t.auth.title}</h1>
              <p className="mt-2 text-muted">{t.auth.sub}</p>
              <label htmlFor="phone" className="mt-6 block text-sm font-semibold">{t.auth.phone}</label>
              <input id="phone" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" autoFocus required maxLength={16}
                value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={digits("09123456789", lang)}
                className={`${field} mt-2 h-14 px-4 text-center text-xl font-bold tracking-wider`} />
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-good"><Icon name="gift" className="size-4" />{t.auth.welcome}</p>
              <button type="submit" disabled={busy || toLatin(phone).replace(/\D/g, "").length < 10} className={primary}>
                {busy ? <Spinner /> : t.auth.send}
              </button>
              <p className="mt-4 text-center text-xs text-muted">{t.auth.terms}</p>
            </motion.form>
          ) : (
            <motion.form key="code" onSubmit={(e) => { e.preventDefault(); verify(); }} className="relative mt-6"
              initial={{ opacity: 0, x: slide }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: slide }} transition={spring}>
              <h1 className="text-3xl font-extrabold">{t.auth.codeTitle}</h1>
              <p className="mt-2 text-muted">{t.auth.codeSub(digits(phone, lang))}</p>
              <label htmlFor="otp" className="sr-only">{t.auth.code}</label>
              <input id="otp" dir="ltr" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code}
                onChange={(e) => {
                  const v = toLatin(e.target.value).replace(/\D/g, "").slice(0, 5);
                  setCode(v);
                  if (v.length === 5) verify(v);
                }}
                className={`${field} mt-6 h-16 text-center text-3xl font-black tracking-[.5em]`} />
              {demo && (
                <button type="button" onClick={() => { setCode(demo); verify(demo); }}
                  className="mt-3 rounded-full bg-accent/10 px-3 py-1.5 text-sm font-bold text-accent">
                  {t.auth.demo(digits(demo, lang))}
                </button>
              )}
              <button type="submit" disabled={busy || code.length < 5} className={primary}>{busy ? <Spinner /> : t.auth.verify}</button>
              <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                <button type="button" onClick={() => { setStep("phone"); setErr(null); }} className="text-muted hover:text-fg">{t.auth.edit}</button>
                <button type="button" onClick={() => send()} disabled={left > 0 || busy} className="text-accent disabled:text-muted">
                  {left > 0 ? t.auth.resendIn(fmt(left, lang)) : t.auth.resend}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {err && (
          <motion.p key={err + code} role="alert" initial={{ x: 0 }} animate={{ x: [0, -8, 8, -4, 4, 0] }} transition={{ duration: 0.4 }}
            className="relative mt-4 flex items-center gap-2 text-sm font-semibold text-accent-2">
            <Icon name="alert" className="size-4 shrink-0" />{t.errors[err] ?? t.errors.generic}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
