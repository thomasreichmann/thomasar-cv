"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/react";
import { EditorProvider } from "./editor-context";
import { EditorToolbar } from "./editor-toolbar";
import { EditorWorkspace } from "./editor-shell";

/**
 * Loads one résumé and mounts the editor on it. The document is fetched on the
 * client (like the dashboard list) so the editor's in-memory state and the query
 * cache share one source of truth: a save writes through both. Loading and the
 * not-found / failed cases are handled here, before any editor state exists.
 */
export function ResumeEditor({ resumeId }: { resumeId: string }) {
  const trpc = useTRPC();
  const query = useQuery(trpc.resume.get.queryOptions({ id: resumeId }));

  if (query.isPending) return <EditorSkeleton />;

  if (query.isError) {
    const notFound = query.error.data?.code === "NOT_FOUND";
    return (
      <EditorError notFound={notFound} onRetry={() => void query.refetch()} />
    );
  }

  return (
    <EditorProvider resume={query.data}>
      <EditorToolbar />
      <EditorWorkspace />
    </EditorProvider>
  );
}

function EditorSkeleton() {
  return (
    <div aria-hidden className="flex flex-1 flex-col">
      <div className="sticky top-0 z-20 border-b border-border/70 bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="size-8 shrink-0 rounded-md bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-16 rounded bg-muted" />
            <div className="h-5 w-48 rounded bg-muted" />
          </div>
          <div className="h-9 w-20 rounded-md bg-muted" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-8 sm:px-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="flex flex-col gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
          <div className="h-[4.625rem] animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
          <div className="h-[4.625rem] animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
        </div>
        <div className="aspect-[210/297] w-full animate-pulse rounded-sm bg-muted" />
      </div>
    </div>
  );
}

function EditorError({
  notFound,
  onRetry,
}: {
  notFound: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight">
          {notFound ? "Résumé not found" : "Couldn't load this résumé"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {notFound
            ? "It may have been deleted, or it belongs to another account."
            : "Something went wrong loading it. Try again in a moment."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          <ArrowLeftIcon />
          Back to dashboard
        </Button>
        {!notFound ? <Button onClick={onRetry}>Try again</Button> : null}
      </div>
    </div>
  );
}
