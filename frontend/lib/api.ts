import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Lang, Me } from "./core";

const BASE = process.env.BACKEND_URL ?? "http://localhost:8046";

export async function api<T>(path: string): Promise<T> {
  // Forward the session so server-rendered pages see the same user as the browser.
  const token = (await cookies()).get("khana_session")?.value;
  const r = await fetch(BASE + path, { cache: "no-store", headers: token ? { cookie: `khana_session=${token}` } : {} });
  if (r.status === 404) notFound();
  if (r.status === 401) redirect("/login");
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

export async function getLang(): Promise<Lang> {
  return (await cookies()).get("lang")?.value === "en" ? "en" : "fa";
}

export async function getMe(): Promise<Me | null> {
  const token = (await cookies()).get("khana_session")?.value;
  if (!token) return null;
  const r = await fetch(`${BASE}/api/me`, { cache: "no-store", headers: { cookie: `khana_session=${token}` } }).catch(() => null);
  return r?.ok ? r.json() : null;
}

/** For pages that need a user: bounce guests to login and come back afterwards. */
export async function requireMe(from: string): Promise<Me> {
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(from)}`);
  return me;
}
