"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function Hero() {
  const { isGuest, openAuthModal } = useAuth();

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(59,130,246,0.08), transparent 70%)",
        }}
      />

      <div className="landing-fade-in relative z-10 flex flex-col items-center text-center">
        <h1 className="text-5xl font-thin uppercase tracking-[0.35em] text-text sm:text-7xl">
          Sovereign
        </h1>

        <div className="mt-8 h-px w-16 bg-border" />

        <p className="mt-8 text-lg font-medium text-text/90 sm:text-xl">
          Govern. Decide. Face the consequences.
        </p>

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
          You have inherited a nation in crisis. Every order you issue, every
          alliance you forge, every reform you delay — the world responds.
          There are no right answers. Only trade-offs.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          {isGuest && (
            <Link
              href="/dashboard"
              className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
            >
              Resume Game
            </Link>
          )}

          {isGuest ? (
            <button
              type="button"
              onClick={() => openAuthModal("signup")}
              className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-text transition hover:border-text-muted hover:bg-panel/60"
            >
              Begin Campaign
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("signin")}
              className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
            >
              Begin Campaign
            </button>
          )}

          <Link
            href="/wiki"
            className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-text transition hover:border-text-muted hover:bg-panel/60"
          >
            Learn How It Works
          </Link>
        </div>
      </div>
    </section>
  );
}
