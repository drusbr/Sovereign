"use client";

import { useAuth } from "@/context/AuthContext";

export function GuestBanner() {
  const { isGuest, user, openAuthModal } = useAuth();

  if (!isGuest || user) return null;

  return (
    <div className="flex items-center justify-center gap-3 border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-300">
      <span>
        Playing as guest — your progress won&apos;t be saved. Sign up to
        save your campaign.
      </span>
      <button
        type="button"
        onClick={() => openAuthModal("signup")}
        className="shrink-0 rounded-md border border-amber-400/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-400/10"
      >
        Create Account
      </button>
    </div>
  );
}
