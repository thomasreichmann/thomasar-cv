import Link from "next/link";

import { SignUpForm } from "../_components/sign-up-form";

export default function SignUpPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted">
          Start maintaining your résumé as structured data
        </p>
      </div>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
