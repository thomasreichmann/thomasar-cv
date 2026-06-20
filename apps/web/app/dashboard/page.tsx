import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { ResumeDashboard } from "./resume-dashboard";
import { SignOutButton } from "./sign-out-button";

/**
 * The signed-in home: the résumé management surface (issue #36). Reading the
 * session server-side and redirecting when it is absent is the proof that auth
 * is enforced before any UI renders; the authenticated e2e test lands here.
 * `headers()` opts this route into dynamic rendering, so the session is always
 * resolved per request. The list / create / delete UI is a client island below.
 */
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-14">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs text-muted-foreground">
          {session.user.email}
        </p>
        <SignOutButton />
      </div>
      <ResumeDashboard />
    </main>
  );
}
