"use client";

import { useState } from "react";
import { Users2, Zap } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { firstSentence } from "@/lib/gameState";
import { getAdvisorsFromState } from "@/lib/advisors";
import { AdvisorCard } from "@/components/advisors/AdvisorCard";
import { AdvisorPanel } from "@/components/advisors/AdvisorPanel";
import { CabinetRoom } from "@/components/advisors/CabinetRoom";
import { PolicyDevelopmentSection } from "@/components/advisors/PolicyDevelopmentSection";
import { PageHeader } from "@/components/PageHeader";
import { generatePolicyRecommendations } from "@/lib/recommendations";

export default function AdvisorsPage() {
  const {
    gameState,
    advisorBriefings,
    advisorLoading,
    advisorErrors,
    fetchAdvisorBriefing,
    spendActionPoints,
  } = useGame();
  const [openAdvisorId, setOpenAdvisorId] = useState<string | null>(null);
  const [cabinetOpen, setCabinetOpen] = useState(false);

  function handleOpen(advisorId: string) {
    setOpenAdvisorId(advisorId);
    void fetchAdvisorBriefing(advisorId);
  }

  function handleConveneCabinet() {
    if (spendActionPoints(2)) {
      setCabinetOpen(true);
    }
  }

  const advisors = getAdvisorsFromState(gameState);
  const recommendations = gameState.policyRecommendations.length ? gameState.policyRecommendations : generatePolicyRecommendations(gameState);
  const openAdvisor = advisors.find((a) => a.id === openAdvisorId) ?? null;

  return (
    <div className="sovereign-page">
      <PageHeader eyebrow="Presidency / Cabinet" title="Council of Ministers" description="Confidential briefings and direct consultation with your government." actions={<div className="flex shrink-0 items-center gap-1.5 border border-border bg-panel px-3 py-1.5">
          <Zap size={13} className="text-amber-400" />
          <span className="text-xs font-semibold text-text">
            {gameState.actionPoints}/3
          </span>
          <span className="text-xs text-text-muted">Action Points</span>
        </div>} />

      <button
        type="button"
        onClick={handleConveneCabinet}
        disabled={gameState.actionPoints < 2}
        className="mt-5 flex w-full items-center justify-center gap-2.5 border border-brass/40 bg-brass/5 px-5 py-3.5 text-sm font-semibold text-brass transition hover:bg-brass/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Users2 size={16} />
        Convene Cabinet
        <span className="text-xs font-normal text-text-muted">(-2 AP)</span>
      </button>
      {gameState.actionPoints < 2 && (
        <p className="mt-1.5 text-center text-xs text-text-muted">
          Not enough action points to convene the full cabinet this turn.
        </p>
      )}

      <section className="mt-6 border-y border-border bg-panel/25 px-4 py-4">
        <div className="flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-widest text-text">Strategic recommendations</h2><span className="text-[10px] uppercase tracking-wider text-text-muted">Deterministic government assessment</span></div>
        <div className="mt-3 grid gap-x-6 gap-y-1 lg:grid-cols-2">{recommendations.slice(0, 6).map((item) => {
          const advisor = advisors.find((candidate) => candidate.role === item.advisorRole);
          return <div key={item.id} className="border-t border-border py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-text">{item.title}</p><p className="mt-1 text-xs leading-5 text-text-muted">{item.rationale}</p></div><span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-brass">{item.difficulty}</span></div><p className="mt-2 text-xs text-text"><span className="text-text-muted">{advisor?.name ?? "Cabinet"}: </span>{item.action}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Required institution: {item.institution}</p></div>;
        })}</div>
      </section>

      <PolicyDevelopmentSection />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {advisors.map((advisor) => {
          const briefing = advisorBriefings[advisor.id];
          const isUpToDate = briefing?.turnGenerated === gameState.turn;
          const preview = briefing
            ? firstSentence(briefing.report, 90)
            : "No briefing prepared yet this turn.";

          return (
            <AdvisorCard
              key={advisor.id}
              advisor={advisor}
              preview={preview}
              isUpToDate={isUpToDate}
              onClick={() => handleOpen(advisor.id)}
            />
          );
        })}
      </div>

      <AdvisorPanel
        advisor={openAdvisor}
        briefing={openAdvisorId ? advisorBriefings[openAdvisorId] : undefined}
        isLoading={openAdvisorId ? !!advisorLoading[openAdvisorId] : false}
        error={openAdvisorId ? advisorErrors[openAdvisorId] : undefined}
        date={gameState.date}
        onClose={() => setOpenAdvisorId(null)}
      />

      {cabinetOpen && <CabinetRoom onClose={() => setCabinetOpen(false)} />}
    </div>
  );
}
