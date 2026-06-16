import Link from "next/link";

import { SignInForm } from "../_components/sign-in-form";

export default function SignInPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sign in to your account
        </p>
      </div>
      <SignInForm />
      <p className="mt-6 text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-neutral-900 underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
