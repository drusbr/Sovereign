"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { firstSentence, type TurnRecord } from "@/lib/gameState";

export function TurnHistoryCard({ record }: { record: TurnRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-panel/40">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <ChevronDown
          size={14}
          className={`shrink-0 text-text-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
            <span>Turn {record.turn}</span>
            <span>·</span>
            <span>{record.date}</span>
          </div>
          <p className="mt-0.5 truncate text-sm text-text">
            {firstSentence(record.narrative)}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold ${
            record.approvalChange > 0
              ? "text-positive"
              : record.approvalChange < 0
                ? "text-danger"
                : "text-text-muted"
          }`}
        >
          {record.approvalChange > 0 ? "+" : ""}
          {record.approvalChange}%
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border px-4 py-4 font-mono text-[13px] leading-relaxed text-text-muted">
          {record.narrative.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}
    </div>
  );
}
