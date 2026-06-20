"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { FileTextIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

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
import type { AppRouter } from "@/server/trpc/routers/_app";
import { useTRPC } from "@/trpc/react";

/** One row's shape, taken from the router so it tracks the API, not a copy of it. */
type Resume = inferRouterOutputs<AppRouter>["resume"]["list"][number];

/**
 * A single résumé in the dashboard list. The whole row is a link into the editor
 * (stretched via the `after` overlay), while the delete control sits above that
 * overlay (`z-10`) so it stays its own click target. Delete goes through a
 * confirm dialog because it is irreversible, and refreshes the list on success.
 */
export function ResumeRow({ resume }: { resume: Resume }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const remove = useMutation(
    trpc.resume.remove.mutationOptions({
      onSuccess: async () => {
        setConfirmOpen(false);
        await queryClient.invalidateQueries(trpc.resume.list.queryFilter());
        toast.success(`Deleted “${resume.name}”.`);
      },
      onError: () => toast.error("Could not delete the résumé."),
    }),
  );

  return (
    <div className="group relative flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
      <FileTextIcon
        className="size-5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/resume/${resume.id}`}
          className="font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none"
        >
          <span className="block truncate">{resume.name}</span>
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Updated {formatUpdatedAt(resume.updatedAt)}
        </p>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative z-10 text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${resume.name}`}
            />
          }
        >
          <Trash2Icon />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this résumé?</DialogTitle>
            <DialogDescription>
              “{resume.name}” will be permanently deleted. This can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => remove.mutate({ id: resume.id })}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
