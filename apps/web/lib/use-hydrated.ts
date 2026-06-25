import { useSyncExternalStore } from "react";

// Never changes after mount, so the store never notifies; the snapshots alone
// carry the signal.
const subscribe = () => () => {};

/**
 * False during SSR and the first (hydration) client render, true once hydrated.
 * Gates interaction on the island being interactive without a setState-in-effect
 * (which cascades a render and trips react-hooks/set-state-in-effect): the server
 * snapshot is false and the client snapshot true, so React flips it as part of
 * hydration rather than through a post-render update.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
