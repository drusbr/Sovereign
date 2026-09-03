"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { createInitialGameState, type GameState } from "@/lib/gameState";
import { findCandidateById, type AdvisorRole } from "@/lib/advisorCandidates";
import { ADVISOR_ROLE_LABELS } from "@/lib/advisorCandidates";
import { getAlignment, getPoliticalBackground, getPriority } from "@/lib/setupData";
import { Avatar } from "@/components/setup/Avatar";
import type { SetupState } from "@/lib/setupWizard";
import { buildCampaignGameState } from "@/lib/setupWizard";
import { fmt, fmtDelta, fmtPct } from "@/lib/format";

function StatDelta({
  label,
  baseline,
  value,
  isPercent = false,
}: {
  label: string;
  baseline: number;
  value: number;
  isPercent?: boolean;
}) {
  const delta = Math.round((value - baseline) * 10) / 10;
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const color =
    delta > 0 ? "text-positive" : delta < 0 ? "text-danger" : "text-text-muted";

  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-bold text-text">
          {isPercent ? fmtPct(value) : fmt(value)}
        </span>
        {delta !== 0 && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${color}`}>
            <Icon size={12} />
            {fmtDelta(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

export function Step5Confirm({ setup }: { setup: SetupState }) {
  const preview: GameState = buildCampaignGameState(setup);
  const baseline = createInitialGameState();

  const background = setup.backgroundId ? getPoliticalBackground(setup.backgroundId) : undefined;
  const alignment = setup.alignment ? getAlignment(setup.alignment) : undefined;

  const roleOrder: AdvisorRole[] = ["chief_of_staff", "security", "economic", "foreign", "social"];
  const advisorEntries = roleOrder
    .map((role) => {
      const id = setup.selectedAdvisors[role];
      return id ? findCandidateById(id) : undefined;
    })
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold uppercase tracking-widest text-text sm:text-4xl">
        Your Presidency
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Review your choices before your term begins.
      </p>

      <div className="mt-8 rounded-lg border border-border bg-panel/60 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar
            seed={setup.portraitSeed ?? "portrait-01"}
            className="h-24 w-24 shrink-0 rounded-full"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold text-text">{setup.name || "The President"}</p>
            <p className="text-sm text-text-muted">
              Age {setup.age} · {preview.playerHomeState} · {background?.title ?? "—"}
            </p>
            {alignment && (
              <span className="mt-2 inline-block rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                {alignment.name}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
            Cabinet
          </p>
          <div className="flex flex-wrap gap-4">
            {advisorEntries.map((advisor) => (
              <div key={advisor.id} className="flex items-center gap-2">
                <Avatar seed={advisor.avatarSeed} className="h-8 w-8 rounded-full" />
                <div>
                  <p className="text-xs font-semibold text-text">{advisor.name}</p>
                  <p className="text-[10px] text-text-muted">
                    {ADVISOR_ROLE_LABELS[advisor.role]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
            Priorities
          </p>
          <div className="flex flex-wrap gap-2">
            {setup.priorities.map((id, i) => (
              <span
                key={id}
                className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent"
              >
                {["1st", "2nd", "3rd"][i]} — {getPriority(id)?.title}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
            Manifesto
          </p>
          <blockquote className="border-l-2 border-accent pl-4 text-sm italic leading-relaxed text-text-muted">
            &ldquo;{setup.manifesto}&rdquo;
          </blockquote>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Starting Conditions
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatDelta label="Approval" baseline={baseline.approval} value={preview.approval} isPercent />
          <StatDelta
            label="Security Index"
            baseline={baseline.securityIndex}
            value={preview.securityIndex}
          />
          <StatDelta
            label="GDP Growth"
            baseline={baseline.gdpGrowth}
            value={preview.gdpGrowth}
            isPercent
          />
          <StatDelta
            label="Congressional Support"
            baseline={baseline.congressionalSupport}
            value={preview.congressionalSupport}
            isPercent
          />
        </div>
      </div>
    </div>
  );
}
