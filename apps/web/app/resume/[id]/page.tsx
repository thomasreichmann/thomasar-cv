import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { ResumeEditor } from "./resume-editor";

/**
 * The editor for one résumé (issue #40). Auth is enforced server-side here, the
 * same proof the dashboard relies on: no editor UI renders without a session.
 * Per-résumé ownership is the API's job - `resume.get` returns NOT_FOUND for a
 * résumé that is missing or another user's, which the client renders as such.
 */
export default async function ResumeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const { id } = await params;

  return (
    <main className="flex min-h-screen flex-col">
      <ResumeEditor resumeId={id} />
    </main>
  );
}
