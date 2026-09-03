"use client";

import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { globalStandingColor } from "@/lib/diplomacy";
import { KpiStrip } from "@/components/diplomacy/KpiStrip";
import { BilateralRelations } from "@/components/diplomacy/BilateralRelations";
import { RelationPanel } from "@/components/diplomacy/RelationPanel";
import { ActivePressure } from "@/components/diplomacy/ActivePressure";
import { DiplomaticOpportunities } from "@/components/diplomacy/DiplomaticOpportunities";
import { DiplomaticCalendar } from "@/components/diplomacy/DiplomaticCalendar";
import { DiplomaticRecord } from "@/components/diplomacy/DiplomaticRecord";
import { fmtScore } from "@/lib/format";

export default function DiplomacyPage() {
  const { gameState } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedRelation =
    gameState.diplomaticRelations.find((r) => r.id === selectedId) ?? null;
  const standingColor = globalStandingColor(gameState.globalStanding);

  function handleToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Diplomatic Situation Room
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-text">
              {gameState.countryName}
            </h1>
            <span className="text-xs text-text-muted">{gameState.date}</span>
          </div>
        </div>

        <span
          className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: standingColor,
            borderColor: `${standingColor}4d`,
            backgroundColor: `${standingColor}1a`,
          }}
        >
          Global Standing: {fmtScore(gameState.globalStanding)}
        </span>
      </div>

      <KpiStrip gameState={gameState} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <BilateralRelations
            relations={gameState.diplomaticRelations}
            onSelect={setSelectedId}
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <ActivePressure pressures={gameState.diplomaticPressures} />
          <DiplomaticOpportunities
            opportunities={gameState.diplomaticOpportunities}
            relations={gameState.diplomaticRelations}
            currentTurn={gameState.turn}
          />
        </div>
      </div>

      <DiplomaticCalendar
        events={gameState.upcomingDiplomaticEvents}
        currentTurn={gameState.turn}
      />

      <DiplomaticRecord events={gameState.diplomaticEvents} />

      <RelationPanel
        relation={selectedRelation}
        events={gameState.diplomaticEvents}
        onClose={() => setSelectedId(null)}
        onAction={handleToast}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-lg border border-accent/30 bg-panel px-4 py-3 text-sm text-text shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
