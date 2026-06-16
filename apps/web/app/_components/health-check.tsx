"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/react";

/**
 * Smallest possible proof that the typed client reaches the server router and
 * back. Stands in until there is real UI to drive; remove once that exists.
 */
export function HealthCheck() {
  const trpc = useTRPC();
  const health = useQuery(trpc.health.queryOptions());

  return (
    <p className="text-xs text-neutral-400">
      api:{" "}
      {health.isPending
        ? "checking..."
        : health.isError
          ? "unreachable"
          : health.data.status}
    </p>
  );
}
