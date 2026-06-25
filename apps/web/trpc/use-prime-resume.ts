import { useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useCallback } from "react";

import type { AppRouter } from "@/server/trpc/routers/_app";
import { useTRPC } from "@/trpc/react";

type Resume = inferRouterOutputs<AppRouter>["resume"]["get"];

/**
 * Seed `resume.get` with a résumé the client already holds - a `create` result or
 * a `list` entry - so opening its editor is a cache hit instead of refetching a
 * row we were just handed. The editor mounts its own `resume.get` keyed by id;
 * without this it round-trips and flashes a loading skeleton for data already in
 * memory. Both create entry points (guest mode, dashboard) navigate straight into
 * the editor, so both prime through here.
 *
 * This is seeding, not an optimistic update: the row is already server-confirmed,
 * so there is nothing provisional to roll back. Under the 30s default staleTime
 * the seeded entry is fresh on arrival, so the editor issues no request at all.
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
