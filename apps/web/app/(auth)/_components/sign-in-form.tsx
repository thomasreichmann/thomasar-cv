"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/client";
import { useHydrated } from "@/lib/use-hydrated";
import { useTRPC } from "@/trpc/react";

// Hidden in production. This only decides whether to render the button; the
// server (dev.credentials) is what actually withholds the credentials, so a
// stale value here can't leak anything - at worst it shows a button that the
// server refuses. NEXT_PUBLIC_VERCEL_ENV is Vercel's client-exposed env tag.
const showDevLogin = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

/**
 * Email + password sign-in. On success the BetterAuth cookie is set and we
 * push to the protected dashboard; on failure we surface the error inline
 * (role="alert") and stay on the page.
 */
export function SignInForm() {
  const router = useRouter();
  const trpc = useTRPC();
  const devCredentials = useMutation(trpc.dev.credentials.mutationOptions());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Until the island hydrates there is no onSubmit to call preventDefault, so a
  // click on the submit button posts the form natively - a GET with no action,
  // which puts the typed email and password in the URL (browser history, server
  // logs, the Referer header) and never signs in. Keep submit disabled until
  // hydration; SSR and the first client render both see it disabled, so there's
  // no hydration mismatch.
  const hydrated = useHydrated();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Invalid email or password");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  // Pull the dev account's credentials from the gated endpoint, then sign in
  // through the same path as a typed login so the session is identical.
  async function onDevLogin() {
    setError(null);
    setIsLoading(true);

    try {
      const { email, password } = await devCredentials.mutateAsync();
      const { error } = await signIn.email({ email, password });
      if (error) {
        setError(error.message ?? "Dev sign-in failed");
        setIsLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dev login unavailable");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isLoading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !hydrated}
          className="w-full"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {showDevLogin && (
        <div className="space-y-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading || !hydrated}
            onClick={onDevLogin}
            className="w-full"
          >
            Sign in as dev
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Preview and local only. Skips the login when reviewing protected
            pages.
          </p>
        </div>
      )}
    </div>
  );
}
