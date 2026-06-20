"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/react";
import { ResumeRow } from "./resume-row";

/** Label a new résumé starts with; the editor (#40) makes the name editable. */
const NEW_RESUME_NAME = "Untitled résumé";

/**
 * The résumé management surface (issue #36): list, create, open, delete. Data
 * lives entirely in the client cache so a create or delete can refresh the list
 * in place. Creating opens the new résumé straight in the editor, which is where
 * the user fills it in; the list is invalidated first so the row is present when
 * they navigate back.
 */
export function ResumeDashboard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const resumes = useQuery(trpc.resume.list.queryOptions());

  const create = useMutation(
    trpc.resume.create.mutationOptions({
      onSuccess: async (created) => {
        await queryClient.invalidateQueries(trpc.resume.list.queryFilter());
        router.push(`/resume/${created.id}`);
      },
      onError: () => toast.error("Could not create the résumé."),
    }),
  );

  const onCreate = () => create.mutate({ name: NEW_RESUME_NAME });

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
            disabled={create.isPending}
            className="shrink-0"
          >
            <PlusIcon />
            {create.isPending ? "Creating…" : "New résumé"}
          </Button>
        )}
      </header>

      {resumes.isPending ? (
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
