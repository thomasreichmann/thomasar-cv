/**
 * Batch-safe matching for tRPC requests. The client uses httpBatchLink, which
 * merges same-tick calls into one request whose path is the procedures joined by
 * commas (`/api/trpc/resume.update,resume.list`). Matching the raw URL by
 * substring would miss the batched form or match the wrong call, so split the
 * path and look for the procedure as a whole segment.
 */
export function isTrpcRequest(url: string, procedure: string): boolean {
  const marker = "/api/trpc/";
  const at = url.indexOf(marker);
  if (at === -1) return false;
  const path = url.slice(at + marker.length).split("?")[0] ?? "";
  return path.split(",").includes(procedure);
}
