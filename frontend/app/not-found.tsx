import Link from "next/link";
import { getLang } from "@/lib/api";
import { dict } from "@/lib/core";

export default async function NotFound() {
  const t = dict[await getLang()];
  return (
    <div className="mx-auto mt-10 max-w-md text-center">
      <div className="display grad-text text-[7rem] md:text-[9rem]">۴۰۴</div>
      <h1 className="text-2xl font-extrabold">{t.state.notFound}</h1>
      <p className="mt-2 text-muted">{t.state.notFoundSub}</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-fg px-6 py-3 font-bold text-bg">{t.state.home}</Link>
    </div>
  );
}
