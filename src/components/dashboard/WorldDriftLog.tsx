"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function WorldDriftLog({ entries }: { entries: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted transition hover:text-text"
      >
        <ChevronDown
          size={13}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        Background Developments
        <span className="font-mono text-[10px] font-normal normal-case text-text-muted/70">
          ({entries.length})
        </span>
      </button>

      {expanded && (
        <ul className="mt-2.5 space-y-1.5">
          {entries.map((entry, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-text-muted">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-muted/50" />
              {entry}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
