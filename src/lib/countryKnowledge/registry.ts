import type { CountryKnowledge } from "./types";
import { BRAZIL_COUNTRY_KNOWLEDGE } from "./brazil";

const REGISTRY: Record<string, CountryKnowledge> = {
  [BRAZIL_COUNTRY_KNOWLEDGE.countryId]: BRAZIL_COUNTRY_KNOWLEDGE,
};

/** Returns undefined for an unknown country id — callers must handle absence, never assume Brazil. */
export function getCountryKnowledge(countryId: string): CountryKnowledge | undefined {
  return REGISTRY[countryId];
}
