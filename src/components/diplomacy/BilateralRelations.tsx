import type { DiplomaticRelation } from "@/lib/gameState";
import { SectionHeader } from "@/components/SectionHeader";
import { RelationCard } from "@/components/diplomacy/RelationCard";

export function BilateralRelations({
  relations,
  onSelect,
}: {
  relations: DiplomaticRelation[];
  onSelect: (id: string) => void;
}) {
  const sorted = [...relations].sort(
    (a, b) => b.relationshipScore - a.relationshipScore
  );

  return (
    <div>
      <SectionHeader title="Bilateral Relations" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((relation) => (
          <RelationCard
            key={relation.id}
            relation={relation}
            onClick={() => onSelect(relation.id)}
          />
        ))}
      </div>
    </div>
  );
}
