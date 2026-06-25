"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DEFAULT_RESUME_NAME } from "@/lib/resume";
import { useTRPC } from "@/trpc/react";
import { usePrimeResume } from "@/trpc/use-prime-resume";
import { ResumeRow } from "./resume-row";

/**
 * The résumé management surface (issue #36): list, create, open, delete. Data
 * lives entirely in the client cache so a create or delete can refresh the list
 * in place. Creating opens the new résumé straight in the editor, which is where
 * the user fills it in; the list refreshes in the background so the row is
 * present when they navigate back.
 */
export function ResumeDashboard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const resumes = useQuery(trpc.resume.list.queryOptions());
  const primeResume = usePrimeResume();

  const create = useMutation(
    trpc.resume.create.mutationOptions({
      onSuccess: (created) => {
        // Hand the editor the row we just created, so its `resume.get` is a cache
        // hit rather than a refetch of data we already have.
        primeResume(created);
        // Redirect into the editor straight away, then refresh the list in the
        // background. Awaiting the refetch first rendered the new row into the
        // dashboard for a beat before the redirect fired, so the user could
        // click a row that was about to navigate there anyway — it felt like
        // being interrupted mid-action. The redirect shouldn't wait on a list
        // the user is leaving; the refresh just keeps it current for the return.
        router.push(`/resume/${created.id}`);
        void queryClient.invalidateQueries(trpc.resume.list.queryFilter());
      },
      onError: () => toast.error("Could not create the résumé."),
    }),
  );

  const onCreate = () => create.mutate({ name: DEFAULT_RESUME_NAME });

  // Once a create succeeds we're navigating away. Hold the surface on a quiet
  // "opening" state instead of letting the background refetch flash the new,
  // clickable row in where the user was just looking.
  const redirecting = create.isSuccess;

  // The empty state owns the create CTA when there's nothing yet, so the header
  // button only shows once there's a list beside it. That keeps exactly one
  // "New résumé" button on screen instead of two competing ones.
  const hasResumes = !!resumes.data && resumes.data.length > 0;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Your résumés
          </h1>
        </div>
        {hasResumes && (
          <Button
            onClick={onCreate}
            disabled={create.isPending || redirecting}
            className="shrink-0"
          >
            <PlusIcon />
            {create.isPending ? "Creating…" : "New résumé"}
          </Button>
        )}
      </header>

      {redirecting ? (
        <RedirectingState />
      ) : resumes.isPending ? (
        <ListSkeleton />
      ) : resumes.isError ? (
        <ErrorState onRetry={() => resumes.refetch()} />
      ) : resumes.data.length === 0 ? (
        <EmptyState onCreate={onCreate} creating={create.isPending} />
      ) : (
        <ul className="flex flex-col gap-3">
          {/* Newest edits first: the row the user just touched is the one they
              most likely want next. */}
          {[...resumes.data]
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .map((resume) => (
              <li key={resume.id}>
                <ResumeRow resume={resume} />
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-[4.625rem] animate-pulse rounded-xl bg-card ring-1 ring-foreground/10"
        />
      ))}
    </ul>
  );
}

function RedirectingState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Opening your résumé…</p>
    </div>
  );
}

function EmptyState({
  onCreate,
  creating,
}: {
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileTextIcon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No résumés yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first résumé to start editing.
        </p>
      </div>
      <Button onClick={onCreate} disabled={creating}>
        <PlusIcon />
        {creating ? "Creating…" : "New résumé"}
      </Button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-destructive/40 px-6 py-16 text-center">
      <p className="text-sm text-muted-foreground">
        Could not load your résumés.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
