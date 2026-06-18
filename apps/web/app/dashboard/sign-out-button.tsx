"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth/client";

/** Clears the BetterAuth session, then returns to the landing page. */
export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function onClick() {
    setIsLoading(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-raised disabled:opacity-60"
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}
