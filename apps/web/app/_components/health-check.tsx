"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/react";

/**
 * Smallest possible proof that the typed client reaches the server router and
 * back. Stands in until there is real UI to drive; remove once that exists.
 * Doubles as a "data" accent in the chrome.
 */
export function HealthCheck() {
  const trpc = useTRPC();
  const health = useQuery(trpc.health.queryOptions());

  const { dotClass, label } = health.isPending
    ? { dotClass: "bg-muted-foreground animate-pulse", label: "checking" }
    : health.isError
      ? { dotClass: "bg-destructive", label: "unreachable" }
      : { dotClass: "bg-primary", label: health.data.status };

  return (
    <p className="inline-flex items-center gap-2 rounded-full border bg-card/50 px-3 py-1 font-mono text-[0.7rem] text-muted-foreground">
      <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden />
      api {label}
    </p>
  );
}
