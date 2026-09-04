"use client";

import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { KpiStrip } from "@/components/media/KpiStrip";
import { PressFeed } from "@/components/media/PressFeed";
import { InterviewRequests } from "@/components/media/InterviewRequests";
import { SpinRoom } from "@/components/media/SpinRoom";
import { SentimentTrend } from "@/components/media/SentimentTrend";
import { PageHeader } from "@/components/PageHeader";
import { SecondaryNav } from "@/components/SecondaryNav";
import { InterviewEncounter } from "@/components/media/InterviewEncounter";

export default function MediaPage() {
  const { gameState, acceptInterview, declineInterview, startInteractiveEncounter, answerInteractiveEncounter } = useGame();
  const [toast, setToast] = useState<string | null>(null);
  const [openEncounterId, setOpenEncounterId] = useState<string | null>(null);
  const openEncounter = gameState.encounters.find((encounter) => encounter.id === openEncounterId) ?? null;

  function handleAccept(id: string) {
    acceptInterview(id);
    setToast("Interview accepted. The briefing room is ready.");
    setTimeout(() => setToast(null), 5000);
  }

  function handleDecline(id: string) {
    declineInterview(id);
  }

  function handleBegin(requestId: string) {
    const encounter = gameState.encounters.find((item) => item.sourceRequestId === requestId);
    if (encounter) setOpenEncounterId(encounter.id);
  }

  return (
    <div className="sovereign-page space-y-7">
      <PageHeader eyebrow="Media environment" title="The National Press" description="Coverage, editorial reaction and requests for presidential access." meta={`${gameState.date} · Turn ${gameState.turn}`} />
      <SecondaryNav active="Front Page" items={[{label:"Front Page",href:"/media"},{label:"Interviews",href:"/media#interviews"},{label:"Communications",href:"/orders"}]}/>

      <KpiStrip gameState={gameState} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 xl:col-span-4">
          <PressFeed articles={gameState.newsArticles} />
        </div>

        <div id="interviews" className="space-y-6 lg:col-span-2 xl:col-span-1">
          <InterviewRequests
            interviews={gameState.pendingInterviews}
            currentTurn={gameState.turn}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onBegin={handleBegin}
          />
          <SpinRoom />
        </div>
      </div>

      <SentimentTrend
        history={gameState.mediaSentimentHistory}
        currentTurn={gameState.turn}
        events={gameState.mediaEvents}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-lg border border-accent/30 bg-panel px-4 py-3 text-sm text-text shadow-2xl">
          {toast}
        </div>
      )}
      {openEncounter && <InterviewEncounter encounter={openEncounter} onStart={() => startInteractiveEncounter(openEncounter.id)} onAnswer={(questionId, responseId) => answerInteractiveEncounter(openEncounter.id, questionId, responseId)} onClose={() => setOpenEncounterId(null)} />}
    </div>
  );
}
