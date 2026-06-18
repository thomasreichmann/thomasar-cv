import Link from "next/link";
import type { ReactNode } from "react";

/** Shared shell for the sign-in / sign-up pages: brand link + centered card. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="glow left-1/2 -top-24 size-[440px] -translate-x-1/2"
      />

      <header className="flex h-16 items-center px-6">
        <Link
          href="/"
          className="font-serif text-base font-semibold tracking-tight transition-colors hover:text-accent"
        >
          thomasar-cv
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="animate-rise w-full max-w-sm rounded-2xl border border-border bg-surface/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
