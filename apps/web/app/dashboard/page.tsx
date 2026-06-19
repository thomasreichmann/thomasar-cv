import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth/server";
import { SignOutButton } from "./sign-out-button";

/**
 * Minimal protected page. Reading the session server-side and redirecting when
 * it is absent is the proof that auth is enforced before any UI renders; the
 * authenticated e2e test lands here. `headers()` opts this route into dynamic
 * rendering, so the session is always resolved per request.
 */
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Your account
        </h1>
      </div>
      <Card className="gap-5 p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Signed in as
          </p>
          <p className="mt-1 font-mono text-sm text-foreground">
            {session.user.email}
          </p>
        </div>
        <div className="border-t pt-5">
          <SignOutButton />
        </div>
      </Card>
    </main>
  );
}
