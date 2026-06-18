import Link from "next/link";

import { HealthCheck } from "./_components/health-check";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="glow left-1/2 top-24 size-[520px] -translate-x-1/2"
      />

      <p className="animate-rise font-mono text-[0.7rem] uppercase tracking-[0.32em] text-faint">
        Résumé as structured data
      </p>
      <h1
        className="animate-rise mt-5 font-serif text-5xl font-semibold tracking-tight sm:text-6xl"
        style={{ animationDelay: "60ms" }}
      >
        thomasar-cv
      </h1>
      <p
        className="animate-rise mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted"
        style={{ animationDelay: "120ms" }}
      >
        A résumé maintained as structured data, not a hand-formatted document.
        Foundation scaffolding is in place; the editor and renderer come next.
      </p>
      <Link
        href="/sign-in"
        className="animate-rise group mt-8 inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm font-medium text-paper-foreground transition-opacity hover:opacity-90"
        style={{ animationDelay: "180ms" }}
      >
        Sign in
        <span
          aria-hidden
          className="transition-transform group-hover:translate-x-0.5"
        >
          &rarr;
        </span>
      </Link>

      <Link
        href="/preview"
        className="animate-rise mt-4 text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
        style={{ animationDelay: "210ms" }}
      >
        View résumé preview
      </Link>

      <div
        className="animate-rise mt-12"
        style={{ animationDelay: "240ms" }}
      >
        <HealthCheck />
      </div>
    </main>
  );
}
