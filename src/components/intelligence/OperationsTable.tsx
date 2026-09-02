import type { ActiveOperation } from "@/lib/gameState";
import { OPERATION_STATUS_STYLES, OPERATION_TYPE_STYLES } from "@/lib/intelligence";
import { SectionHeader } from "@/components/SectionHeader";

export function OperationsTable({
  operations,
}: {
  operations: ActiveOperation[];
}) {
  return (
    <div>
      <SectionHeader title="Active Operations" />
      {operations.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel/40 p-6 text-center text-sm text-text-muted">
          No active federal operations
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-panel-2/60 text-[11px] uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2.5 font-semibold">Operation</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Location</th>
                <th className="px-4 py-2.5 font-semibold">Lead Agency</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Started</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op) => {
                const typeStyle = OPERATION_TYPE_STYLES[op.type];
                const statusStyle = OPERATION_STATUS_STYLES[op.status];
                return (
                  <tr
                    key={op.id}
                    className="border-b border-border/60 bg-panel/40 transition-colors last:border-b-0 hover:bg-panel-2/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{op.name}</p>
                      <p className="text-xs text-text-muted">{op.objective}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${typeStyle.text} ${typeStyle.bg} ${typeStyle.border}`}
                      >
                        {typeStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{op.location}</td>
                    <td className="px-4 py-3 text-text-muted">{op.leadAgency}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyle.text} ${statusStyle.bg} ${statusStyle.border}`}
                      >
                        {statusStyle.pulse && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                          </span>
                        )}
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      T{op.startTurn}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
