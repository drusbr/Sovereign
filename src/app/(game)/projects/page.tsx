"use client";

import { useGame } from "@/context/GameContext";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { getProjectRuntimeInfo } from "@/lib/projects";

export default function ProjectsPage() {
  const { gameState, cancelLifecycle } = useGame();

  const enriched = gameState.projects.map((project) => ({
    project,
    info: getProjectRuntimeInfo(project, gameState.turn),
  }));

  const active = enriched.filter(({ project }) => !["COMPLETED", "FAILED", "CANCELLED"].includes(project.lifecycle.status));
  const completed = enriched.filter(({ project }) => ["COMPLETED", "FAILED", "CANCELLED"].includes(project.lifecycle.status));

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="border-b border-border pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
          Government Initiatives
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="text-lg font-semibold text-text">Projects</h1>
          <span className="text-xs text-text-muted">
            Turn {gameState.turn} · {gameState.date}
          </span>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Active ({active.length})
        </h2>
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
