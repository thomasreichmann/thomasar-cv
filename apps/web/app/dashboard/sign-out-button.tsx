"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
