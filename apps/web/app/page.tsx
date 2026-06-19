import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { HealthCheck } from "./_components/health-check";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
        Résumé as structured data
      </p>
      <h1 className="mt-5 text-5xl font-semibold tracking-tight sm:text-6xl">
        thomasar-cv
      </h1>
      <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
        A résumé maintained as structured data, not a hand-formatted document.
        Foundation scaffolding is in place; the editor and renderer come next.
      </p>
      <Link href="/sign-in" className={cn(buttonVariants(), "group mt-8")}>
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
        className="mt-4 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        View résumé preview
      </Link>

      <div className="mt-12">
        <HealthCheck />
      </div>
    </main>
  );
}
