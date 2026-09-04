"use client";

import { useGame } from "@/context/GameContext";
import { creditRatingStyle } from "@/lib/economy";
import { SectionHeader } from "@/components/SectionHeader";
import { KeyIndicators } from "@/components/economy/KeyIndicators";
import { GdpTrendChart } from "@/components/economy/GdpTrendChart";
import { BusinessFormationChart } from "@/components/economy/BusinessFormationChart";
import { HealthScorecard } from "@/components/economy/HealthScorecard";
import { FdiTrendChart } from "@/components/economy/FdiTrendChart";
import { PolicyLevers } from "@/components/economy/PolicyLevers";
import { IntelligenceLog } from "@/components/intelligence/IntelligenceLog";
import { FiscalOverview } from "@/components/economy/FiscalOverview";
import { PageHeader } from "@/components/PageHeader";
import { SecondaryNav } from "@/components/SecondaryNav";

export default function EconomyPage() {
  const { gameState } = useGame();
  const ratingStyle = creditRatingStyle(gameState.creditRating);
  const economicEvents = gameState.intelligenceEvents.filter(
    (e) => e.category === "economic"
  );

  return (
    <div className="sovereign-page space-y-7">
      <PageHeader eyebrow="Nation / Economy" title="Economic Situation" description="Production, prices, employment and the federal balance sheet." actions={
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ratingStyle.text} ${ratingStyle.bg} ${ratingStyle.border}`}
          >
            Credit Rating: {gameState.creditRating}
          </span>
          <span className="text-[11px] text-text-muted">
            Last Updated: Turn {gameState.turn} — {gameState.date}
          </span>
        </div>} />
      <SecondaryNav active="Overview" items={[{ label: "Overview", href: "#overview" }, { label: "Fiscal position", href: "#fiscal" }, { label: "Growth & labour", href: "#growth" }]} />

      <div id="overview"><KeyIndicators gameState={gameState} /></div>

      <div id="fiscal">
        <SectionHeader title="Federal Fiscal Position" />
        <FiscalOverview gameState={gameState} />
      </div>

      <div id="growth" className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div>
            <SectionHeader title="GDP Growth Trend" />
            <div className="border-y border-border bg-panel/35 p-4">
              <GdpTrendChart data={gameState.gdpHistory} />
            </div>
          </div>

          <div>
            <SectionHeader title="Business Formation" />
            <div className="border-y border-border bg-panel/35 p-4">
              <p className="mb-1 text-xs text-text-muted">
                New formal registrations · via Empresa Já platform
              </p>
              <BusinessFormationChart data={gameState.businessRegistrationHistory} />
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div>
            <SectionHeader title="Economic Health Scorecard" />
            <HealthScorecard gameState={gameState} />
          </div>

          <div>
            <SectionHeader title="FDI Trend" />
            <div className="border-y border-border bg-panel/35 p-4">
              <p className="mb-1 text-xs text-text-muted">
                Foreign Direct Investment (R$bn per turn)
              </p>
              <FdiTrendChart data={gameState.fdiHistory} />
            </div>
          </div>
        </div>
      </div>

      <PolicyLevers />

      <IntelligenceLog
        events={economicEvents}
        title="Economic Intelligence"
        emptyMessage="No significant economic events recorded."
      />
    </div>
  );
}
