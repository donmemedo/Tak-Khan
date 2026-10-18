import { redirect } from "next/navigation";
import Login from "@/components/Login";
import { getMe } from "@/lib/api";
import { safeNext } from "@/lib/core";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getMe()) redirect(next);
  return <Login next={next} />;
}
