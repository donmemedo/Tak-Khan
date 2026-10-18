"use client";
import { AnimatePresence, motion, useSpring, useTransform } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AVG_PRICE, date, fmt, post, toman, type TxKind, type WalletData } from "@/lib/core";
import { useLang } from "./Shell";
import { Icon, Spinner, Tilt } from "./ui";

const KIND_ICON: Record<TxKind, string> = {
  purchase: "book", refund: "undo", topup: "plus", welcome: "gift", subscription: "star", gift_sent: "gift", gift_received: "gift",
};
const field = "rounded-2xl border border-line bg-solid/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";

export default function Wallet({ initial }: { initial: WalletData }) {
  const { lang, t } = useLang();
  const [w, setW] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [amt, setAmt] = useState(initial.gift_amounts[1] ?? initial.gift_amounts[0]);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const router = useRouter();
  const bal = useSpring(initial.balance, { stiffness: 70, damping: 18 });
  const shown = useTransform(bal, (v) => fmt(Math.round(v), lang));

  useEffect(() => { bal.set(w.balance); }, [w.balance, bal]);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(null), 1600);
    return () => clearTimeout(id);
  }, [done]);

  async function add(pack: string) {
    setBusy(pack);
    try { setW(await post<WalletData>("/api/wallet/topup", { pack })); setDone(pack); router.refresh(); }
    finally { setBusy(null); }
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setMsg(null);
    try { await fn(); router.refresh(); }
    catch (e) { setMsg({ text: t.errors[(e as Error).message] ?? t.errors.generic, ok: false }); }
    finally { setBusy(null); }
  }
  const makeGift = () => run("gift", async () => {
    const r = await post<WalletData & { code: string }>("/api/gifts", { amount: amt });
    setW(r);
    setCode(r.code);
    setCopied(false);
  });
  const redeem = (e: FormEvent) => {
    e.preventDefault();
    run("redeem", async () => {
      setW(await post<WalletData>("/api/gifts/redeem", { code: redeemCode }));
      setRedeemCode("");
      setMsg({ text: t.gift.redeemed, ok: true });
    });
  };
  const copy = async (c: string) => {
    try { await navigator.clipboard.writeText(c); setCopied(true); } catch {}
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="lg:sticky lg:top-28">
        <h1 className="display text-4xl md:text-6xl">{t.wallet.title}</h1>
        <Tilt max={9} className="mt-8 w-full max-w-md rounded-[28px]">
          <div className="relative aspect-[1.586] overflow-hidden rounded-[28px] p-6 text-white shadow-2xl shadow-accent/30 md:p-7"
            style={{ background: "radial-gradient(110% 120% at 0% 0%, #8e80ff 0%, transparent 55%), radial-gradient(100% 120% at 100% 100%, #ff3d7f 0%, transparent 55%), radial-gradient(60% 60% at 80% 10%, #ffae2b 0%, transparent 60%), linear-gradient(135deg, #1a1540, #3b1450)" }}>
            <div className="grain absolute inset-0" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xl font-black">{t.brand}</span>
                <span className="text-xs font-semibold opacity-80">{t.wallet.card}</span>
              </div>
              <div>
                <div className="text-sm opacity-75">{t.wallet.balance}</div>
                <div className="mt-1 flex items-baseline gap-2 text-4xl font-black tabular-nums md:text-5xl">
                  <motion.span>{shown}</motion.span>
                  <span className="text-base font-semibold opacity-80">{t.toman}</span>
                </div>
                <div className="mt-1 text-sm opacity-75">{t.wallet.approx(fmt(Math.floor(w.balance / AVG_PRICE), lang))}</div>
              </div>
            </div>
          </div>
        </Tilt>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-extrabold">{t.wallet.packs}</h2>
          <p className="mt-1 text-muted">{t.wallet.packsSub}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {Object.entries(w.packs).map(([id, p]) => {
              const hot = id === "monthly";
              return (
                <motion.button key={id} whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }} onClick={() => add(id)} disabled={!!busy}
                  className={`glass relative flex flex-col items-start gap-1 rounded-3xl p-5 text-start ${hot ? "ring-2 ring-accent" : ""}`}>
                  {hot && <span className="absolute -top-2.5 end-4 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">{t.wallet.popular}</span>}
                  <span className="text-sm font-semibold text-muted">{p[lang]}</span>
                  <span className="text-2xl font-black tabular-nums">{fmt(p.amount, lang)}</span>
                  <span className="text-xs text-muted">{t.toman} · {t.wallet.approx(fmt(Math.floor(p.amount / AVG_PRICE), lang))}</span>
                  <span className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-bold transition-colors ${done === id ? "bg-good text-white" : "bg-fg text-bg"}`}>
                    {busy === id ? <Spinner /> : done === id ? <><Icon name="check" className="size-4" />{t.wallet.added}</> : <><Icon name="plus" className="size-4" />{t.wallet.add}</>}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-extrabold">{t.gift.title}</h2>
          <p className="mt-1 text-muted">{t.gift.sub}</p>
          <div className="glass mt-5 space-y-5 rounded-3xl p-5">
            <div className="flex flex-wrap items-center gap-2" role="radiogroup">
              {w.gift_amounts.map((v) => (
                <button key={v} role="radio" aria-checked={amt === v} onClick={() => setAmt(v)}
                  className={`relative rounded-full px-4 py-2 text-sm font-bold tabular-nums ${amt === v ? "text-bg" : "bg-fg/[.06]"}`}>
                  {amt === v && <motion.span layoutId="gift-amt" className="absolute inset-0 rounded-full bg-fg" transition={{ type: "spring", bounce: 0.2, duration: 0.45 }} />}
                  <span className="relative">{toman(v, lang)}</span>
                </button>
              ))}
              <motion.button whileTap={{ scale: 0.95 }} onClick={makeGift} disabled={!!busy}
                className="ms-auto flex h-10 items-center gap-1.5 rounded-full bg-linear-to-r from-accent to-accent-2 px-4 text-sm font-bold text-white disabled:opacity-60">
                {busy === "gift" ? <Spinner /> : <><Icon name="gift" className="size-4" />{t.gift.make}</>}
              </motion.button>
            </div>

            <AnimatePresence>
              {code && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className="rounded-2xl bg-accent/10 p-4">
                    <p className="text-sm font-semibold">{t.gift.made}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span dir="ltr" className="font-mono text-2xl font-black tracking-[.2em] text-accent">{code}</span>
                      <button onClick={() => copy(code)} className="flex items-center gap-1.5 rounded-full bg-fg px-3 py-1.5 text-xs font-bold text-bg">
                        <Icon name={copied ? "check" : "copy"} className="size-4" />{copied ? t.gift.copied : t.gift.copy}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={redeem} className="flex gap-2 border-t border-line pt-5">
              <label htmlFor="gift-code" className="sr-only">{t.gift.code}</label>
              <input id="gift-code" dir="ltr" value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} placeholder={t.gift.code}
                maxLength={16} autoComplete="off" className={`${field} h-11 min-w-0 flex-1 px-4 font-mono font-bold tracking-widest placeholder:font-sans placeholder:tracking-normal`} />
              <button type="submit" disabled={redeemCode.trim().length < 4 || !!busy}
                className="flex h-11 items-center rounded-full bg-fg px-5 text-sm font-bold text-bg disabled:opacity-50">
                {busy === "redeem" ? <Spinner /> : t.gift.redeem}
              </button>
            </form>
            {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-good" : "text-accent-2"}`}>{msg.text}</p>}

            {w.gifts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted">{t.gift.mine}</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {w.gifts.map((g) => (
                    <li key={g.code} className={`flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs ${g.redeemed ? "opacity-50" : ""}`}>
                      <span dir="ltr" className="font-mono font-bold">{g.code}</span>
                      <span className="text-muted">{toman(g.amount, lang)} · {g.redeemed ? t.gift.used : t.gift.unused}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-extrabold">{t.wallet.history}</h2>
          <ul className="glass mt-5 divide-y divide-line overflow-hidden rounded-3xl">
            {w.tx.map((x) => (
              <motion.li key={x.id} layout initial={{ opacity: 0, x: lang === "fa" ? 20 : -20 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${x.kind === "purchase" ? "bg-fg/[.07]" : x.kind === "refund" ? "bg-good/15 text-good" : "bg-accent/15 text-accent"}`}>
                  <Icon name={KIND_ICON[x.kind]} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{x.title?.[lang] ?? t.wallet.kind[x.kind]}</div>
                  <div className="text-xs text-muted" suppressHydrationWarning>{t.wallet.kind[x.kind]}{x.kind.startsWith("gift") && <span dir="ltr" className="font-mono"> {x.ref}</span>} · {date(x.ts, lang)}</div>
                </div>
                <span className={`shrink-0 font-bold tabular-nums ${x.amount > 0 ? "text-good" : ""}`}>
                  {x.amount > 0 ? "+" : "−"}{toman(Math.abs(x.amount), lang)}
                </span>
              </motion.li>
            ))}
            {!w.tx.length && <li className="p-8 text-center text-muted">{t.wallet.none}</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
