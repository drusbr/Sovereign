import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import {
  CATEGORY_STYLES,
  type ProjectDefinition,
  type ProjectRuntimeInfo,
} from "@/lib/projects";

export function ProjectCard({
  project,
  info,
}: {
  project: ProjectDefinition;
  info: ProjectRuntimeInfo;
}) {
  const style = CATEGORY_STYLES[project.category];
  const isCompleted = info.phase === "completed";
  const isNearDeadline = info.phase === "near-deadline";
  const isNotStarted = info.phase === "not-started";

  return (
    <div
      className={`rounded-lg border bg-panel/60 p-4 ${
        isCompleted ? "border-positive/30" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text">{project.name}</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.text} ${style.bg} ${style.border}`}
            >
              {project.category}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-text-muted">
            Turn {project.startTurn} → {project.endTurn}
          </p>
        </div>

        {isCompleted && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-positive">
            <CheckCircle2 size={12} />
            Completed
          </span>
        )}
        {isNearDeadline && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
            <AlertTriangle size={12} />
            {info.turnsRemaining <= 0
              ? "Due this turn"
              : `Due in ${info.turnsRemaining} turn${info.turnsRemaining === 1 ? "" : "s"}`}
          </span>
        )}
      </div>

      {!isCompleted && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted">
            <span>{isNotStarted ? "Not yet underway" : "Progress"}</span>
            <span>{info.progress}%</span>
          </div>
          <ProgressBar
            value={info.progress}
            color={isNearDeadline ? "#fbbf24" : style.hex}
          />
        </div>
      )}

      <p className="mt-3 text-sm leading-relaxed text-text-muted">
        {project.statusText}
      </p>

      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        <span className="font-semibold text-text">
          {isCompleted ? "Delivered: " : "Unlocks: "}
        </span>
        {project.unlocks}
      </p>
    </div>
  );
}
