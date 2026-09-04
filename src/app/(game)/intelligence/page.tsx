"use client";

import { useGame } from "@/context/GameContext";
import { ThreatOverview } from "@/components/intelligence/ThreatOverview";
import { OrganisationTracker } from "@/components/intelligence/OrganisationTracker";
import { OperationsTable } from "@/components/intelligence/OperationsTable";
import { IntelligenceLog } from "@/components/intelligence/IntelligenceLog";
import { TerritorialAssessment } from "@/components/intelligence/TerritorialAssessment";
import { PageHeader } from "@/components/PageHeader";
import { SecondaryNav } from "@/components/SecondaryNav";

export default function IntelligencePage() {
  const { gameState, cancelLifecycle } = useGame();

  return (
    <div className="sovereign-page space-y-7">
      <PageHeader eyebrow="Nation / Security" title="National Security Assessment" description="Threat actors, federal operations and territorial control." actions={<div className="flex flex-col items-end gap-1.5">
          <span className="rounded-sm bg-danger/20 px-2 py-1 text-[10px] font-bold tracking-wider text-danger">
            CLASSIFIED — EYES ONLY
          </span>
          <span className="text-[11px] text-text-muted">
            Last Updated: Turn {gameState.turn} — {gameState.date}
          </span>
        </div>} />
      <SecondaryNav active="Overview" items={[{label:"Overview",href:"#overview"},{label:"Threat actors",href:"#actors"},{label:"Operations",href:"#operations"},{label:"Territory",href:"#territory"}]} />

      <div id="overview"><ThreatOverview gameState={gameState} /></div>
      <div id="actors"><OrganisationTracker organisations={gameState.criminalOrganisations} /></div>
      <div id="operations"><OperationsTable operations={gameState.activeOperations} onCancel={(id) => void cancelLifecycle(id)} /></div>
      <IntelligenceLog events={gameState.intelligenceEvents} />
      <div id="territory"><TerritorialAssessment stateSecurity={gameState.stateSecurity} /></div>
    </div>
  );
}
