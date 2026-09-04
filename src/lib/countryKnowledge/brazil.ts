import type { CountryKnowledge } from "./types";

/**
 * Deliberately small V1 seed — just enough structural knowledge to exercise the six
 * canonical scenarios this foundation slice was built against (constitutional amendment,
 * fiscal spending, Selic independence, federal enforcement priority, frozen assets,
 * bilateral negotiation). Not a full institutional model of Brazil; grow it only
 * alongside new, tested scenarios rather than pre-populating a large catalogue.
 */
export const BRAZIL_COUNTRY_KNOWLEDGE: CountryKnowledge = {
  countryId: "BRA",
  institutions: [
    { id: "national_congress", name: "National Congress", authorityType: "LEGISLATIVE", independent: false },
    { id: "banco_central", name: "Banco Central do Brasil / COPOM", authorityType: "INDEPENDENT", independent: true },
    { id: "federal_executive", name: "Federal Executive / Presidency", authorityType: "EXECUTIVE", independent: false },
    { id: "mjsp_pf", name: "Ministry of Justice and Public Security / Federal Police", authorityType: "EXECUTIVE", independent: false },
    { id: "judiciary", name: "Federal Judiciary", authorityType: "JUDICIAL", independent: true },
  ],
  instruments: [
    {
      id: "CONSTITUTIONAL_AMENDMENT",
      family: "LEGISLATIVE",
      name: "Constitutional Amendment",
      authorityType: "LEGISLATIVE",
      requiresInstitutionId: "national_congress",
      billTypeHint: "CONSTITUTIONAL_AMENDMENT",
      description: "A change to the federal Constitution, requiring a three-fifths majority in both chambers across two rounds each.",
    },
    {
      id: "SPENDING_ADJUSTMENT",
      family: "FISCAL",
      name: "Discretionary Spending Adjustment",
      authorityType: "EXECUTIVE",
      requiresInstitutionId: "federal_executive",
      description: "An executive reallocation or increase of discretionary federal spending within existing budget authority.",
    },
    {
      id: "MONETARY_POLICY_DIRECTIVE",
      family: "EXECUTIVE",
      name: "Monetary Policy Directive",
      authorityType: "INDEPENDENT",
      requiresInstitutionId: "banco_central",
      description: "Setting the Selic policy rate — constitutionally reserved to the Central Bank's Monetary Policy Committee (COPOM), not the presidency.",
    },
    {
      id: "FEDERAL_ENFORCEMENT_PRIORITY",
      family: "SECURITY",
      name: "Federal Enforcement Priority",
      authorityType: "EXECUTIVE",
      requiresInstitutionId: "mjsp_pf",
      description: "A presidential directive prioritising federal law-enforcement and investigative resources toward a stated target.",
    },
    {
      id: "ASSET_REALLOCATION_DIRECTIVE",
      family: "FISCAL",
      name: "Seized Asset Reallocation",
      authorityType: "EXECUTIVE",
      requiresInstitutionId: "judiciary",
      description: "Reallocation of frozen or seized criminal assets — lawful only once judicial forfeiture proceedings conclude.",
    },
    {
      id: "FEDERAL_TAX_LEGISLATION",
      family: "LEGISLATIVE",
      name: "Federal Tax Legislation",
      authorityType: "LEGISLATIVE",
      requiresInstitutionId: "national_congress",
      billTypeHint: "ORDINARY",
      description: "New federal taxes or rate changes to broad-based instruments (e.g. corporate income tax) require ordinary-law passage by both chambers of Congress. Narrower instruments — IOF, IPI, import/export tariffs — may be adjusted by the Executive within statutory limits, but those are not modelled as a separate instrument in this V1 slice.",
    },
    {
      id: "BILATERAL_NEGOTIATION",
      family: "FOREIGN",
      name: "Bilateral Negotiation",
      authorityType: "EXECUTIVE",
      requiresForeignConsent: true,
      description: "Brazil's own initiation of bilateral or multilateral trade/diplomatic negotiations is an executive act; the eventual agreement additionally requires the foreign counterparty's consent and, for trade agreements, Mercosur coordination and domestic congressional ratification.",
    },
  ],
  objectives: [
    { id: "REDUCE_INFLATION", label: "Reduce Inflation", description: "Bring consumer price growth down toward target." },
    { id: "REDUCE_ORGANISED_CRIME_FINANCIAL_CAPACITY", label: "Reduce Organised Crime Financial Capacity", description: "Degrade the financial networks sustaining organised-crime factions." },
  ],
  actionCatalogue: [
    {
      id: "constitutional_spending_ceiling_amendment",
      name: "Constitutional Amendment — Federal Spending Ceiling",
      description: "A constitutional amendment imposing a binding ceiling on federal expenditure growth.",
      instrumentId: "CONSTITUTIONAL_AMENDMENT",
      responsibleInstitutionIds: ["national_congress"],
      objectiveIds: [],
      constraints: [
        {
          type: "REQUIRES_CONGRESS",
          institutionId: "national_congress",
          explanation: "A constitutional amendment requires passage by both the Chamber of Deputies and the Federal Senate by a three-fifths majority, in two rounds each.",
        },
      ],
    },
    {
      id: "federal_healthcare_spending_increase",
      name: "Federal Healthcare Spending Increase",
      description: "An executive increase to federal healthcare (SUS) expenditure within existing discretionary budget authority.",
      instrumentId: "SPENDING_ADJUSTMENT",
      responsibleInstitutionIds: ["federal_executive"],
      objectiveIds: [],
      constraints: [],
    },
    {
      id: "direct_policy_rate_directive",
      name: "Direct Central Bank Policy Rate Directive",
      description: "A presidential order directly setting the Selic policy interest rate.",
      instrumentId: "MONETARY_POLICY_DIRECTIVE",
      responsibleInstitutionIds: ["banco_central"],
      objectiveIds: ["REDUCE_INFLATION"],
      structurallyBlocked: true,
      constraints: [
        {
          type: "INDEPENDENT_INSTITUTION",
          institutionId: "banco_central",
          explanation: "The Central Bank's Monetary Policy Committee (COPOM) sets the Selic rate independently of the presidency under Complementary Law 179/2021. The President cannot set it directly.",
        },
      ],
    },
    {
      id: "fiscal_consolidation_for_disinflation",
      name: "Discretionary Fiscal Consolidation",
      description: "A moderate executive reduction in discretionary spending growth intended to ease inflationary pressure.",
      instrumentId: "SPENDING_ADJUSTMENT",
      responsibleInstitutionIds: ["federal_executive"],
      objectiveIds: ["REDUCE_INFLATION"],
      constraints: [],
    },
    {
      id: "federal_revenue_consolidation_measure",
      name: "Federal Revenue Consolidation Measure",
      description: "Legislation raising recurring federal corporate tax revenue as part of a fiscal consolidation package, limiting the need for expenditure reduction.",
      instrumentId: "FEDERAL_TAX_LEGISLATION",
      responsibleInstitutionIds: ["national_congress", "federal_executive"],
      objectiveIds: ["REDUCE_INFLATION"],
      constraints: [],
    },
    {
      id: "federal_enforcement_priority_pcc_financial_networks",
      name: "Federal Enforcement Priority — Organised Crime Financial Networks",
      description: "A presidential directive prioritising Federal Police and Ministry of Justice resources against organised-crime financial networks.",
      instrumentId: "FEDERAL_ENFORCEMENT_PRIORITY",
      responsibleInstitutionIds: ["mjsp_pf"],
      objectiveIds: ["REDUCE_ORGANISED_CRIME_FINANCIAL_CAPACITY"],
      constraints: [],
    },
    {
      id: "frozen_asset_reallocation",
      name: "Reallocation of Frozen Criminal Assets",
      description: "Directing frozen or seized criminal assets to fund a federal programme.",
      instrumentId: "ASSET_REALLOCATION_DIRECTIVE",
      responsibleInstitutionIds: ["judiciary"],
      objectiveIds: [],
      structurallyBlocked: true,
      constraints: [
        {
          type: "ASSET_NOT_SPENDABLE",
          institutionId: "judiciary",
          explanation: "Seized and frozen assets remain subject to judicial forfeiture proceedings and are not government revenue until final adjudication.",
        },
      ],
    },
    {
      id: "bilateral_trade_negotiation_usa",
      name: "Bilateral Free-Trade Negotiation — United States",
      description: "Brazil's initiation of bilateral free-trade negotiations with the United States.",
      instrumentId: "BILATERAL_NEGOTIATION",
      responsibleInstitutionIds: ["federal_executive"],
      objectiveIds: [],
      constraints: [
        {
          type: "REQUIRES_FOREIGN_CONSENT",
          explanation: "A bilateral trade agreement requires the consent of the United States government before it can take effect; Mercosur coordination and domestic congressional ratification may also apply once a deal is reached.",
        },
      ],
    },
  ],
  provenance: {
    source: "Sovereign V1 foundation-slice seed — hand-authored for the six canonical scenarios",
    asOf: "2026-09-04",
  },
};
