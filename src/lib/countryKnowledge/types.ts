import type { AuthorityType } from "@/lib/actions/types";

/**
 * Country Knowledge is static structural data: what a country's institutions,
 * instruments, and lawful government actions are. It answers "is this structurally
 * possible", never "what happens" — no mechanical simulation effects (approval/GDP
 * deltas, success chances) belong here, and none of it is persisted into GameState;
 * only the ids referenced by mutable entities/actions are.
 */

export interface InstitutionDefinition {
  id: string;
  name: string;
  /** Reuses the existing high-level authority taxonomy rather than a parallel one. */
  authorityType: AuthorityType;
  independent: boolean;
}

export type StructuralConstraintType =
  | "REQUIRES_CONGRESS"
  | "INDEPENDENT_INSTITUTION"
  | "REQUIRES_FOREIGN_CONSENT"
  | "REQUIRES_JUDICIAL_PROCESS"
  | "ASSET_NOT_SPENDABLE";

export interface StructuralConstraint {
  type: StructuralConstraintType;
  institutionId?: string;
  /** Explanatory prose for a future Explain UI. The `type` field drives validation, not this text. */
  explanation: string;
}

export type InstrumentFamily = "LEGISLATIVE" | "EXECUTIVE" | "FISCAL" | "SECURITY" | "FOREIGN";

/**
 * Mirrors LegislativeProceeding["billType"] in src/lib/congress.ts. Declared independently
 * (not imported from congress.ts) so Country Knowledge data has no runtime dependency on the
 * Congress module — congress.ts depends on this module for routing, not the other way round.
 */
export type BillTypeHint = "ORDINARY" | "COMPLEMENTARY" | "CONSTITUTIONAL_AMENDMENT";

export interface GovernmentInstrument {
  id: string;
  family: InstrumentFamily;
  name: string;
  /** Which existing AuthorityType an action using this instrument typically carries. */
  authorityType: AuthorityType;
  requiresInstitutionId?: string;
  /** Set only for legislative-track instruments; consumed by congress.ts's chamberRule(). */
  billTypeHint?: BillTypeHint;
  /** Structural dependency on a foreign counterparty's agreement — informational, not a block
   *  on Brazil's own authority to initiate the action (see BILATERAL_NEGOTIATION in brazil.ts). */
  requiresForeignConsent?: boolean;
  description: string;
}

export interface PolicyObjective {
  id: string;
  label: string;
  description: string;
}

export interface GovernmentActionDefinition {
  id: string;
  name: string;
  description: string;
  instrumentId: string;
  responsibleInstitutionIds: string[];
  /** Objectives this action can serve, for objective -> candidate-action lookup only. */
  objectiveIds: string[];
  constraints: StructuralConstraint[];
  /** True when this action is structurally impossible outright (e.g. presidential Selic-setting). */
  structurallyBlocked?: boolean;
}

export interface CountryKnowledge {
  countryId: string;
  institutions: InstitutionDefinition[];
  instruments: GovernmentInstrument[];
  actionCatalogue: GovernmentActionDefinition[];
  objectives: PolicyObjective[];
  provenance?: { source: string; asOf: string };
}
