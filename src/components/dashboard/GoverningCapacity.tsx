import { ProgressBar } from "@/components/dashboard/ProgressBar";

function capacityColor(value: number): string {
  if (value > 55) return "#10b981";
  if (value >= 35) return "#f59e0b";
  return "#ef4444";
}

function CapacityBar({
  label,
  value,
  statusAbove,
  statusMid,
  statusBelow,
  highThreshold = 55,
  lowThreshold = 35,
}: {
  label: string;
  value: number;
  statusAbove: string;
  statusMid: string;
  statusBelow: string;
  highThreshold?: number;
  lowThreshold?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const status =
    clamped > highThreshold ? statusAbove : clamped >= lowThreshold ? statusMid : statusBelow;

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text">{label}</span>
        <span className="text-text-muted">{clamped}/100</span>
      </div>
      <div className="mt-1.5">
        <ProgressBar value={clamped} color={capacityColor(clamped)} />
      </div>
      <p className="mt-1 text-[11px] text-text-muted">{status}</p>
    </div>
  );
}

export function GoverningCapacity({
  congressionalSupport,
  civilLiberties,
  internationalPressure,
  approval,
}: {
  congressionalSupport: number;
  civilLiberties: number;
  internationalPressure: number;
  approval: number;
}) {
  const institutionalIntegrity = (civilLiberties + (100 - internationalPressure)) / 2;

  return (
    <div className="mt-6 border-t border-border pt-5">
      <h3 className="border-l-2 border-accent pl-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Governing Capacity
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <CapacityBar
          label="Coalition Strength"
          value={congressionalSupport}
          statusAbove="Legislative agenda can proceed"
          statusMid="Major reforms require negotiation"
          statusBelow="Coalition at risk — reforms stalled"
        />
        <CapacityBar
          label="Institutional Health"
          value={institutionalIntegrity}
          highThreshold={60}
          lowThreshold={40}
          statusAbove="Institutions functioning normally"
          statusMid="Institutional strain detected"
          statusBelow="Democratic institutions under pressure"
        />
        <CapacityBar
          label="Public Mandate"
          value={approval}
          statusAbove="Strong mandate to govern"
          statusMid="Mandate weakening"
          statusBelow="Mandate in question"
        />
      </div>
    </div>
  );
}
