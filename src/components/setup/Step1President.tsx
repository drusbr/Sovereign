"use client";

import { Shield, BookOpen, TrendingUp, Scale, Users, Heart, type LucideIcon } from "lucide-react";
import { BRAZIL_STATES } from "@/lib/brazilStates";
import { POLITICAL_BACKGROUNDS, PORTRAIT_SEEDS } from "@/lib/setupData";
import type { SetupState } from "@/lib/setupWizard";
import { Avatar } from "@/components/setup/Avatar";

const ICONS: Record<string, LucideIcon> = {
  Shield,
  BookOpen,
  TrendingUp,
  Scale,
  Users,
  Heart,
};

const BIO_MAX = 300;

export function Step1President({
  setup,
  onChange,
}: {
  setup: SetupState;
  onChange: (patch: Partial<SetupState>) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold uppercase tracking-widest text-text sm:text-4xl">
        Who Are You?
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Your background shapes how the country sees you from day one.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Full Name
          </label>
          <input
            type="text"
            value={setup.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Enter your full name"
            className="w-full rounded-md border border-border bg-panel px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
            Age — {setup.age}
          </label>
          <input
            type="range"
            min={35}
            max={75}
            value={setup.age}
            onChange={(e) => onChange({ age: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Gender
        </label>
        <div className="flex gap-2">
          {(
            [
              { id: "he", label: "He / Him" },
              { id: "she", label: "She / Her" },
              { id: "they", label: "They / Them" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ gender: opt.id })}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-semibold transition ${
                setup.gender === opt.id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-panel text-text-muted hover:text-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Home State
        </label>
        <select
          value={setup.homeStateId}
          onChange={(e) => onChange({ homeStateId: e.target.value })}
          className="w-full rounded-md border border-border bg-panel px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
        >
          {BRAZIL_STATES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Political Background
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POLITICAL_BACKGROUNDS.map((bg) => {
            const Icon = ICONS[bg.icon];
            const isSelected = setup.backgroundId === bg.id;
            return (
              <button
                key={bg.id}
                type="button"
                onClick={() => onChange({ backgroundId: bg.id })}
                className={`rounded-lg border p-4 text-left transition ${
                  isSelected
                    ? "border-accent bg-accent/[0.06]"
                    : "border-border bg-panel hover:border-text-muted/40"
                }`}
              >
                <Icon size={20} className={isSelected ? "text-accent" : "text-text-muted"} />
                <p className="mt-2 text-sm font-semibold text-text">{bg.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {bg.description}
                </p>
                <p className="mt-2 text-[11px] font-medium text-positive">
                  Starting bonus: {bg.bonusLine}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Presidential Bio
          </label>
          <span className="text-[11px] text-text-muted">
            {setup.bio.length}/{BIO_MAX}
          </span>
        </div>
        <textarea
          value={setup.bio}
          onChange={(e) => onChange({ bio: e.target.value.slice(0, BIO_MAX) })}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="Write 2-3 sentences about your president. This will be referenced throughout the game by advisors and the press."
          className="mt-1.5 w-full resize-none rounded-md border border-border bg-panel px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="mt-8">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-text-muted">
          Portrait
        </label>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {PORTRAIT_SEEDS.map((seed) => {
            const isSelected = setup.portraitSeed === seed;
            return (
              <button
                key={seed}
                type="button"
                onClick={() => onChange({ portraitSeed: seed })}
                className={`aspect-square overflow-hidden rounded-full transition ${
                  isSelected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
                }`}
              >
                <Avatar seed={seed} className="h-full w-full" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
