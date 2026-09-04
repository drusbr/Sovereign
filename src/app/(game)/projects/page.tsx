"use client";

import { useGame } from "@/context/GameContext";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { getProjectRuntimeInfo } from "@/lib/projects";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";

export default function ProjectsPage() {
  const { gameState, cancelLifecycle } = useGame();

  const enriched = gameState.projects.map((project) => ({
    project,
    info: getProjectRuntimeInfo(project, gameState.turn),
  }));

  const active = enriched.filter(({ project }) => !["COMPLETED", "FAILED", "CANCELLED"].includes(project.lifecycle.status));
  const completed = enriched.filter(({ project }) => ["COMPLETED", "FAILED", "CANCELLED"].includes(project.lifecycle.status));

  return (
    <div className="sovereign-page">
      <PageHeader eyebrow="Government / Programmes" title="Federal Programme Portfolio" description="Delivery, commitments and expected outcomes across the government." meta={`Turn ${gameState.turn} · ${active.length} active`} />

      <div className="mt-5 grid grid-cols-3 border-y border-border bg-panel/30 text-center tabular">
        <div className="border-r border-border py-3"><p className="text-[10px] uppercase tracking-wider text-text-muted">Active</p><p className="mt-1 text-lg text-text">{active.length}</p></div>
        <div className="border-r border-border py-3"><p className="text-[10px] uppercase tracking-wider text-text-muted">Completed</p><p className="mt-1 text-lg text-positive">{completed.filter(({project}) => project.lifecycle.status === "COMPLETED").length}</p></div>
        <div className="py-3"><p className="text-[10px] uppercase tracking-wider text-text-muted">Committed budget</p><p className="mt-1 text-lg text-text">R${active.reduce((sum, {project}) => sum + project.lifecycle.remainingBudget, 0).toFixed(1)}bn</p></div>
      </div>

      {gameState.policyImplementations.length > 0 && <section className="mt-6">
        <h2 className="mb-3 border-l-2 border-brass pl-3 text-xs font-semibold uppercase tracking-widest text-text">Legislative implementation</h2>
        <div className="overflow-x-auto border-y border-border"><table className="sovereign-table min-w-[760px]"><thead><tr><th>Enacted measure</th><th>Status</th><th>Responsible institution</th><th>Expected</th><th className="text-right">Annual fiscal effect</th></tr></thead><tbody>{gameState.policyImplementations.map((item) => <tr key={item.id}><td><p className="font-medium text-text">{item.title}</p><p className="mt-1 max-w-md text-[11px] text-text-muted">{item.summary}</p><div className="mt-1 flex gap-3"><Link href="/congress" className="text-[10px] text-accent hover:underline">Congress record →</Link>{item.expectedAnnualFiscalImpact !== null && <Link href="/economy#fiscal" className="text-[10px] text-accent hover:underline">Fiscal ledger →</Link>}</div></td><td><span className="text-[10px] font-semibold uppercase tracking-wider text-brass">{item.status.replaceAll("_", " ")}</span></td><td className="text-text-muted">{item.responsibleInstitution}</td><td className="tabular text-text-muted">Turn {item.expectedCompletionTurn}</td><td className={`tabular text-right ${item.expectedAnnualFiscalImpact !== null && item.expectedAnnualFiscalImpact >= 0 ? "text-positive" : "text-danger"}`}>{item.expectedAnnualFiscalImpact === null ? "—" : `${item.expectedAnnualFiscalImpact >= 0 ? "+" : "−"}R$${Math.abs(item.expectedAnnualFiscalImpact).toFixed(1)}bn`}</td></tr>)}</tbody></table></div>
      </section>}

      <section className="mt-6">
        <h2 className="mb-3 border-l-2 border-accent pl-3 text-xs font-semibold uppercase tracking-widest text-text">Active portfolio</h2>
        {active.length > 0 ? (
          <div className="space-y-3">
            {active.map(({ project, info }) => (
              <ProjectCard key={project.id} project={project} info={info} onCancel={(id) => void cancelLifecycle(id)} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            No active initiatives. All programmes have been delivered.
          </p>
        )}
      </section>

      {completed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
            Historical ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map(({ project, info }) => (
              <ProjectCard key={project.id} project={project} info={info} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
