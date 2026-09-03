import { AlertTriangle, GripVertical, X } from "lucide-react";
import type { AuthorityType, ProposedAction } from "@/lib/actions/types";

export type InterpretationState = "checking" | "resolved" | "unknown";

export interface PendingOrder {
  action: ProposedAction;
  interpretationState: InterpretationState;
}

const AUTHORITY_STYLES: Record<AuthorityType, { label: string; className: string }> = {
  EXECUTIVE: { label: "Executive Authority", className: "border-positive/30 bg-positive/10 text-positive" },
  LEGISLATIVE: { label: "Requires Congress", className: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
  JUDICIAL: { label: "Judicial Authority", className: "border-violet-400/30 bg-violet-400/10 text-violet-400" },
  INDEPENDENT: { label: "Independent Institution", className: "border-danger/30 bg-danger/10 text-danger" },
  STATE_LOCAL: { label: "State / Local Authority", className: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
  FOREIGN: { label: "Foreign Consent Required", className: "border-danger/30 bg-danger/10 text-danger" },
  PRIVATE: { label: "Private Actor", className: "border-danger/30 bg-danger/10 text-danger" },
  UNKNOWN: { label: "Authority Unknown", className: "border-border bg-panel-2 text-text-muted" },
};

function AuthorityBadge({ order }: { order: PendingOrder }) {
  if (order.interpretationState === "checking") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-panel-2 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted" />
        Interpreting…
      </span>
    );
  }

  const style = AUTHORITY_STYLES[order.action.authority.type];
  return (
    <span className="group relative inline-flex">
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.className}`}>
        {style.label}
      </span>
      {order.action.authority.explanation && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-60 -translate-x-1/2 rounded-md border border-border bg-panel px-2.5 py-1.5 text-[11px] font-normal leading-snug text-text shadow-lg group-hover:block">
          {order.action.authority.explanation}
        </span>
      )}
    </span>
  );
}

export function PendingOrderCard({ index, order, onRemove }: {
  index: number;
  order: PendingOrder;
  onRemove: (id: string) => void;
}) {
  const primaryIssue = order.action.validationIssues[0];

  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-panel px-3 py-2.5">
      <GripVertical size={14} className="mt-0.5 shrink-0 text-text-muted/50" />
      <span className="mt-0.5 shrink-0 text-xs font-semibold text-text-muted">{index + 1}.</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text">{order.action.rawOrder}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <AuthorityBadge order={order} />
          {order.interpretationState === "resolved" && (
            <span className="rounded-full border border-border bg-panel-2 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
              {order.action.actionType.replaceAll("_", " ")}
            </span>
          )}
        </div>
        {primaryIssue && (
          <p className={`mt-1.5 flex items-start gap-1 text-[11px] ${primaryIssue.severity === "BLOCKER" ? "text-amber-400" : "text-text-muted"}`}>
            <AlertTriangle size={11} className="mt-0.5 shrink-0" />
            {primaryIssue.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(order.action.id)}
        className="shrink-0 rounded-md p-1 text-text-muted transition hover:bg-panel-2 hover:text-danger"
        aria-label="Remove order"
      >
        <X size={14} />
      </button>
    </div>
  );
}
