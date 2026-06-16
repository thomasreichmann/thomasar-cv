import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Signed in as {session.user.email}
        </p>
      </div>
      <div>
        <SignOutButton />
      </div>
    </main>
  );
}
