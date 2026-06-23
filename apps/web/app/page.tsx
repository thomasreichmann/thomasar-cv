import Link from "next/link";

import { HealthCheck } from "./_components/health-check";
import { TryGuestButton } from "./_components/try-guest-button";

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
        A résumé maintained as structured data, not a hand-formatted document,
        rendered to an ATS-parseable single page. Open the editor right now - no
        sign-up - and keep your work by creating an account whenever you like.
      </p>

      {/* Guest mode is the primary entry: the live demo (issue #67). Sign-in is
          the secondary path for visitors who already have an account. */}
      <TryGuestButton className="mt-8" />

      <Link
        href="/sign-in"
        className="mt-4 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Sign in to your account
      </Link>

      <div className="mt-12">
        <HealthCheck />
      </div>
    </main>
  );
}
