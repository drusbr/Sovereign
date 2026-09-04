"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Command } from "lucide-react";
import { useGame } from "@/context/GameContext";

const LABELS: Record<string, string> = { "/dashboard": "Presidential Briefing", "/orders": "Decision Desk", "/advisors": "Advisory Council", "/congress": "National Congress", "/projects": "Government Programmes", "/economy": "National Economy", "/intelligence": "Security & Intelligence", "/diplomacy": "World Affairs", "/events": "World Developments", "/media": "National Press", "/settings": "Settings" };

export function GameHeader() {
  const pathname = usePathname(); const { gameState } = useGame();
  const urgent = gameState.worldEvents.filter((event) => event.requiresResponse && event.status === "active").length;
  return <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:px-7">
    <div className="min-w-0"><p className="truncate text-[10px] uppercase tracking-[0.18em] text-text-muted">{gameState.countryName} / {LABELS[pathname] ?? "Government"}</p><p className="truncate text-sm font-medium text-text">{gameState.date}</p></div>
    <div className="ml-auto flex items-center divide-x divide-border border-x border-border text-xs tabular">
      <div className="px-3 py-1 text-center"><span className="block text-[9px] uppercase tracking-wider text-text-muted">Turn</span><b className="text-text">{gameState.turn}</b></div>
      <div className="px-3 py-1 text-center"><span className="block text-[9px] uppercase tracking-wider text-text-muted">Actions</span><b className="text-text">{gameState.actionPoints} / 3</b></div>
      <Link href="/events" className={`flex min-h-12 items-center gap-2 px-3 ${urgent ? "text-danger" : "text-text-muted"}`}><AlertTriangle size={14}/><span className="hidden sm:inline">{urgent ? `${urgent} urgent` : "No alerts"}</span></Link>
      <Link href="/orders" className="flex min-h-12 items-center gap-2 px-3 font-semibold text-text hover:bg-panel-2"><Command size={14}/> <span className="hidden sm:inline">Issue orders</span></Link>
    </div>
  </header>;
}
