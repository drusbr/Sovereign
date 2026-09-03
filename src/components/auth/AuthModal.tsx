"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, GUEST_STATE_KEY } from "@/context/AuthContext";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/supabase/auth";
import { createCampaign } from "@/lib/supabase/campaigns";
import { hydrateGameState, type GameState } from "@/lib/gameState";

export function AuthModal() {
  const {
    authModalOpen,
    authModalTab,
    setAuthModalTab,
    closeAuthModal,
    continueAsGuest,
    refreshUser,
  } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  function resetForm() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
  }

  function switchTab(tab: "signin" | "signup") {
    setAuthModalTab(tab);
    setError(null);
  }

  async function handleSignIn() {
    setError(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await signInWithEmail(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    await refreshUser();
    resetForm();
    closeAuthModal();
    router.push("/campaigns");
  }

  async function handleSignUp() {
    setError(null);
    if (!email || !password || !confirmPassword) {
      setError("Fill in every field.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: signUpError } = await signUpWithEmail(email, password);
    if (signUpError) {
      setSubmitting(false);
      setError(signUpError.message);
      return;
    }
    const newUser = await refreshUser();
    resetForm();
    closeAuthModal();

    // A guest who just signed up: migrate their localStorage save into a
    // real campaign immediately, rather than losing it.
    const guestRaw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(GUEST_STATE_KEY)
        : null;
    if (newUser && guestRaw) {
      try {
        const guestState = hydrateGameState(JSON.parse(guestRaw) as Partial<GameState>);
        const { campaign } = await createCampaign(newUser.id, guestState);
        window.localStorage.removeItem(GUEST_STATE_KEY);
        setSubmitting(false);
        if (campaign) {
          router.push(`/dashboard?campaign=${campaign.id}`);
          return;
        }
      } catch {
        // fall through to a normal campaigns landing if migration failed
      }
    }

    setSubmitting(false);
    router.push("/campaigns");
  }

  async function handleGoogle() {
    setError(null);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) setError(googleError.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-panel shadow-2xl">
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => switchTab("signin")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              authModalTab === "signin"
                ? "border-b-2 border-accent text-text"
                : "text-text-muted hover:text-text"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab("signup")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
              authModalTab === "signup"
                ? "border-b-2 border-accent text-text"
                : "text-text-muted hover:text-text"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              closeAuthModal();
            }}
            className="px-4 text-text-muted hover:text-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {authModalTab === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          {authModalTab === "signin" ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSignIn}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSignUp}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create Account"}
            </button>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full rounded-md border border-border bg-panel-2 px-4 py-2.5 text-sm font-semibold text-text transition hover:border-text-muted"
          >
            Continue with Google
          </button>

          {authModalTab === "signin" ? (
            <button
              type="button"
              onClick={() => {
                continueAsGuest();
                router.push("/setup");
              }}
              className="w-full rounded-md px-4 py-2 text-sm font-medium text-text-muted transition hover:text-text"
            >
              Continue as Guest
            </button>
          ) : (
            <p className="pt-1 text-center text-xs text-text-muted">
              By creating an account you can save up to 3 campaigns and
              resume from any device.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
