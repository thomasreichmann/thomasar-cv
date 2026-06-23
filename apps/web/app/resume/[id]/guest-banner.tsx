import { Button } from "@/components/ui/button";

/**
 * The guest's conversion prompt (issue #67). Guest mode has no dashboard, so
 * this is the only surface offering an account: it sits above the editor toolbar
 * and reassures that the résumé is already saved, then points at sign-up (the
 * common case) and sign-in (a returning user). Authenticating through either
 * reassigns this résumé to that account in `onLinkAccount` (ADR 0005), so the
 * work carries over.
 */
export function GuestBanner() {
  return (
    <div
      role="status"
      className="border-b border-border/70 bg-muted/40 px-4 py-2.5 sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground">
          You&apos;re editing as a guest - this résumé is saved.{" "}
          <span className="text-foreground">
            Create an account to keep it.
          </span>
        </p>
        {/* Plain anchors, not next/link: the editor guards unsaved edits only
            through `beforeunload`, which a soft client navigation skips. A
            full-document navigation fires it, so a guest mid-edit gets the same
            "leave with unsaved changes?" prompt the back control gives a
            signed-in user, instead of silently losing work on the way to convert. */}
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" nativeButton={false} render={<a href="/sign-up" />}>
            Sign up
          </Button>
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<a href="/sign-in" />}
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
