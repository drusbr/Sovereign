import type { DiplomaticOpportunity, DiplomaticRelation } from "@/lib/gameState";
import { SectionHeader } from "@/components/SectionHeader";

function DeadlineLabel({
  expiresOnTurn,
  currentTurn,
}: {
  expiresOnTurn: number;
  currentTurn: number;
}) {
  const remaining = expiresOnTurn - currentTurn;
  const className =
    remaining <= 1 ? "text-danger" : remaining <= 3 ? "text-amber-400" : "text-text-muted";
  return (
    <span className={`text-xs font-medium ${className}`}>
      Expires Turn {expiresOnTurn}
    </span>
  );
}

export function DiplomaticOpportunities({
  opportunities,
  relations,
  currentTurn,
}: {
  opportunities: DiplomaticOpportunity[];
  relations: DiplomaticRelation[];
  currentTurn: number;
}) {
  const open = opportunities.filter((o) => !o.seized && !o.expired);

  return (
    <div>
      <SectionHeader title="Diplomatic Opportunities" />
      {open.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel/40 p-6 text-center text-sm text-text-muted">
          No current diplomatic openings
        </div>
      ) : (
        <div className="space-y-3">
          {open.map((opp) => {
            const relation = relations.find((r) => r.name === opp.partner);
            return (
              <div
                key={opp.id}
                className="rounded-lg border border-border bg-panel/60 p-4"
              >
                <div className="flex items-center gap-2">
                  {relation && (
                    <span className="text-xl leading-none">{relation.flagEmoji}</span>
                  )}
                  <p className="text-sm font-semibold text-text">{opp.partner}</p>
                </div>
                <p className="mt-2 text-xs text-text-muted">{opp.description}</p>
                <p className="mt-1.5 text-xs text-positive">{opp.benefit}</p>
                <div className="mt-2.5 flex items-center justify-between">
                  <DeadlineLabel expiresOnTurn={opp.expiresOnTurn} currentTurn={currentTurn} />
                  <span className="text-[10px] text-text-muted">Seize via Orders</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
