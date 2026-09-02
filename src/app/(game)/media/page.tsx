"use client";

import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { KpiStrip } from "@/components/media/KpiStrip";
import { PressFeed } from "@/components/media/PressFeed";
import { InterviewRequests } from "@/components/media/InterviewRequests";
import { SpinRoom } from "@/components/media/SpinRoom";
import { SentimentTrend } from "@/components/media/SentimentTrend";

export default function MediaPage() {
  const { gameState, acceptInterview, declineInterview } = useGame();
  const [toast, setToast] = useState<string | null>(null);

  function handleAccept(id: string) {
    acceptInterview(id);
    setToast(
      "Interview accepted. Conduct it from the Orders page by issuing orders that reference the interview."
    );
    setTimeout(() => setToast(null), 5000);
  }

  function handleDecline(id: string) {
    declineInterview(id);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Media Monitoring
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-text">
              {gameState.countryName}
            </h1>
            <span className="text-xs text-text-muted">{gameState.date}</span>
          </div>
        </div>

        <span className="flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-danger">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
          </span>
          Live
        </span>
      </div>

      <KpiStrip gameState={gameState} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PressFeed articles={gameState.newsArticles} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <InterviewRequests
            interviews={gameState.pendingInterviews}
            currentTurn={gameState.turn}
            onAccept={handleAccept}
            onDecline={handleDecline}
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
    </div>
  );
}
