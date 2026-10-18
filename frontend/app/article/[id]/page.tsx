import Reader from "@/components/Reader";
import { api } from "@/lib/api";
import type { ArticleFull, Meta } from "@/lib/core";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, meta] = await Promise.all([api<ArticleFull>(`/api/articles/${encodeURIComponent(id)}`), api<Meta>("/api/meta")]);
  return <Reader key={a.id} initial={a} meta={meta} />;
}
