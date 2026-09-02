import { TrendingUp, TrendingDown, ArrowRight, Skull, type LucideIcon } from "lucide-react";
import type { CriminalOrganisation } from "@/lib/gameState";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { ORG_TYPE_LABELS, THREAT_LEVEL_STYLES, capacityColor } from "@/lib/intelligence";

const TREND_META: Record<
  CriminalOrganisation["trend"],
  { Icon: LucideIcon; color: string; label: string }
> = {
  growing: { Icon: TrendingUp, color: "#ef4444", label: "Growing" },
  stable: { Icon: ArrowRight, color: "#64748b", label: "Stable" },
  weakening: { Icon: TrendingDown, color: "#10b981", label: "Weakening" },
  collapsing: { Icon: Skull, color: "#64748b", label: "Collapsing" },
};

export function OrganisationCard({ org }: { org: CriminalOrganisation }) {
  const threatStyle = THREAT_LEVEL_STYLES[org.threatLevel];
  const trend = TREND_META[org.trend];
  const isCritical = org.threatLevel === "critical";

  return (
    <div
      className={`rounded-lg border p-4 ${threatStyle.border}`}
      style={isCritical ? { backgroundColor: "rgba(239, 68, 68, 0.05)" } : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text">{org.name}</h3>
            <span className="rounded-sm bg-panel-2 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-text-muted">
              {org.shortName}
            </span>
          </div>
          <span className="mt-1.5 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            {ORG_TYPE_LABELS[org.type]}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${threatStyle.text} ${threatStyle.bg} ${threatStyle.border}`}
        >
          {threatStyle.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {org.primaryTerritory.map((t) => (
          <span
            key={t}
            className="rounded-sm bg-panel-2 px-2 py-0.5 text-[10px] text-text-muted"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted">
          <span>Operational Capacity</span>
          <span className="flex items-center gap-1 font-semibold text-text">
            <trend.Icon size={12} style={{ color: trend.color }} />
            {org.capacity}%
          </span>
        </div>
        <ProgressBar value={org.capacity} color={capacityColor(org.capacity)} />
      </div>

      <p className="mt-3 text-xs italic leading-relaxed text-text-muted">
        {org.lastKnownActivity}
      </p>
    </div>
  );
}
