import type { CriminalOrganisation } from "@/lib/gameState";
import { SectionHeader } from "@/components/SectionHeader";
import { OrganisationCard } from "@/components/intelligence/OrganisationCard";

export function OrganisationTracker({
  organisations,
}: {
  organisations: CriminalOrganisation[];
}) {
  const sorted = [...organisations].sort((a, b) => b.capacity - a.capacity);

  return (
    <div>
      <SectionHeader title="Known Threat Actors" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sorted.map((org) => (
          <OrganisationCard key={org.id} org={org} />
        ))}
      </div>
    </div>
  );
}
