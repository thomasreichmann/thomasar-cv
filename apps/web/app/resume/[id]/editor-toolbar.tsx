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
export function EditorToolbar({ isGuest = false }: { isGuest?: boolean }) {
  const { name, setName, isDirty, isSaving, lastSavedAt, error, save } =
    useEditor();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        {/* A guest has no dashboard to go back to (issue #67); the back control
            gives way to a "Guest" marker, and the account actions that replace
            its way out live in the right cluster below. */}
        {isGuest ? <GuestBadge /> : <BackToDashboard />}

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

        {/* For a guest, converting is the priority action: Sign up keeps the lone
            accent (in GuestActions) and Save steps down to secondary, since the
            saved-state indicator already reassures the work is kept. A signed-in
            user has no competing CTA, so Save stays primary. */}
        <Button
          variant={isGuest ? "secondary" : "default"}
          onClick={save}
          disabled={!isDirty || isSaving}
        >
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

        {isGuest ? <GuestActions /> : null}
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
 * Stands in for the back control a guest lacks (no dashboard to return to, issue
 * #67) and names the session state that explains why the header offers Sign in /
 * Sign up rather than a way back. Hidden on narrow screens, where the row has no
 * room to spare and the account buttons already signal the guest state.
 */
function GuestBadge() {
  return (
    <span className="hidden shrink-0 items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground sm:inline-flex">
      Guest
    </span>
  );
}

/**
 * A guest's only path to an account (issue #67), folded into the editor header so
 * the page carries one chrome bar instead of a stacked conversion banner. Sign up
 * is the lone accent - converting is what matters - with Sign in beside it for a
 * returning user; both reassign this résumé on authentication (ADR 0005).
 *
 * Plain anchors, not next/link: the editor guards unsaved edits only through
 * `beforeunload`, which a soft client navigation skips. A full-document
 * navigation fires it, so a guest mid-edit gets the same "leave with unsaved
 * changes?" prompt the back control gives a signed-in user.
 */
function GuestActions() {
  return (
    <>
      <span aria-hidden className="mx-0.5 h-6 w-px bg-border/70 sm:mx-1" />
      <Button
        variant="ghost"
        nativeButton={false}
        render={<a href="/sign-in" />}
      >
        Sign in
      </Button>
      <Button nativeButton={false} render={<a href="/sign-up" />}>
        Sign up
      </Button>
    </>
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
 * Back to the dashboard (signed-in only; a guest gets the GuestBadge instead).
 * When there are unsaved edits, a leave confirms first -
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
