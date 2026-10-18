"use client";
import { motion, useSpring } from "motion/react";

const P: Record<string, string> = {
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  star: '<path d="M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.7 5.2.8a.5.5 0 0 1 .3.9l-3.8 3.6.9 5.2a.5.5 0 0 1-.7.5L12 15.6l-4.7 2.4a.5.5 0 0 1-.7-.5l.9-5.2-3.8-3.6a.5.5 0 0 1 .3-.9l5.2-.8z"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
};

export function Icon({ name, className = "size-5" }: { name: keyof typeof P | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden className={className} dangerouslySetInnerHTML={{ __html: P[name] }} />
  );
}

export function Spinner() {
  return <span className="inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

/** Generative cover art, deterministic per article id. */
export function Cover({ id, hue, className = "", children }: { id: string; hue: number; className?: string; children?: React.ReactNode }) {
  const h = [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
  const r = (shift: number) => ((h >> shift) & 255) / 255;
  const base = hue + r(20) * 30;
  return (
    <div className={`relative isolate overflow-hidden ${className}`}
      style={{ background: `linear-gradient(${120 + r(4) * 90}deg, hsl(${base} 85% 56%), hsl(${base + 55} 80% 40%))` }}>
      <div className="absolute aspect-square w-[75%] rounded-full blur-2xl"
        style={{ left: `${r(0) * 50 - 10}%`, top: `${r(8) * 50 - 25}%`, background: `hsl(${base + 140} 95% 70% / .8)` }} />
      <div className="absolute aspect-square w-[55%] rounded-full blur-2xl"
        style={{ right: `${r(12) * 30 - 10}%`, bottom: `${r(16) * 30 - 30}%`, background: `hsl(${base - 50} 95% 62% / .9)` }} />
      <div className="absolute aspect-square w-[38%] rounded-full border border-white/30"
        style={{ left: `${20 + r(2) * 45}%`, top: `${15 + r(6) * 40}%` }} />
      <div className="grain absolute inset-0" />
      <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent" />
      {children}
    </div>
  );
}

/** Pointer-tracked 3D tilt with a spotlight sheen; springs keep it interruptible. */
export function Tilt({ children, className = "", max = 5 }: { children: React.ReactNode; className?: string; max?: number }) {
  const cfg = { stiffness: 260, damping: 26 };
  const rx = useSpring(0, cfg);
  const ry = useSpring(0, cfg);
  return (
    <motion.div
      className={`group relative ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const b = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
        ry.set((x - 0.5) * max * 2);
        rx.set(-(y - 0.5) * max * 2);
        e.currentTarget.style.setProperty("--mx", `${x * 100}%`);
        e.currentTarget.style.setProperty("--my", `${y * 100}%`);
      }}
      onPointerLeave={() => { rx.set(0); ry.set(0); }}
    >
      {children}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(500px circle at var(--mx) var(--my), rgb(255 255 255 / .14), transparent 45%)" }} />
    </motion.div>
  );
}
