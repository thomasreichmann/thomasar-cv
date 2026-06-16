import Link from "next/link";

import { SignUpForm } from "../_components/sign-up-form";

export default function SignUpPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Start maintaining your résumé as structured data
        </p>
      </div>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-neutral-900 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
