import type { ReactNode } from "react";
import { GameProvider } from "@/context/GameContext";
import { Sidebar } from "@/components/Sidebar";
import { PageTransition } from "@/components/PageTransition";
import { EventModal } from "@/components/EventModal";
import { FailureAlertModal } from "@/components/FailureAlertModal";

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <EventModal />
      <FailureAlertModal />
    </GameProvider>
  );
}
