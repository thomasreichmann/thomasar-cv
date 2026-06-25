import { useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useCallback } from "react";

import type { AppRouter } from "@/server/trpc/routers/_app";
import { useTRPC } from "@/trpc/react";

type Resume = inferRouterOutputs<AppRouter>["resume"]["get"];

/**
 * Seed `resume.get` with a row the client already holds (a `create` result or a
 * `list` entry) so the editor it navigates into reads from cache.
 *
 * Seeding, not an optimistic update: the row is server-confirmed, so nothing
 * rolls back. And because it lands fresh under the 30s staleTime, the editor
 * skips the `get` entirely rather than refetching in the background.
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
