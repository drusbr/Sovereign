"use client";

import { useState } from "react";
import { Users2, Zap } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { firstSentence } from "@/lib/gameState";
import { getAdvisorsFromState } from "@/lib/advisors";
import { AdvisorCard } from "@/components/advisors/AdvisorCard";
import { AdvisorPanel } from "@/components/advisors/AdvisorPanel";
import { CabinetRoom } from "@/components/advisors/CabinetRoom";

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
  const openAdvisor = advisors.find((a) => a.id === openAdvisorId) ?? null;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Cabinet
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-text">Advisors</h1>
            <span className="text-xs text-text-muted">
              Turn {gameState.turn} · {gameState.date}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5">
          <Zap size={13} className="text-amber-400" />
          <span className="text-xs font-semibold text-text">
            {gameState.actionPoints}/3
          </span>
          <span className="text-xs text-text-muted">Action Points</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleConveneCabinet}
        disabled={gameState.actionPoints < 2}
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-lg border border-amber-400/30 bg-amber-400/5 px-5 py-3.5 text-sm font-semibold text-amber-400 transition hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-40"
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
