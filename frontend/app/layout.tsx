import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import Shell from "@/components/Shell";
import { getLang, getMe } from "@/lib/api";
import "./globals.css";

const vazir = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazir", display: "swap" });

export const metadata: Metadata = {
  title: "خوانا · Khana",
  description: "Pay-per-article marketplace for Persian journalism, with a no-questions refund.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f6" },
    { media: "(prefers-color-scheme: dark)", color: "#050508" },
  ],
};

// Runs before paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, me] = await Promise.all([getLang(), getMe()]);
  return (
    <html lang={lang} dir={lang === "fa" ? "rtl" : "ltr"} className={vazir.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Shell lang={lang} me={me}>{children}</Shell>
      </body>
    </html>
  );
}
