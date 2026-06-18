"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { signUp } from "@/lib/auth/client";

/**
 * Email + password sign-up. BetterAuth creates the user and signs them in in
 * one call, so on success we go straight to the dashboard; errors (e.g. an
 * email already in use) surface inline.
 */
export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await signUp.email({ name, email, password });

    if (error) {
      setError(error.message ?? "Could not create your account");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/20 bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          disabled={isLoading}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent disabled:opacity-60"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isLoading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent disabled:opacity-60"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={isLoading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-paper px-4 py-2.5 text-sm font-semibold text-paper-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isLoading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
