"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BriefcaseBusiness, Building2, FileSignature, Globe2, Landmark, Library, Newspaper, Settings, Shield, Users, type LucideIcon } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { useAuth } from "@/context/AuthContext";

interface NavItem { href: string; label: string; icon: LucideIcon; count?: number }
function NavLink({ item, active }: { item: NavItem; active: boolean }) { const Icon = item.icon; return <Link href={item.href} title={item.label} className={`group flex min-h-9 items-center gap-3 border-l-2 px-3 text-[13px] transition-colors ${active ? "border-brass bg-panel-2 text-text" : "border-transparent text-text-muted hover:border-border hover:bg-panel-2/50 hover:text-text"}`}><Icon size={15} className={active ? "text-brass" : "text-text-muted"}/><span className="hidden truncate lg:block">{item.label}</span>{item.count ? <span className="ml-auto hidden min-w-5 bg-danger px-1 text-center text-[10px] font-bold text-white lg:block">{item.count}</span> : null}</Link>; }
function Group({ title, items, pathname }: { title: string; items: NavItem[]; pathname: string }) { return <section className="mt-4"><p className="mb-1 hidden px-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-text-muted/70 lg:block">{title}</p><div>{items.map((item) => <NavLink key={item.href} item={item} active={pathname === item.href}/>)}</div></section>; }

export function Sidebar() {
  const pathname = usePathname(); const { gameState, saveStatus } = useGame(); const { user } = useAuth();
  const urgent = gameState.worldEvents.filter((event) => event.requiresResponse && event.status === "active").length;
  return <aside className="flex h-screen w-16 shrink-0 flex-col border-r border-border bg-panel lg:w-56">
    <Link href="/dashboard" className="flex h-14 items-center border-b border-border px-4"><span className="text-lg font-medium tracking-[0.22em] text-text lg:text-base">S<span className="hidden lg:inline">OVEREIGN</span></span></Link>
    <div className="hidden border-b border-border px-4 py-4 lg:block"><p className="text-[9px] uppercase tracking-[0.2em] text-text-muted">{gameState.playerTitle}</p><p className="mt-1 truncate text-sm font-medium text-text">{gameState.playerName}</p><div className="mt-2 flex justify-between text-[11px]"><span className="text-text-muted">Public mandate</span><span className="tabular text-text">{gameState.approval.toFixed(0)}%</span></div></div>
    <nav className="flex-1 overflow-y-auto py-1">
      <Group title="Presidency" pathname={pathname} items={[{href:"/dashboard",label:"Briefing",icon:BookOpen},{href:"/orders",label:"Orders",icon:FileSignature},{href:"/advisors",label:"Advisors",icon:Users}]}/>
      <Group title="Government" pathname={pathname} items={[{href:"/congress",label:"Congress",icon:Landmark},{href:"/projects",label:"Programmes",icon:BriefcaseBusiness}]}/>
      <Group title="Nation" pathname={pathname} items={[{href:"/economy",label:"Economy",icon:Building2},{href:"/intelligence",label:"Security",icon:Shield}]}/>
      <Group title="World" pathname={pathname} items={[{href:"/diplomacy",label:"World Affairs",icon:Globe2},{href:"/events",label:"Developments",icon:Library,count:urgent}]}/>
      <Group title="Media" pathname={pathname} items={[{href:"/media",label:"National Press",icon:Newspaper}]}/>
    </nav>
    <div className="border-t border-border py-2"><NavLink item={{href:"/wiki",label:"Encyclopedia",icon:BookOpen}} active={false}/><NavLink item={{href:"/settings",label:"Settings",icon:Settings}} active={pathname==="/settings"}/></div>
    <Link href={user ? "/campaigns" : "/"} className="hidden border-t border-border px-4 py-3 text-[10px] uppercase tracking-wider text-text-muted hover:text-text lg:block">Campaign menu</Link>
    <div className="hidden border-t border-border px-4 py-3 text-[10px] text-text-muted lg:block">{saveStatus === "saved" ? <span className="text-positive">● Saved</span> : saveStatus === "error" ? <span className="text-amber-400">● Save pending</span> : `${gameState.date} · Turn ${gameState.turn}`}</div>
  </aside>;
}
