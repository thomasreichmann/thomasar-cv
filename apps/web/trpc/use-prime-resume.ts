import { useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useCallback } from "react";

import type { AppRouter } from "@/server/trpc/routers/_app";
import { useTRPC } from "@/trpc/react";

type Resume = inferRouterOutputs<AppRouter>["resume"]["get"];

/**
 * Prime `resume.get` with a row already in hand (from `create` or `list`) so
 * navigating into that résumé's editor doesn't refetch it.
 */
export function usePrimeResume() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useCallback(
    (resume: Resume) =>
      queryClient.setQueryData(
        trpc.resume.get.queryKey({ id: resume.id }),
        resume,
      ),
    [queryClient, trpc],
  );
}
