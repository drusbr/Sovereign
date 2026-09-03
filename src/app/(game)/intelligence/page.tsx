"use client";

import { useGame } from "@/context/GameContext";
import { ThreatOverview } from "@/components/intelligence/ThreatOverview";
import { OrganisationTracker } from "@/components/intelligence/OrganisationTracker";
import { OperationsTable } from "@/components/intelligence/OperationsTable";
import { IntelligenceLog } from "@/components/intelligence/IntelligenceLog";
import { TerritorialAssessment } from "@/components/intelligence/TerritorialAssessment";

export default function IntelligencePage() {
  const { gameState, cancelLifecycle } = useGame();

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Intelligence Briefing
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-text">
              {gameState.countryName}
            </h1>
            <span className="text-xs text-text-muted">{gameState.date}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-sm bg-danger/20 px-2 py-1 text-[10px] font-bold tracking-wider text-danger">
            CLASSIFIED — EYES ONLY
          </span>
          <span className="text-[11px] text-text-muted">
            Last Updated: Turn {gameState.turn} — {gameState.date}
          </span>
        </div>
      </div>

      <ThreatOverview gameState={gameState} />
      <OrganisationTracker organisations={gameState.criminalOrganisations} />
      <OperationsTable operations={gameState.activeOperations} onCancel={(id) => void cancelLifecycle(id)} />
      <IntelligenceLog events={gameState.intelligenceEvents} />
      <TerritorialAssessment stateSecurity={gameState.stateSecurity} />
    </div>
  );
}
