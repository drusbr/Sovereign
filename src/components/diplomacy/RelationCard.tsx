import { ArrowDown, ArrowRight, ArrowUp, type LucideIcon } from "lucide-react";
import type { DiplomaticRelation } from "@/lib/gameState";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { RELATIONSHIP_STATUS_STYLES, RELATION_TYPE_LABELS } from "@/lib/diplomacy";
import { fmtScore } from "@/lib/format";

const TREND_META: Record<
  DiplomaticRelation["trend"],
  { Icon: LucideIcon; color: string }
> = {
  improving: { Icon: ArrowUp, color: "#10b981" },
  stable: { Icon: ArrowRight, color: "#64748b" },
  deteriorating: { Icon: ArrowDown, color: "#f59e0b" },
};

export function RelationCard({
  relation,
  onClick,
}: {
  relation: DiplomaticRelation;
  onClick: () => void;
}) {
  const statusStyle = RELATIONSHIP_STATUS_STYLES[relation.relationshipStatus];
  const trend = TREND_META[relation.trend];

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-l-2 border-border border-l-transparent bg-panel/60 p-4 text-left transition-colors hover:border-l-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl leading-none">{relation.flagEmoji}</span>
          <div>
            <p className="text-sm font-semibold text-text">{relation.name}</p>
            <span className="mt-0.5 inline-block rounded-full border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
              {RELATION_TYPE_LABELS[relation.type]}
            </span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle.text} ${statusStyle.bg} ${statusStyle.border}`}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted">
          <span>Relationship</span>
          <span className="flex items-center gap-1 font-semibold text-text">
            <trend.Icon size={12} style={{ color: trend.color }} />
            {fmtScore(relation.relationshipScore)}
          </span>
        </div>
        <ProgressBar value={relation.relationshipScore} color={statusStyle.barColor} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {relation.primaryInterests.map((interest) => (
          <span
            key={interest}
            className="rounded-sm bg-panel-2 px-2 py-0.5 text-[10px] text-text-muted"
          >
            {interest}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs italic leading-relaxed text-text-muted">
        {relation.recentInteraction}
      </p>
    </button>
  );
}
