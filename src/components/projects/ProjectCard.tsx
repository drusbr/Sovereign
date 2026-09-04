import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import {
  CATEGORY_STYLES,
  type ProjectDefinition,
  type ProjectRuntimeInfo,
} from "@/lib/projects";
import { fmtPct } from "@/lib/format";

export function ProjectCard({
  project,
  info,
  onCancel,
}: {
  project: ProjectDefinition;
  info: ProjectRuntimeInfo;
  onCancel?: (id: string) => void;
}) {
  const style = CATEGORY_STYLES[project.category];
  const isCompleted = info.phase === "completed";
  const isNearDeadline = info.phase === "near-deadline";
  const isNotStarted = info.phase === "not-started";

  return (
    <div
      className={`border bg-panel/45 p-4 ${
        isCompleted ? "border-positive/30" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text">{project.name}</h3>
            <span
              className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.text} ${style.bg} ${style.border}`}
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
        {(project.lifecycle.status === "FAILED" || project.lifecycle.status === "CANCELLED") && (
          <span className="rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
            {project.lifecycle.status}
          </span>
        )}
      </div>

      {!isCompleted && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted">
            <span>{isNotStarted ? "Not yet underway" : "Progress"}</span>
            <span>{fmtPct(info.progress)}</span>
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

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-[11px] sm:grid-cols-4">
        <Metric label="Status" value={project.lifecycle.status} />
        <Metric label="Budget" value={`R$${project.lifecycle.totalBudget.toFixed(2)}bn`} />
        <Metric label="Spent" value={`R$${project.lifecycle.spent.toFixed(2)}bn`} />
        <Metric label="Remaining" value={`R$${project.lifecycle.remainingBudget.toFixed(2)}bn`} />
        <Metric label="Elapsed" value={`${project.lifecycle.elapsedTurns} turns`} />
        <Metric label="Expected" value={`${project.lifecycle.plannedDurationTurns} turns`} />
        <Metric label="Scope" value={project.scope} />
        <Metric label="Outcome" value={project.expectedOutcome} />
      </div>

      {onCancel && !["COMPLETED", "FAILED", "CANCELLED"].includes(project.lifecycle.status) && (
        <button
          type="button"
          onClick={() => onCancel(project.id)}
          className="mt-3 rounded border border-danger/30 px-3 py-1.5 text-[11px] font-semibold text-danger hover:bg-danger/10"
        >
          Cancel project · 1 AP
        </button>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="uppercase tracking-wide text-text-muted">{label}</p><p className="mt-0.5 text-text">{value}</p></div>;
}
