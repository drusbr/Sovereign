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
import { PageHeader } from "@/components/PageHeader";
import { SecondaryNav } from "@/components/SecondaryNav";
import { WorldMap, type CountrySelection } from "@/components/map/WorldMap";

export default function DiplomacyPage() {
  const { gameState } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mapSelection, setMapSelection] = useState<CountrySelection>({ id: "BRA", isoA3: "BRA", name: "Brazil" });

  const selectedRelation =
    gameState.diplomaticRelations.find((r) => r.id === selectedId) ?? null;
  const standingColor = globalStandingColor(gameState.globalStanding);

  function handleToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  }

  return (
    <div className="sovereign-page space-y-7">
      <PageHeader eyebrow="World / Foreign Affairs" title="The World" description="Brazil's diplomatic position, external pressure and strategic openings." actions={<span
          className="border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: standingColor,
            borderColor: `${standingColor}4d`,
            backgroundColor: `${standingColor}1a`,
          }}
        >
          Global Standing: {fmtScore(gameState.globalStanding)}
        </span>} />
      <SecondaryNav active="Strategic map" items={[{label:"Strategic map",href:"#map"},{label:"Bilateral relations",href:"#relations"},{label:"Diplomatic calendar",href:"#calendar"}]} />

      <section id="map" className="border-y border-border bg-panel/25">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-[10px] uppercase tracking-widest text-text-muted"><span>Global strategic picture</span><span>Selected: <b className="text-text">{mapSelection.name} · {mapSelection.isoA3 ?? mapSelection.id}</b></span></div>
        <WorldMap selectedCountryId={mapSelection.id} onCountrySelect={setMapSelection} className="min-h-[360px]" />
      </section>

      <KpiStrip gameState={gameState} />

      <div id="relations" className="grid grid-cols-1 gap-6 lg:grid-cols-5">
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

      <div id="calendar"><DiplomaticCalendar events={gameState.upcomingDiplomaticEvents} currentTurn={gameState.turn} /></div>

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
