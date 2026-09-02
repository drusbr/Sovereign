"use client";

import { AlertOctagon } from "lucide-react";
import { useGame } from "@/context/GameContext";

export function FailureAlertModal() {
  const { activeFailureAlerts, dismissFailureAlert } = useGame();
  const alert = activeFailureAlerts[0];

  if (!alert) return null;

  const isCritical = alert.severity === "critical";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-xl rounded-lg border bg-panel shadow-2xl ${
          isCritical ? "border-danger/50" : "border-amber-400/50"
        }`}
      >
        <div
          className={`flex items-center gap-3 border-b border-border px-6 py-4 ${
            isCritical ? "bg-danger/10" : "bg-amber-400/10"
          }`}
        >
          <AlertOctagon
            size={22}
            className={isCritical ? "text-danger" : "text-amber-400"}
          />
          <div>
            <p
              className={`text-[11px] font-semibold uppercase tracking-widest ${
                isCritical ? "text-danger" : "text-amber-400"
              }`}
            >
              {alert.severity} Threshold Breached
            </p>
            <h2 className="mt-0.5 text-xl font-bold tracking-tight text-text">
              {alert.name}
            </h2>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-text-muted">
            {alert.description}
          </p>

          <button
            type="button"
            onClick={dismissFailureAlert}
            className={`mt-5 w-full rounded-md px-4 py-3 text-sm font-semibold transition ${
              isCritical
                ? "bg-danger text-white hover:bg-danger/90"
                : "bg-amber-400 text-neutral-900 hover:bg-amber-400/90"
            }`}
          >
            Acknowledge
          </button>

          {activeFailureAlerts.length > 1 && (
            <p className="mt-2 text-center text-xs text-text-muted">
              {activeFailureAlerts.length - 1} more alert
              {activeFailureAlerts.length - 1 === 1 ? "" : "s"} pending
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
