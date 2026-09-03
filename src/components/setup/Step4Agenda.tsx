"use client";

import {
  TrendingUp,
  Shield,
  Scale,
  Heart,
  Leaf,
  BookOpen,
  Activity,
  Globe,
  Building,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { PRESIDENTIAL_PRIORITIES, type PriorityId } from "@/lib/setupData";

const ICONS: Record<string, LucideIcon> = {
  TrendingUp,
  Shield,
  Scale,
  Heart,
  Leaf,
  BookOpen,
  Activity,
  Globe,
  Building,
  Landmark,
};

const ORDINALS = ["1st", "2nd", "3rd"];
const MANIFESTO_MAX = 500;

export function Step4Agenda({
  priorities,
  manifesto,
  onTogglePriority,
  onManifestoChange,
}: {
  priorities: PriorityId[];
  manifesto: string;
  onTogglePriority: (id: PriorityId) => void;
  onManifestoChange: (text: string) => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold uppercase tracking-widest text-text sm:text-4xl">
        What Will You Fight For?
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Set your governing priorities. These shape your starting projects, your advisors&apos;
        focus, and how the country judges your presidency.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRESIDENTIAL_PRIORITIES.map((p) => {
          const Icon = ICONS[p.icon];
          const rank = priorities.indexOf(p.id);
          const isSelected = rank !== -1;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onTogglePriority(p.id)}
              disabled={!isSelected && priorities.length >= 3}
              className={`relative rounded-lg border p-4 text-left transition ${
                isSelected
                  ? "border-accent bg-accent/[0.06]"
                  : "border-border bg-panel hover:border-text-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
              }`}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                  {ORDINALS[rank]}
                </span>
              )}
              <Icon size={20} className={isSelected ? "text-accent" : "text-text-muted"} />
              <p className="mt-2 text-sm font-semibold text-text">{p.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{p.description}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Selected {priorities.length}/3 — the order matters. The first pick is your primary
        priority.
      </p>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Your Presidential Manifesto
          </label>
          <span className="text-[11px] text-text-muted">
            {manifesto.length}/{MANIFESTO_MAX}
          </span>
        </div>
        <textarea
          value={manifesto}
          onChange={(e) => onManifestoChange(e.target.value.slice(0, MANIFESTO_MAX))}
          maxLength={MANIFESTO_MAX}
          rows={5}
          placeholder="In one paragraph, describe the kind of president you intend to be and the Brazil you are trying to build. This will be referenced throughout your term."
          className="mt-1.5 w-full resize-none rounded-md border border-border bg-panel px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>
    </div>
  );
}
