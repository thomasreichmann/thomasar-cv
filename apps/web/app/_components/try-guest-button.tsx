"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient, signIn } from "@/lib/auth/client";
import { DEFAULT_RESUME_NAME } from "@/lib/resume";
import { useTRPC } from "@/trpc/react";
import { usePrimeResume } from "@/trpc/use-prime-resume";

/**
 * The landing "try it" entry into guest mode (issue #67): mint an anonymous
 * session, then drop the visitor straight into the editor on a single résumé -
 * the fastest path to actually using the tool, which is the point of guest mode.
 * Guest mode is deliberately one résumé with no dashboard, so this never offers
 * a second; a returning guest reopens the one they have.
 */
export function TryGuestButton({ className }: { className?: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const create = useMutation(trpc.resume.create.mutationOptions());
  const primeResume = usePrimeResume();
  const [isLoading, setIsLoading] = useState(false);

  async function onClick() {
    setIsLoading(true);
    try {
      // Read the session fresh at click time, not off a hook: a stale "signed
      // out" value would mint a duplicate guest (the plugin rejects a second
      // anonymous sign-in) or strand a real user who should just go to their
      // dashboard.
      const { data: current } = await authClient.getSession();
      if (current?.user && !current.user.isAnonymous) {
        router.push("/dashboard");
        return;
      }
      if (!current?.user) {
        const { error } = await signIn.anonymous();
        if (error) throw new Error(error.message ?? "anonymous sign-in failed");
      }

      // One résumé per guest: reopen the existing one, or create it for a fresh
      // session. Force a network read (staleTime 0): resume.list's cache key
      // carries no user id, so a prior account's list - or this guest's own
      // stale empty list - can still be "fresh" under the 30s default, and would
      // otherwise reopen a résumé this guest doesn't own (NOT_FOUND) or mint a
      // duplicate by reusing a stale empty list.
      const existing = await queryClient.fetchQuery({
        ...trpc.resume.list.queryOptions(),
        staleTime: 0,
      });
      const target =
        existing[0] ??
        (await create.mutateAsync({ name: DEFAULT_RESUME_NAME }));
      primeResume(target);
      router.push(`/resume/${target.id}`);
    } catch {
      toast.error("Couldn't start guest mode. Try again.");
      setIsLoading(false);
    }
  }

  return (
    <Button onClick={onClick} disabled={isLoading} className={className}>
      {isLoading ? "Starting…" : "Try it - no sign-up"}
    </Button>
  );
}
