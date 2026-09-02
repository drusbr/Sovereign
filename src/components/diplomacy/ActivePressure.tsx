import type { DiplomaticPressure } from "@/lib/gameState";
import { PRESSURE_SEVERITY_STYLES } from "@/lib/diplomacy";
import { SectionHeader } from "@/components/SectionHeader";

export function ActivePressure({ pressures }: { pressures: DiplomaticPressure[] }) {
  const active = pressures.filter((p) => !p.resolved);

  return (
    <div>
      <SectionHeader title="Active Pressure" />
      {active.length === 0 ? (
        <div className="rounded-lg border border-positive/30 bg-positive/5 p-6 text-center text-sm text-positive">
          No significant external pressure
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((pressure) => {
            const style = PRESSURE_SEVERITY_STYLES[pressure.severity];
            return (
              <div
                key={pressure.id}
                className="rounded-lg border border-border bg-panel/60 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-text">{pressure.source}</p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.text} ${style.bg} ${style.border}`}
                  >
                    {style.label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  <span className="font-semibold text-text-muted/90">Trigger: </span>
                  {pressure.trigger}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  <span className="font-semibold text-text-muted/90">Demand: </span>
                  {pressure.demand}
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-text-muted/70">
                    Since Turn {pressure.turn}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    Respond via Orders
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
