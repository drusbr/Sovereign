import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-2xl font-semibold text-text">
        Sign-in failed
      </h1>
      <p className="max-w-sm text-sm text-text-muted">
        Something went wrong completing your sign-in. Please try again.
      </p>
      <Link
        href="/"
        className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
      >
        Back to Sovereign
      </Link>
    </div>
  );
}
