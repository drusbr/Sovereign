import { Suspense, type ReactNode } from "react";
import { GameProvider } from "@/context/GameContext";
import { Sidebar } from "@/components/Sidebar";
import { PageTransition } from "@/components/PageTransition";
import { EventModal } from "@/components/EventModal";
import { FailureAlertModal } from "@/components/FailureAlertModal";
import { GuestBanner } from "@/components/auth/GuestBanner";
import { GameHeader } from "@/components/GameHeader";

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GameProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-background">
          <GuestBanner />
          <div className="flex min-h-0 flex-1">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-y-auto">
              <GameHeader />
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
        <EventModal />
        <FailureAlertModal />
      </GameProvider>
    </Suspense>
  );
}
