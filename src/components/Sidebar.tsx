"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Users,
  Shield,
  Globe,
  TrendingUp,
  Newspaper,
  AlertTriangle,
  Settings,
  BookOpen,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { useGame } from "@/context/GameContext";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: FileText },
  { href: "/congress", label: "Congress", icon: Landmark },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/advisors", label: "Advisors", icon: Users },
  { href: "/intelligence", label: "Intelligence", icon: Shield },
  { href: "/diplomacy", label: "Diplomacy", icon: Globe },
  { href: "/economy", label: "Economy", icon: TrendingUp },
  { href: "/media", label: "Media", icon: Newspaper },
  { href: "/events", label: "Events", icon: AlertTriangle },
  { href: "/settings", label: "Settings", icon: Settings },
];

function approvalColor(approval: number) {
  if (approval >= 50) return "text-positive";
  if (approval >= 30) return "text-amber-400";
  return "text-danger";
}

export function Sidebar() {
  const pathname = usePathname();
  const { gameState, saveStatus } = useGame();
  const urgentEventCount = gameState.worldEvents.filter(
    (e) => e.requiresResponse && e.status === "active"
  ).length;

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-panel">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">🇧🇷</span>
          <span className="text-sm font-bold tracking-wide text-text">
            PLANALTO
          </span>
        </div>
      </div>
      <div className="border-t border-border" />

      <div className="px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-text-muted">
          {gameState.playerTitle}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-text">
          {gameState.playerName}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[11px] text-text-muted">Approval</span>
          <span
            className={`text-xs font-semibold ${approvalColor(
              gameState.approval
            )}`}
          >
            {gameState.approval}%
          </span>
        </div>
      </div>
      <div className="border-t border-border" />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "border-accent bg-panel-2 font-medium text-text"
                  : "border-transparent text-text-muted hover:bg-panel-2/60 hover:text-text"
              }`}
            >
              <span className="relative flex items-center">
                <Icon
                  size={16}
                  className={isActive ? "text-accent" : "text-text-muted"}
                />
                {item.href === "/events" && urgentEventCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-danger" />
                )}
              </span>
              {item.label}
              {item.href === "/events" && urgentEventCount > 0 && (
                <span className="ml-auto rounded-full bg-danger/20 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                  {urgentEventCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-2 py-2">
        <a
          href="/wiki"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-panel-2/60 hover:text-text"
        >
          <BookOpen size={16} className="text-text-muted" />
          Wiki
        </a>
      </div>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[11px] uppercase tracking-widest text-text-muted">
          Turn {gameState.turn}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-text">
          {gameState.date}
        </p>
        {saveStatus === "saving" && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted" />
            Saving…
          </p>
        )}
        {saveStatus === "saved" && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-positive transition-opacity duration-1000">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Auto-saved
          </p>
        )}
        {saveStatus === "error" && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Save failed — will retry next turn
          </p>
        )}
      </div>
    </aside>
  );
}
