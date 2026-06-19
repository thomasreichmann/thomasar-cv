import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

/** Shared shell for the sign-in / sign-up pages: brand link + centered card. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight transition-colors hover:text-foreground/80"
        >
          thomasar-cv
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-sm p-8">{children}</Card>
      </main>
    </div>
  );
}
