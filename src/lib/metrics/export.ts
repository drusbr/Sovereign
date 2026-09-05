import type { TurnMetricsSnapshot } from "./types";

/** Stable column order — never reorder existing columns, only append new ones, so
 *  exports from different campaign versions stay comparable. */
const CSV_COLUMNS = [
  "turn",
  "date",
  "gdpGrowth",
  "inflation",
  "unemployment",
  "fdiFlow",
  "tradeBalance",
  "nominalGDP",
  "annualRevenue",
  "annualExpenditure",
  "primaryBalance",
  "nominalBalance",
  "publicDebt",
  "debtToGDP",
  "discretionaryBudgetAvailable",
  "demandPressure",
  "outputGap",
  "inflationPressure",
  "labourSlack",
  "approval",
  "congressionalSupport",
  "securityIndex",
  "actionsIssued",
  "activeProjects",
  "activeOperations",
  "activeLegislativeProceedings",
] as const;

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toRow(snapshot: TurnMetricsSnapshot): (string | number)[] {
  return [
    snapshot.turn,
    snapshot.date,
    snapshot.economy.gdpGrowth,
    snapshot.economy.inflation,
    snapshot.economy.unemployment,
    snapshot.economy.fdiFlow,
    snapshot.economy.tradeBalance,
    snapshot.fiscal.nominalGDP,
    snapshot.fiscal.annualRevenue,
    snapshot.fiscal.annualExpenditure,
    snapshot.fiscal.primaryBalance,
    snapshot.fiscal.nominalBalance,
    snapshot.fiscal.publicDebt,
    snapshot.fiscal.debtToGDP,
    snapshot.fiscal.discretionaryBudgetAvailable,
    snapshot.economyDynamics.demandPressure,
    snapshot.economyDynamics.outputGap,
    snapshot.economyDynamics.inflationPressure,
    snapshot.economyDynamics.labourSlack,
    snapshot.politics.approval,
    snapshot.politics.congressionalSupport,
    snapshot.security.securityIndex,
    snapshot.activity.actionsIssued,
    snapshot.activity.activeProjects,
    snapshot.activity.activeOperations,
    snapshot.activity.activeLegislativeProceedings,
  ];
}

/** One row per snapshot, values taken verbatim from the recorded state — no
 *  recomputation of economic/fiscal truth happens here. */
export function turnMetricsToCSV(history: TurnMetricsSnapshot[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const snapshot of history) {
    lines.push(toRow(snapshot).map(csvCell).join(","));
  }
  return lines.join("\n");
}

export function turnMetricsToJSON(history: TurnMetricsSnapshot[]): string {
  return JSON.stringify(history, null, 2);
}

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Uses the real-world export moment, not the in-fiction campaign date, so repeated
 *  exports of the same campaign (or exports taken on different real days at the same
 *  in-game turn) get distinct, stable filenames. */
export function turnMetricsFilename(countryName: string, extension: "csv" | "json", now: Date = new Date()): string {
  const slug = slugify(countryName) || "campaign";
  const dateSlug = now.toISOString().slice(0, 10);
  return `sovereign-${slug}-turn-metrics-${dateSlug}.${extension}`;
}
