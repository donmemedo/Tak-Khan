"use client";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { useLang } from "@/components/Shell";
import { Icon } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useLang();
  const router = useRouter();
  return (
    <div role="alert" className="glass mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-[32px] p-10 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-accent-2/15 text-accent-2"><Icon name="alert" className="size-8" /></span>
      <h1 className="text-2xl font-extrabold">{t.state.error}</h1>
      <p className="text-muted">{t.state.errorSub}</p>
      <button onClick={() => startTransition(() => { router.refresh(); reset(); })}
        className="mt-3 rounded-full bg-fg px-6 py-3 font-bold text-bg active:scale-95">{t.state.retry}</button>
    </div>
  );
}
