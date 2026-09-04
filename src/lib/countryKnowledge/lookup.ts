import type {
  BillTypeHint,
  CountryKnowledge,
  GovernmentActionDefinition,
  GovernmentInstrument,
  InstitutionDefinition,
  StructuralConstraint,
} from "./types";

/** Pure lookups. Every function fails gracefully (undefined/[]) on an unknown id — never throws. */

export function getInstitution(knowledge: CountryKnowledge, institutionId: string): InstitutionDefinition | undefined {
  return knowledge.institutions.find((item) => item.id === institutionId);
}

export function getInstrument(knowledge: CountryKnowledge, instrumentId: string): GovernmentInstrument | undefined {
  return knowledge.instruments.find((item) => item.id === instrumentId);
}

export function getActionDefinition(knowledge: CountryKnowledge, actionDefinitionId: string): GovernmentActionDefinition | undefined {
  return knowledge.actionCatalogue.find((item) => item.id === actionDefinitionId);
}

/** Lawful (non-structurally-blocked) candidate actions toward an objective. Unknown objective ids yield []. */
export function getCandidateActionsForObjective(knowledge: CountryKnowledge, objectiveId: string): GovernmentActionDefinition[] {
  return knowledge.actionCatalogue.filter(
    (item) => item.objectiveIds.includes(objectiveId) && !item.structurallyBlocked
  );
}

export function resolveBillTypeHint(knowledge: CountryKnowledge, instrumentId: string): BillTypeHint | undefined {
  return getInstrument(knowledge, instrumentId)?.billTypeHint;
}

export function getStructuralConstraints(knowledge: CountryKnowledge, actionDefinitionId: string): StructuralConstraint[] {
  return getActionDefinition(knowledge, actionDefinitionId)?.constraints ?? [];
}
