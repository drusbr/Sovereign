"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { AdvisorCandidate, AdvisorRole } from "@/lib/advisorCandidates";
import { ADVISOR_ROLE_LABELS, ADVISOR_ROLES } from "@/lib/advisorCandidates";
import { Avatar } from "@/components/setup/Avatar";
import type { AdvisorPoolSelection } from "@/lib/advisorCandidates";

function CandidateCard({
  candidate,
  isSelected,
  onSelect,
}: {
  candidate: AdvisorCandidate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [firstParagraph, secondParagraph] = candidate.background.split("\n\n");

  return (
    <div
      className={`flex flex-col rounded-lg border p-4 ${
        isSelected ? "border-accent bg-accent/[0.05]" : "border-border bg-panel"
      } ${
        // A near-invisible tell for whichever candidate has a hidden conflict —
        // deliberately just barely different from the normal border colour.
        candidate.hidden ? "border-[#22293c]" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar seed={candidate.avatarSeed} className="h-12 w-12 shrink-0 rounded-full" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">
            {candidate.name}{" "}
            <span className="font-normal text-text-muted">· {candidate.age}</span>
          </p>
          <p className="text-xs text-text-muted">{candidate.title}</p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-text-muted">
        {firstParagraph}
        {expanded && secondParagraph && <> {secondParagraph}</>}
      </p>
      {secondParagraph && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 self-start text-[11px] font-semibold text-accent hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {candidate.strengths.map((s) => (
          <span
            key={s}
            className="rounded-full border border-positive/30 bg-positive/10 px-2 py-0.5 text-[10px] font-medium text-positive"
          >
            {s}
          </span>
        ))}
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          {candidate.weakness}
        </span>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className={`mt-4 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition ${
          isSelected
            ? "bg-positive text-white"
            : "bg-accent text-white hover:bg-accent/90"
        }`}
      >
        {isSelected && <Check size={13} />}
        {isSelected ? "Selected" : "Select"}
      </button>
    </div>
  );
}

export function Step3Advisors({
  pools,
  selected,
  onSelect,
}: {
  pools: AdvisorPoolSelection[];
  selected: Partial<Record<AdvisorRole, string>>;
  onSelect: (role: AdvisorRole, candidateId: string) => void;
}) {
  const filledCount = ADVISOR_ROLES.filter((r) => selected[r]).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold uppercase tracking-widest text-text sm:text-4xl">
        Your Cabinet
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Select one advisor for each role. Read their backgrounds carefully — they will shape
        your government.
      </p>

      <div className="mt-6 flex items-center gap-2">
        {ADVISOR_ROLES.map((role) => (
          <div
            key={role}
            className={`h-2.5 w-2.5 rounded-full ${
              selected[role] ? "bg-accent" : "bg-panel-2"
            }`}
            title={ADVISOR_ROLE_LABELS[role]}
          />
        ))}
        <span className="ml-2 text-xs text-text-muted">{filledCount}/5 roles filled</span>
      </div>

      <div className="mt-8 space-y-10">
        {pools.map(({ role, candidates }) => (
          <div key={role} id={`role-${role}`}>
            <h2 className="border-l-2 border-accent pl-3 text-sm font-semibold uppercase tracking-widest text-text-muted">
              {ADVISOR_ROLE_LABELS[role]}
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isSelected={selected[role] === candidate.id}
                  onSelect={() => onSelect(role, candidate.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
