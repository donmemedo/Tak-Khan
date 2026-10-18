"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { dict, post, toman, type Dict, type Lang, type Me } from "@/lib/core";
import { Icon } from "./ui";

const Ctx = createContext<{ lang: Lang; t: Dict }>({ lang: "fa", t: dict.fa });
export const useLang = () => useContext(Ctx);

type Theme = "system" | "light" | "dark";
const THEMES: Theme[] = ["system", "light", "dark"];
const spring = { type: "spring", bounce: 0.2, duration: 0.5 } as const;

function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export default function Shell({ lang, me, children }: { lang: Lang; me: Me | null; children: React.ReactNode }) {
  const t = dict[lang];
  const path = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let saved: Theme = "system";
    try { saved = (localStorage.getItem("theme") as Theme) || "system"; } catch {}
    setTheme(saved);
  }, []);

  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme ?? "system") + 1) % THEMES.length];
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
  };

  const switchLang = () => {
    const next = lang === "fa" ? "en" : "fa";
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
    router.refresh();
  };

  const logout = async () => {
    await post("/api/auth/logout").catch(() => {});
    router.push("/");
    router.refresh();
  };

  const tabs = [
    { href: "/", icon: "compass", label: t.nav.discover },
    { href: "/library", icon: "book", label: t.nav.library },
    { href: "/wallet", icon: "wallet", label: t.nav.wallet },
    { href: "/publishers", icon: "chart", label: t.nav.publishers },
  ];
  const isActive = (h: string) => (h === "/" ? path === "/" || path.startsWith("/article") : path.startsWith(h));
  const current = theme ?? "system";

  return (
    <Ctx.Provider value={{ lang, t }}>
      <MotionConfig reducedMotion="user">
        <div aria-hidden className="aurora pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <i className="-start-[10%] -top-[15%] size-[55vmax] bg-accent" style={{ "--dx": "18vw", "--dy": "12vh" } as React.CSSProperties} />
          <i className="-end-[15%] top-[20%] size-[45vmax] bg-accent-2" style={{ "--dx": "-14vw", "--dy": "18vh", animationDelay: "-8s" } as React.CSSProperties} />
          <i className="bottom-[-25%] start-[25%] size-[40vmax] bg-accent-3" style={{ "--dx": "10vw", "--dy": "-16vh", animationDelay: "-16s" } as React.CSSProperties} />
        </div>

        <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="glass pointer-events-auto flex w-full max-w-5xl items-center gap-2 rounded-full p-1.5 ps-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-black">
              <span className="grid size-8 place-items-center rounded-[10px] bg-linear-to-br from-accent via-accent-2 to-accent-3 text-sm text-white shadow-md">
                {lang === "fa" ? "خ" : "K"}
              </span>
              {t.brand}
            </Link>
            <nav className="mx-auto hidden gap-1 md:flex">
              {tabs.map((tab) => (
                <Link key={tab.href} href={tab.href} className="relative rounded-full px-4 py-2 text-sm font-semibold">
                  {isActive(tab.href) && (
                    <motion.span layoutId="nav-pill" transition={spring} className="absolute inset-0 rounded-full bg-fg/[.08]" />
                  )}
                  <span className={`relative transition-colors ${isActive(tab.href) ? "text-fg" : "text-muted hover:text-fg"}`}>{tab.label}</span>
                </Link>
              ))}
            </nav>
            <div className="ms-auto flex items-center gap-1 md:ms-0">
              {me ? (
                <>
                  <Link href="/wallet" className="hidden h-10 items-center gap-1.5 rounded-full bg-fg/[.06] px-3.5 text-sm font-bold tabular-nums hover:bg-fg/[.1] sm:flex">
                    <Icon name="wallet" className="size-4" />{toman(me.balance, lang)}
                  </Link>
                  <motion.button whileTap={{ scale: 0.88 }} onClick={logout} aria-label={t.auth.logout} title={t.auth.logout}
                    className="grid size-10 place-items-center rounded-full hover:bg-fg/[.06]">
                    <Icon name="logout" className="size-5 rtl:-scale-x-100" />
                  </motion.button>
                </>
              ) : (
                <Link href="/login" className="flex h-10 items-center rounded-full bg-fg px-4 text-sm font-bold text-bg active:scale-95">{t.auth.login}</Link>
              )}
              <motion.button whileTap={{ scale: 0.88 }} onClick={switchLang} aria-label={t.otherLang}
                className="h-10 rounded-full px-3 text-sm font-bold hover:bg-fg/[.06]">
                {t.otherLang}
              </motion.button>
              <motion.button whileTap={{ scale: 0.88 }} onClick={cycleTheme} aria-label={t.theme[current]} title={t.theme[current]}
                className="grid size-10 place-items-center rounded-full hover:bg-fg/[.06]">
                <motion.span key={current} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={spring}>
                  <Icon name={current === "dark" ? "moon" : current === "light" ? "sun" : "auto"} />
                </motion.span>
              </motion.button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-36 pt-24 md:pb-20 md:pt-28">{children}</main>

        <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden">
          <div className="glass pointer-events-auto grid w-full max-w-md grid-cols-4 rounded-[28px] p-1.5">
            {tabs.map((tab) => {
              const on = isActive(tab.href);
              return (
                <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center gap-0.5 rounded-[22px] py-2 text-[11px] font-semibold">
                  {on && <motion.span layoutId="tab-pill" transition={spring} className="absolute inset-0 rounded-[22px] bg-fg/[.08]" />}
                  <span className={`relative flex flex-col items-center gap-0.5 transition-colors ${on ? "text-accent" : "text-muted"}`}>
                    <Icon name={tab.icon} className="size-6" />
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </MotionConfig>
    </Ctx.Provider>
  );
}
