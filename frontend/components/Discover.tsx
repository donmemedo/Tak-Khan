"use client";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { day, fmt, post, toman, type Article, type Meta, type Sub } from "@/lib/core";
import ArticleCard from "./ArticleCard";
import { useLang } from "./Shell";
import { Icon, Spinner } from "./ui";

const spring = { type: "spring", bounce: 0.18, duration: 0.55 } as const;

export default function Discover({ articles, meta, subs }: { articles: Article[]; meta: Meta; subs: Sub[] | null }) {
  const { lang, t } = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return articles.filter((a) => (!topic || a.topic === topic) &&
      (!needle || [a.title.fa, a.title.en, a.dek.fa, a.dek.en].some((s) => s.toLowerCase().includes(needle))));
  }, [articles, topic, q]);

  // Recommendations: rank unread articles by how often the reader bought that topic, then by popularity.
  const forYou = useMemo(() => {
    const w: Record<string, number> = {};
    for (const a of articles) if (a.purchased) w[a.topic] = (w[a.topic] ?? 0) + 1;
    if (!Object.keys(w).length) return [];
    return articles.filter((a) => !a.owned).sort((x, y) => (w[y.topic] ?? 0) - (w[x.topic] ?? 0) || y.sold - x.sold).slice(0, 3);
  }, [articles]);

  const mySub = topic ? subs?.find((s) => s.topic === topic) : undefined;
  async function subscribe() {
    if (!subs) return router.push("/login");
    setBusy(true);
    setErr(null);
    try {
      await post("/api/subscriptions", { topic });
      router.refresh();
    } catch (e) {
      setErr(t.errors[(e as Error).message] ?? t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  const words = `${t.hero.a} ${t.hero.b}`.split(" ");
  const accentFrom = t.hero.a.split(" ").length;
  const pubNames = Object.values(meta.publishers).map((p) => p[lang]);
  const chips: [string | null, string][] = [[null, t.all], ...Object.entries(meta.topics).map(([k, v]) => [k, v[lang]] as [string, string])];

  return (
    <>
      <section className="py-8 text-center md:py-16">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
          <Icon name="shield" className="size-4 text-good" />{t.hero.badge}
        </motion.div>
        <h1 className="display mx-auto mt-6 max-w-4xl text-[2.6rem] sm:text-6xl md:text-7xl lg:text-8xl">
          {words.map((w, i) => (
            <motion.span key={`${lang}-${i}`} className={`inline-block ${i >= accentFrom ? "grad-text" : ""}`}
              initial={{ opacity: 0, y: 28, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ ...spring, delay: 0.1 + i * 0.07 }}>
              {w}{i < words.length - 1 && " "}
            </motion.span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl">{t.hero.sub}</motion.p>

        <motion.dl initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.6 }}
          className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
          {[[fmt(pubNames.length, lang), t.hero.publishers], [fmt(articles.length, lang), t.hero.articles], [`${fmt(70, lang)}${lang === "fa" ? "٪" : "%"}`, t.hero.share]].map(([n, l]) => (
            <div key={l} className="glass rounded-3xl px-2 py-4">
              <dt className="text-2xl font-black md:text-4xl">{n}</dt>
              <dd className="mt-1 text-xs text-muted md:text-sm">{l}</dd>
            </div>
          ))}
        </motion.dl>

        <div className="edge-mask mt-10 overflow-hidden" aria-hidden>
          <div className="marquee flex w-max gap-3">
            {[...pubNames, ...pubNames].map((n, i) => (
              <span key={i} className="whitespace-nowrap rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {forYou.length > 0 && !q && !topic && (
        <section className="mb-12">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold"><Icon name="star" className="size-6 text-accent-3" />{t.forYou}</h2>
          <p className="mt-1 text-muted">{t.forYouSub}</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {forYou.map((a) => <ArticleCard key={a.id} a={a} meta={meta} />)}
          </div>
        </section>
      )}

      <div className="sticky top-[76px] z-30 -mx-4 mb-6 px-4 py-2 md:top-[88px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="glass flex h-12 items-center gap-2 rounded-full px-4 md:w-80">
            <Icon name="search" className="size-5 text-muted" />
            <input type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search}
              aria-label={t.search} className="w-full bg-transparent outline-none placeholder:text-muted" />
          </label>
          <div className="glass no-scrollbar flex gap-1 overflow-x-auto rounded-full p-1">
            {chips.map(([k, label]) => (
              <button key={k ?? "all"} onClick={() => setTopic(k)} className="relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold">
                {topic === k && <motion.span layoutId="chip" transition={spring} className="absolute inset-0 rounded-full bg-fg" />}
                <span className={`relative transition-colors ${topic === k ? "text-bg" : "text-muted"}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {topic && (
          <motion.div key={topic} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring}
            className="glass mb-5 flex flex-col gap-3 rounded-3xl p-4 ps-5 sm:flex-row sm:items-center">
            <Icon name="star" className="hidden size-6 shrink-0 text-accent-3 sm:block" />
            <div className="flex-1">
              <p className="font-semibold">
                {mySub ? t.sub.active(meta.topics[topic][lang], day(mySub.expires, lang)) : t.sub.pitch(meta.topics[topic][lang], toman(meta.sub_price, lang))}
              </p>
              {err && <p className="mt-1 text-sm font-semibold text-accent-2">{err}</p>}
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={subscribe} disabled={busy}
              className="flex h-11 shrink-0 items-center justify-center rounded-full bg-fg px-5 text-sm font-bold text-bg disabled:opacity-60">
              {busy ? <Spinner /> : mySub ? t.sub.renew : t.sub.cta}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((a, i) => (
            <motion.div key={a.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }} transition={spring} className={i === 0 ? "sm:col-span-2 lg:col-span-3" : ""}>
              <ArticleCard a={a} meta={meta} big={i === 0} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {!list.length && <p className="py-20 text-center text-lg text-muted">{t.empty}</p>}
    </>
  );
}
