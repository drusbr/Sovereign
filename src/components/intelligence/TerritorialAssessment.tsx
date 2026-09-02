import { BRAZIL_STATES, SECURITY_COLORS, type SecurityStatus } from "@/lib/brazilStates";
import { SectionHeader } from "@/components/SectionHeader";

const STATUS_ORDER: SecurityStatus[] = ["critical", "elevated", "stable"];
const STATUS_LABELS: Record<SecurityStatus, string> = {
  critical: "CRITICAL",
  elevated: "ELEVATED",
  stable: "STABLE",
};

export function TerritorialAssessment({
  stateSecurity,
}: {
  stateSecurity: Record<string, SecurityStatus>;
}) {
  const rows = BRAZIL_STATES.map((s) => ({
    ...s,
    status: stateSecurity[s.id] ?? ("stable" as SecurityStatus),
  })).sort((a, b) => {
    const rankDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
  });

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: rows.filter((r) => r.status === status).length,
  }));

  return (
    <div>
      <SectionHeader title="Territorial Assessment" />
      <p className="mb-3 text-xs text-text-muted">
        {counts
          .map((c) => `${c.count} ${STATUS_LABELS[c.status]}`)
          .join("  ·  ")}
      </p>
      <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-panel-2 text-[11px] uppercase tracking-wide text-text-muted">
              <th className="px-4 py-2.5 font-semibold">State</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/60 bg-panel/40 last:border-b-0 hover:bg-panel-2/50"
              >
                <td className="px-4 py-2.5 text-text">{row.name}</td>
                <td className="px-4 py-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{
                      color: SECURITY_COLORS[row.status],
                      borderColor: `${SECURITY_COLORS[row.status]}4d`,
                      backgroundColor: `${SECURITY_COLORS[row.status]}1a`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: SECURITY_COLORS[row.status] }}
                    />
                    {STATUS_LABELS[row.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
