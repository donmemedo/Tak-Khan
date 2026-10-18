import Discover from "@/components/Discover";
import { api, getMe } from "@/lib/api";
import type { Article, Meta, Sub } from "@/lib/core";

export default async function Home() {
  const [articles, meta, me] = await Promise.all([api<Article[]>("/api/articles"), api<Meta>("/api/meta"), getMe()]);
  const subs = me ? await api<Sub[]>("/api/subscriptions") : null;
  return <Discover articles={articles} meta={meta} subs={subs} />;
}
