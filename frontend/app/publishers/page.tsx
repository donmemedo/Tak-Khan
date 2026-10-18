import Link from "next/link";
import { api, getLang } from "@/lib/api";
import { dict, fmt, toman, type Stats } from "@/lib/core";

export default async function PublishersPage() {
  const [s, lang] = await Promise.all([api<Stats>("/api/publishers/stats"), getLang()]);
  const t = dict[lang];
  const max = Math.max(...s.publishers.map((p) => p.gross));
  const pct = (n: number) => `${fmt(n, lang)}${lang === "fa" ? "٪" : "%"}`;
  const kpis = [
    [t.pub.gross, toman(s.gross, lang, true)],
    [t.pub.share, toman(s.publisher_share, lang, true)],
    [t.pub.platform, toman(s.platform_share, lang, true)],
    [t.pub.sales, fmt(s.sales, lang)],
  ];
  return (
    <div className="space-y-6">
      <header className="mb-10">
        <h1 className="display text-4xl md:text-6xl">{t.pub.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">{t.pub.sub}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="glass rounded-3xl p-5">
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-2 text-2xl font-black tabular-nums md:text-3xl">{value}</div>
          </div>
        ))}
      </div>

      <section className="glass rounded-[28px] p-6">
        <h2 className="text-lg font-extrabold">{t.pub.split}</h2>
        <div className="mt-4 flex h-5 gap-1 overflow-hidden rounded-full">
          <div className="grow-x rounded-full bg-accent" style={{ width: "70%" }} />
          <div className="grow-x rounded-full bg-accent-2" style={{ width: "30%", animationDelay: ".15s" }} />
        </div>
        <div className="mt-3 flex justify-between text-sm">
          <span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-accent" />{t.pub.share} · {pct(70)}</span>
          <span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-accent-2" />{t.pub.platform} · {pct(30)}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-[28px] p-6">
          <h2 className="text-lg font-extrabold">{t.pub.byPublisher}</h2>
          <ul className="mt-5 space-y-5">
            {s.publishers.map((p, i) => (
              <li key={p.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">{p[lang]} <span className="text-xs font-normal text-muted">· {t.pub.articles(fmt(p.articles, lang))}</span></span>
                  <span className="tabular-nums text-muted">{toman(p.gross, lang, true)}</span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-fg/[.06]">
                  <div className="grow-x h-full rounded-full" style={{ width: `${(p.gross / max) * 100}%`, background: `hsl(${p.hue} 80% 58%)`, animationDelay: `${i * 80}ms` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass rounded-[28px] p-6">
          <h2 className="text-lg font-extrabold">{t.pub.top}</h2>
          <ol className="mt-4 divide-y divide-line">
            {s.top.map((a, i) => (
              <li key={a.id}>
                <Link href={`/article/${a.id}`} className="flex items-center gap-4 py-3.5 hover:opacity-80">
                  <span className="grad-text w-8 text-3xl font-black">{fmt(i + 1, lang)}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{a.title[lang]}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">{toman(a.revenue, lang, true)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
