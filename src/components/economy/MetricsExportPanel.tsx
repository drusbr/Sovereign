"use client";

import { useGame } from "@/context/GameContext";
import { turnMetricsFilename, turnMetricsToCSV, turnMetricsToJSON } from "@/lib/metrics/export";

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Browser-side export only — no server storage or export job, matching the scope
 *  of this slice. Values come straight from gameState.turnMetricsHistory, already
 *  recorded once per completed turn; nothing is recomputed here. */
export function MetricsExportPanel() {
  const { gameState } = useGame();
  const count = gameState.turnMetricsHistory.length;

  function handleExportCSV() {
    downloadTextFile(
      turnMetricsFilename(gameState.countryName, "csv"),
      turnMetricsToCSV(gameState.turnMetricsHistory),
      "text/csv;charset=utf-8"
    );
  }

  function handleExportJSON() {
    downloadTextFile(
      turnMetricsFilename(gameState.countryName, "json"),
      turnMetricsToJSON(gameState.turnMetricsHistory),
      "application/json;charset=utf-8"
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border bg-panel/35 p-4">
      <div>
        <p className="text-sm font-semibold text-text">Simulation Data Export</p>
        <p className="mt-0.5 text-xs text-text-muted">
          {count} turn{count === 1 ? "" : "s"} recorded — one row per completed turn.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={count === 0}
          className="rounded-md border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-border disabled:text-text-muted"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={handleExportJSON}
          disabled={count === 0}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export JSON
        </button>
      </div>
    </div>
  );
}
