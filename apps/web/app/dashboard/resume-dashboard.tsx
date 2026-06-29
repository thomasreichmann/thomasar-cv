"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JsonResume } from "@thomasar-cv/db/jsonresume";
import { FileTextIcon, Loader2Icon, PlusIcon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, type ChangeEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DEFAULT_RESUME_NAME } from "@/lib/resume";
import { useTRPC } from "@/trpc/react";
import { usePrimeResume } from "@/trpc/use-prime-resume";
import { ResumeRow } from "./resume-row";

// A JSON Resume document is a small text file; a few MB is already far past any
// real résumé. Bail before reading so an accidental huge/wrong file is a clean
// toast instead of a frozen tab (JSON.parse blocks) and a wasted round trip.
const MAX_IMPORT_BYTES = 2_000_000;

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

  // Both create and import end the same way: open the new résumé in the editor,
  // then refresh the list in the background. Awaiting the refetch first rendered
  // the new row into the dashboard for a beat before the redirect fired, so the
  // user could click a row that was about to navigate there anyway — it felt
  // like being interrupted mid-action. The redirect shouldn't wait on a list the
  // user is leaving; the refresh just keeps it current for the return.
  const openInEditor = (created: Parameters<typeof primeResume>[0]) => {
    primeResume(created);
    router.push(`/resume/${created.id}`);
    void queryClient.invalidateQueries(trpc.resume.list.queryFilter());
  };

  const create = useMutation(
    trpc.resume.create.mutationOptions({
      onSuccess: openInEditor,
      onError: () => toast.error("Could not create the résumé."),
    }),
  );

  const importResume = useMutation(
    trpc.resume.importJsonResume.mutationOptions({
      onSuccess: openInEditor,
      // A shape the JSON Resume schema refuses (BAD_REQUEST) reads as "not a
      // résumé"; anything else is an unexpected failure. Either way nothing was
      // created, so the dashboard stays put.
      onError: (error) =>
        toast.error(
          error.data?.code === "BAD_REQUEST"
            ? "That file isn't a JSON Resume document."
            : "Could not import the résumé.",
        ),
    }),
  );

  const onCreate = () => create.mutate({ name: DEFAULT_RESUME_NAME });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const onPickFile = () => fileInputRef.current?.click();

  const onFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so re-picking the same file (e.g. after a parse error) fires `change`.
    event.target.value = "";
    if (!file) return;
    // An import already in flight: ignore a second pick rather than fire a
    // duplicate mutation (the trigger buttons are disabled, but the hidden input
    // isn't the only way `change` can fire).
    if (importResume.isPending) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("That file is too large to be a résumé.");
      return;
    }

    let document: JsonResume;
    try {
      // Parsing the file to JSON is the client's job; the mutation validates the
      // shape. A file that isn't JSON at all never reaches the server.
      document = JSON.parse(await file.text());
    } catch {
      toast.error("That file isn't valid JSON.");
      return;
    }
    importResume.mutate(document);
  };

  // Once a create or import succeeds we're navigating away. Hold the surface on a
  // quiet "opening" state instead of letting the background refetch flash the
  // new, clickable row in where the user was just looking.
  const redirecting = create.isSuccess || importResume.isSuccess;
  const busy = create.isPending || importResume.isPending || redirecting;

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
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" onClick={onPickFile} disabled={busy}>
              <UploadIcon />
              {importResume.isPending ? "Importing…" : "Import"}
            </Button>
            <Button onClick={onCreate} disabled={busy}>
              <PlusIcon />
              {create.isPending ? "Creating…" : "New résumé"}
            </Button>
          </div>
        )}
      </header>

      {/* One hidden picker drives every import entry point (header and empty
          state). A JSON Resume export is a .json file; accept it by extension and
          type so the OS dialog filters to what we can read. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        disabled={busy}
        onChange={onFileChosen}
      />

      {redirecting ? (
        <RedirectingState />
      ) : resumes.isPending ? (
        <ListSkeleton />
      ) : resumes.isError ? (
        <ErrorState onRetry={() => resumes.refetch()} />
      ) : resumes.data.length === 0 ? (
        <EmptyState
          onCreate={onCreate}
          onImport={onPickFile}
          busy={busy}
          creating={create.isPending}
          importing={importResume.isPending}
        />
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
  onImport,
  busy,
  creating,
  importing,
}: {
  onCreate: () => void;
  onImport: () => void;
  busy: boolean;
  creating: boolean;
  importing: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileTextIcon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No résumés yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first résumé, or import one from a JSON Resume file.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onCreate} disabled={busy}>
          <PlusIcon />
          {creating ? "Creating…" : "New résumé"}
        </Button>
        <Button variant="outline" onClick={onImport} disabled={busy}>
          <UploadIcon />
          {importing ? "Importing…" : "Import"}
        </Button>
      </div>
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
