"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { Panel } from "@/components/dashboard/Panel";
import { CircularProgress } from "@/components/dashboard/CircularProgress";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { Sparkline } from "@/components/dashboard/Sparkline";
import {
  WorldMap,
  type CountrySelection,
} from "@/components/map/WorldMap";
import { WorldDriftLog } from "@/components/dashboard/WorldDriftLog";
import { WorldEventsWidget } from "@/components/dashboard/WorldEventsWidget";
import { GoverningCapacity } from "@/components/dashboard/GoverningCapacity";

function approvalColor(value: number) {
  if (value >= 50) return "#10b981";
  if (value >= 30) return "#f59e0b";
  return "#ef4444";
}

function trendVisuals(change: number) {
  const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
  const color =
    change > 0 ? "text-positive" : change < 0 ? "text-danger" : "text-text-muted";
  return { Icon, color };
}

export default function DashboardPage() {
  const { gameState, lastResult } = useGame();
  const [selectedCountry, setSelectedCountry] = useState<CountrySelection>({
    id: "BRA",
    name: "Brazil",
    isoA3: "BRA",
  });
  const approvalChange = lastResult?.approvalChange ?? 0;
  const securityChange = lastResult?.securityIndexChange ?? 0;
  const approvalTrend = trendVisuals(approvalChange);
  const securityTrend = trendVisuals(securityChange);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text">
            National Situation Room
          </h1>
          <p className="text-xs text-text-muted">
            {gameState.countryName} · Turn {gameState.turn} · {gameState.date}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Global Strategic Overview"
          className="lg:col-span-2"
          bodyClassName="p-0"
        >
          <WorldMap
            className="h-[clamp(420px,58vh,620px)]"
            selectedCountryId={selectedCountry.id}
            onCountrySelect={setSelectedCountry}
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-4 py-3 text-xs text-text-muted">
            <span>
              Selected: <strong className="font-medium text-text">{selectedCountry.name}</strong>
              <span className="ml-2 font-mono text-accent">{selectedCountry.id}</span>
            </span>
            <span className="sm:ml-auto">Wheel to zoom · Drag to pan · Click to inspect</span>
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Approval Rating">
            <div className="flex items-center gap-4">
              <div className="relative flex h-[88px] w-[88px] items-center justify-center">
                <CircularProgress
                  value={gameState.approval}
                  color={approvalColor(gameState.approval)}
                />
                <span className="absolute text-xl font-bold text-text">
                  {gameState.approval}%
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${approvalTrend.color}`}
                >
                  <approvalTrend.Icon size={14} />
                  {approvalChange > 0 ? "+" : ""}
                  {lastResult ? approvalChange : 0} last turn
                </span>
                <span className="text-xs text-text-muted">
                  National approval index
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Security Index">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-text">
                {gameState.securityIndex}
                <span className="text-sm font-normal text-text-muted">
                  /100
                </span>
              </span>
              {lastResult && securityChange !== 0 && (
                <span
                  className={`flex items-center gap-1 text-xs font-semibold ${securityTrend.color}`}
                >
                  <securityTrend.Icon size={12} />
                  {securityChange > 0 ? "+" : ""}
                  {securityChange} last turn
                </span>
              )}
            </div>
            <div className="mt-3">
              <ProgressBar value={gameState.securityIndex} color="#3b82f6" />
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-5">
            <Panel title="GDP Growth">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-text">
                  {gameState.gdpGrowth}%
                </span>
                <Sparkline data={gameState.gdpHistory} color="#3b82f6" />
              </div>
            </Panel>

            <Panel title="Inflation">
              <span
                className={`text-2xl font-bold ${
                  gameState.inflation > 5 ? "text-danger" : "text-text"
                }`}
              >
                {gameState.inflation}%
              </span>
              <p className="mt-1 text-xs text-text-muted">
                {gameState.inflation > 5 ? "Above target" : "Within target"}
              </p>
            </Panel>
          </div>

          <Panel title="Active Projects">
            <span className="text-2xl font-bold text-text">
              {gameState.activeProjects}
            </span>
            <p className="mt-1 text-xs text-text-muted">
              Ongoing federal initiatives
            </p>
          </Panel>
        </div>

        <Panel title="Current Situation" className="lg:col-span-3">
          <p className="text-sm leading-relaxed text-text-muted">
            {gameState.situation}
          </p>
          <WorldDriftLog entries={gameState.worldDriftLog} />
          <GoverningCapacity
            congressionalSupport={gameState.congressionalSupport}
            civilLiberties={gameState.civilLiberties}
            internationalPressure={gameState.internationalPressure}
            approval={gameState.approval}
          />
        </Panel>

        <WorldEventsWidget events={gameState.worldEvents} />
      </div>
    </div>
  );
}
