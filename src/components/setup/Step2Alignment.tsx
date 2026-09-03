"use client";

import { ArrowUp, Scale, Building2, Check } from "lucide-react";
import {
  POLITICAL_ALIGNMENTS,
  TOTAL_CONGRESSIONAL_SEATS,
  type PoliticalAlignment,
} from "@/lib/setupData";
import { coalitionSeatSplit } from "@/lib/setupWizard";

const ICONS = { left: ArrowUp, centre: Scale, right: Building2 } as const;

function SeatSemicircle({ alignment }: { alignment: PoliticalAlignment }) {
  const { coalition, opposition, neutral } = coalitionSeatSplit(alignment);
  const total = TOTAL_CONGRESSIONAL_SEATS;
  const segments = [
    { value: coalition, color: "#3b82f6" },
    { value: neutral, color: "#475569" },
    { value: opposition, color: "#ef4444" },
  ];

  const radius = 90;
  const cx = 100;
  const cy = 100;
  let cumulative = 0;

  const arcs = segments.map((seg) => {
    const startAngle = Math.PI - (cumulative / total) * Math.PI;
    cumulative += seg.value;
    const endAngle = Math.PI - (cumulative / total) * Math.PI;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy - radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy - radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 0 ${x2} ${y2} Z`,
      color: seg.color,
    };
  });

  return (
    <svg viewBox="0 0 200 110" className="mx-auto w-full max-w-xs">
      {arcs.map((a, i) => (
        <path key={i} d={a.path} fill={a.color} opacity={0.9} />
      ))}
    </svg>
  );
}

export function Step2Alignment({
  alignment,
  onChange,
}: {
  alignment: PoliticalAlignment | null;
  onChange: (alignment: PoliticalAlignment) => void;
}) {
  const active = alignment ?? "centre";
  const { coalition } = coalitionSeatSplit(active);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold uppercase tracking-widest text-text sm:text-4xl">
        Where Do You Stand?
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Your political alignment shapes your starting coalition and public perception.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {POLITICAL_ALIGNMENTS.map((opt) => {
          const Icon = ICONS[opt.id];
          const isSelected = alignment === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`relative rounded-lg border p-5 text-left transition ${
                isSelected
                  ? "border-accent bg-accent/[0.06]"
                  : "border-border bg-panel hover:border-text-muted/40"
              }`}
            >
              {isSelected && (
                <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                  <Check size={12} />
                </span>
              )}
              <Icon size={20} className={isSelected ? "text-accent" : "text-text-muted"} />
              <p className="mt-2 text-base font-semibold text-text">{opt.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                {opt.description}
              </p>
              <p className="mt-3 text-[11px] text-text-muted">
                <span className="font-semibold text-text">Coalition:</span>{" "}
                {opt.coalitionSeats} seats — {opt.regionNote}
              </p>
              <p className="mt-1 text-[11px] text-text-muted">
                <span className="font-semibold text-text">Approval:</span>{" "}
                {opt.approvalProfile}
              </p>
              <p className="mt-2 text-[11px] italic text-text-muted">
                {opt.congressionalNote}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-10 rounded-lg border border-border bg-panel/60 p-6 text-center">
        <SeatSemicircle alignment={active} />
        <p className="mt-2 text-sm font-semibold text-text">
          {coalition} of {TOTAL_CONGRESSIONAL_SEATS} seats ({coalition}%) in your coalition
        </p>
        <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Coalition
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#475569]" /> Neutral
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" /> Opposition
          </span>
        </div>
      </div>
    </div>
  );
}
