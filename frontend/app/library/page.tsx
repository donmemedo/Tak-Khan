import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import { Icon } from "@/components/ui";
import { api, getLang, requireMe } from "@/lib/api";
import { day, dict, type Article, type Meta, type Sub } from "@/lib/core";

export default async function LibraryPage() {
  await requireMe("/library");
  const [items, subs, meta, lang] = await Promise.all([
    api<Article[]>("/api/library"), api<Sub[]>("/api/subscriptions"), api<Meta>("/api/meta"), getLang(),
  ]);
  const t = dict[lang];
  return (
    <>
      <h1 className="display text-4xl md:text-6xl">{t.lib.title}</h1>
      <p className="mt-3 text-lg text-muted">{t.lib.sub}</p>
      {subs.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-extrabold">{t.sub.mine}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {subs.map((s) => (
              <span key={s.topic} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <Icon name="star" className="size-4 text-accent-3" />
                <b>{meta.topics[s.topic][lang]}</b>
                <span className="text-muted">{t.sub.until(day(s.expires, lang))}</span>
              </span>
            ))}
          </div>
        </section>
      )}
      {items.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => <ArticleCard key={a.id} a={a} meta={meta} />)}
        </div>
      ) : (
        <div className="glass mx-auto mt-12 flex max-w-md flex-col items-center gap-4 rounded-[32px] p-10 text-center">
          <span className="grid size-16 place-items-center rounded-3xl bg-accent/15 text-accent"><Icon name="book" className="size-8" /></span>
          <p className="text-lg font-semibold">{t.lib.empty}</p>
          <Link href="/" className="rounded-full bg-fg px-6 py-3 font-bold text-bg">{t.lib.cta}</Link>
        </div>
      )}
    </>
  );
}
