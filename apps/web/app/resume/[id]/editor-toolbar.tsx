"use client";

import { ArrowLeftIcon, CheckIcon, Loader2Icon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatUpdatedAt } from "@/lib/relative-time";
import { useEditor } from "./editor-context";

/**
 * The editor's command bar: the résumé name, its saved/unsaved state, and the
 * save control, pinned to the top so save is reachable from anywhere in a long
 * document. The back control guards against leaving with unsaved edits.
 */
export function EditorToolbar() {
  const { name, setName, isDirty, isSaving, lastSavedAt, error, save } =
    useEditor();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <BackToDashboard />

        <div className="min-w-0 flex-1">
          <p className="px-1.5 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
            Editing
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Résumé name"
            aria-invalid={error ? true : undefined}
            placeholder="Untitled résumé"
            spellCheck={false}
            className="-mt-0.5 w-full truncate rounded-md bg-transparent px-1.5 py-0.5 text-lg font-semibold tracking-tight outline-none transition-colors placeholder:text-muted-foreground/60 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring aria-invalid:text-destructive"
          />
        </div>

        <SaveState isDirty={isDirty} lastSavedAt={lastSavedAt} />

        <Button onClick={save} disabled={!isDirty || isSaving}>
          {isSaving ? (
            <>
              <Loader2Icon className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <SaveIcon />
              Save
            </>
          )}
        </Button>
      </div>

      {error ? (
        <div className="mx-auto w-full max-w-6xl px-4 pb-2 sm:px-6">
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        </div>
      ) : null}
    </header>
  );
}

/**
 * The at-a-glance save indicator. A pulsing accent dot reads as "live, unsaved";
 * a settled check with the relative time reads as "done". Hidden on narrow
 * screens, where the Save button's own enabled/disabled state already carries it.
 */
function SaveState({
  isDirty,
  lastSavedAt,
}: {
  isDirty: boolean;
  lastSavedAt: Date;
}) {
  return (
    <span className="hidden items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground sm:inline-flex">
      {isDirty ? (
        <>
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Unsaved changes
        </>
      ) : (
        <>
          <CheckIcon className="size-3.5 text-primary" />
          Saved {formatUpdatedAt(lastSavedAt)}
        </>
      )}
    </span>
  );
}

/**
 * Back to the dashboard. When there are unsaved edits, a leave confirms first -
 * App Router has no global navigation guard, so the editor guards its own exits
 * (this link) and leans on `beforeunload` for the hard ones (refresh, close).
 */
function BackToDashboard() {
  const { isDirty } = useEditor();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!isDirty) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Back to dashboard"
        nativeButton={false}
        render={<Link href="/dashboard" />}
      >
        <ArrowLeftIcon />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to dashboard"
          />
        }
      >
        <ArrowLeftIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>
            You have edits that haven&apos;t been saved. Leaving now will lose
            them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep editing
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => router.push("/dashboard")}
          >
            Discard and leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
