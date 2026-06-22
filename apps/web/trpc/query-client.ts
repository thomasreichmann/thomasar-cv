import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import superjson from "superjson";

/**
 * One QueryClient factory shared by the browser and the server. superjson
 * (de)serializes dehydrated data so the transformer matches the tRPC link, and
 * pending queries are dehydrated too so server-prefetched data streams in
 * without a second fetch.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        // A client-fault error (404/401/403/400) won't change on a retry; retrying
        // only delays the error UI - e.g. a deleted or foreign résumé would sit in
        // the loading skeleton for the full backoff before resolving. Retry only
        // server/network faults, which is where a second attempt can succeed.
        retry: (failureCount, error) => {
          if (error instanceof TRPCClientError) {
            const status = error.data?.httpStatus;
            if (typeof status === "number" && status < 500) return false;
          }
          return failureCount < 3;
        },
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
