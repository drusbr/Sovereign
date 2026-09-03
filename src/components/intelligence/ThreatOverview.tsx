import type { GameState } from "@/lib/gameState";
import { getOverallThreatLevel, THREAT_LEVEL_STYLES } from "@/lib/intelligence";
import { fmtBRL, fmtInt } from "@/lib/format";

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel/60 p-4">
      <p className="text-[11px] uppercase tracking-widest text-text-muted">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-bold ${valueClassName ?? "text-text"}`}>
        {value}
      </p>
    </div>
  );
}

export function ThreatOverview({ gameState }: { gameState: GameState }) {
  const overall = getOverallThreatLevel(gameState.criminalOrganisations);
  const overallStyle = THREAT_LEVEL_STYLES[overall];
  const activeOrgCount = gameState.criminalOrganisations.filter(
    (o) => o.threatLevel !== "neutralised"
  ).length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Overall Threat Level"
        value={overallStyle.label}
        valueClassName={overallStyle.text}
      />
      <StatCard
        label="Active Criminal Organisations"
        value={fmtInt(activeOrgCount)}
      />
      <StatCard label="ANIP Cases Active" value={fmtInt(gameState.anipCases)} />
      <StatCard
        label="Assets Frozen"
        value={fmtBRL(gameState.anipAssetsFrozen)}
      />
    </div>
  );
}
