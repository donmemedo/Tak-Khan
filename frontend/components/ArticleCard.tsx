"use client";
import Link from "next/link";
import { fmt, toman, type Article, type Meta } from "@/lib/core";
import { useLang } from "./Shell";
import { Cover, Icon, Tilt } from "./ui";

export default function ArticleCard({ a, meta, big = false }: { a: Article; meta: Meta; big?: boolean }) {
  const { lang, t } = useLang();
  const pub = meta.publishers[a.publisher];
  return (
    <Tilt className="h-full rounded-[28px]" max={big ? 2.5 : 5}>
      <Link href={`/article/${a.id}`} className={`glass flex h-full flex-col overflow-hidden rounded-[28px] ${big ? "md:flex-row" : ""}`}>
        <Cover id={a.id} hue={pub.hue} className={big ? "aspect-[16/10] md:aspect-auto md:min-h-[380px] md:w-[55%]" : "aspect-[16/10]"}>
          <div className="absolute inset-x-4 top-4 flex items-center justify-between">
            <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">{meta.topics[a.topic][lang]}</span>
            {a.owned && (
              <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-black">
                <Icon name="check" className="size-3.5" />{t.owned}
              </span>
            )}
          </div>
        </Cover>
        <div className={`flex flex-1 flex-col gap-3 ${big ? "p-6 md:p-10" : "p-5"}`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <span className="size-2 rounded-full" style={{ background: `hsl(${pub.hue} 80% 55%)` }} />
            {pub[lang]}
          </div>
          <h3 className={big ? "display text-3xl md:text-5xl" : "text-xl font-extrabold leading-snug"}>{a.title[lang]}</h3>
          <p className={`text-muted ${big ? "text-lg" : "line-clamp-2"}`}>{a.dek[lang]}</p>
          <div className="mt-auto flex items-center justify-between pt-3 text-sm">
            <span className="flex items-center gap-1.5 text-muted"><Icon name="clock" className="size-4" />{t.minRead(fmt(a.minutes, lang))}</span>
            <span className={`rounded-full px-3.5 py-1.5 font-bold ${a.owned ? "bg-good/15 text-good" : "bg-fg text-bg"}`}>
              {a.owned ? t.owned : toman(a.price, lang)}
            </span>
          </div>
        </div>
      </Link>
    </Tilt>
  );
}
