import Link from "next/link";

import { HealthCheck } from "./_components/health-check";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">thomasar-cv</h1>
      <p className="max-w-md text-sm text-neutral-500">
        A résumé maintained as structured data. Foundation scaffolding is in
        place; the editor and renderer come next.
      </p>
      <Link
        href="/sign-in"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Sign in
      </Link>
      <HealthCheck />
    </main>
  );
}
