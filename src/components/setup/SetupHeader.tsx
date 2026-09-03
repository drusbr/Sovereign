"use client";

import { ChevronLeft } from "lucide-react";

const TOTAL_STEPS = 5;

export function SetupHeader({
  step,
  onBack,
}: {
  step: number;
  onBack?: () => void;
}) {
  return (
    <header className="border-b border-border px-6 py-4">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <span className="text-sm font-bold tracking-[0.3em] text-text">
          SOVEREIGN
        </span>
        <span className="text-xs font-medium uppercase tracking-widest text-text-muted">
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>
      <div className="mx-auto mt-3 max-w-4xl">
        <div className="h-1 w-full overflow-hidden rounded-full bg-panel-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>
      {onBack && (
        <div className="mx-auto mt-3 max-w-4xl">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-medium text-text-muted transition hover:text-text"
          >
            <ChevronLeft size={14} />
            Back
          </button>
        </div>
      )}
    </header>
  );
}
