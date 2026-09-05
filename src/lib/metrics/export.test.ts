import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { buildTurnMetricsSnapshot } from "./snapshot.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { turnMetricsFilename, turnMetricsToCSV, turnMetricsToJSON } from "./export.ts";
import type { GameState } from "../gameState.ts";
import type { TurnMetricsSnapshot } from "./types.ts";

const EXPECTED_HEADERS = [
  "turn", "date", "gdpGrowth", "inflation", "unemployment", "fdiFlow", "tradeBalance",
  "nominalGDP", "annualRevenue", "annualExpenditure", "primaryBalance", "nominalBalance",
  "publicDebt", "debtToGDP", "discretionaryBudgetAvailable",
  "demandPressure", "outputGap", "inflationPressure", "labourSlack",
  "approval", "congressionalSupport", "securityIndex",
  "actionsIssued", "activeProjects", "activeOperations", "activeLegislativeProceedings",
  "productiveCapacityIndex", "availableCapacityHeadroom", "capacityUtilisationFlow", "supplyHeadroomApplied",
  "currentSelic", "monetaryStance", "transmittedMonetaryPressure", "inflationTarget", "copomDecision",
  "exchangeRateBrlPerUsd", "exchangeRatePressure", "foreignDemandIndex", "commodityConditionsIndex",
  "exportIndex", "importIndex", "externalDemandContribution", "importedInflationPressure",
  "consumptionIndex", "investmentIndex", "consumptionDemandContribution",
  "investmentDemandContribution", "capitalFormationFlow",
];

function history(count: number): TurnMetricsSnapshot[] {
  const base: GameState = createInitialGameState();
  const snapshots: TurnMetricsSnapshot[] = [];
  for (let i = 0; i < count; i++) {
    snapshots.push(
      buildTurnMetricsSnapshot({ ...base, turn: i + 1, approval: base.approval + i }, i + 1, i)
    );
  }
  return snapshots;
}

test("CSV headers are stable and match the documented column list", () => {
  const csv = turnMetricsToCSV(history(1));
  const headerLine = csv.split("\n")[0];
  assert.equal(headerLine, EXPECTED_HEADERS.join(","));
});

test("CSV row count matches snapshot count", () => {
  const snapshots = history(5);
  const csv = turnMetricsToCSV(snapshots);
  const lines = csv.split("\n");
  assert.equal(lines.length, snapshots.length + 1); // header + one row per snapshot
});

/** Minimal quoted-CSV row splitter — snapshot dates contain a comma ("January 8,
 *  2026"), so a naive split(",") would break on the quoted cell the exporter
 *  correctly produces for it. */
function parseCsvRow(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (inQuotes) {
      if (char === '"' && row[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

test("CSV values match the source snapshots exactly", () => {
  const snapshots = history(3);
  const csv = turnMetricsToCSV(snapshots);
  const rows = csv.split("\n").slice(1);
  snapshots.forEach((snapshot, i) => {
    const cells = parseCsvRow(rows[i]);
    assert.equal(Number(cells[0]), snapshot.turn);
    assert.equal(cells[1], snapshot.date);
    assert.equal(Number(cells[2]), snapshot.economy.gdpGrowth);
    assert.equal(Number(cells[7]), snapshot.fiscal.nominalGDP);
    assert.equal(Number(cells[15]), snapshot.economyDynamics.demandPressure);
    assert.equal(Number(cells[19]), snapshot.politics.approval);
    assert.equal(Number(cells[24]), snapshot.activity.activeOperations);
    assert.equal(Number(cells[25]), snapshot.activity.activeLegislativeProceedings);
    assert.equal(Number(cells[26]), snapshot.economyDynamics.productiveCapacityIndex);
    assert.equal(Number(cells[27]), snapshot.economyDynamics.availableCapacityHeadroom);
    assert.equal(Number(cells[35]), snapshot.externalEconomy.exchangeRateBrlPerUsd);
    assert.equal(Number(cells[42]), snapshot.externalEconomy.importedInflationPressure);
    assert.equal(Number(cells[43]), snapshot.privateEconomy.consumptionIndex);
    assert.equal(Number(cells[47]), snapshot.privateEconomy.capitalFormationFlow);
  });
});

test("CSV produces an empty-but-headed table for an empty history", () => {
  const csv = turnMetricsToCSV([]);
  assert.equal(csv, EXPECTED_HEADERS.join(","));
});

test("JSON export round-trips the full history without loss", () => {
  const snapshots = history(4);
  const json = turnMetricsToJSON(snapshots);
  const parsed = JSON.parse(json);
  assert.deepEqual(parsed, snapshots);
});

test("export functions do not mutate the input history", () => {
  const snapshots = history(3);
  const before = JSON.parse(JSON.stringify(snapshots));
  turnMetricsToCSV(snapshots);
  turnMetricsToJSON(snapshots);
  assert.deepEqual(snapshots, before);
});

test("filename is stable in shape and uses the country name and export date", () => {
  const fixedDate = new Date("2026-09-04T12:00:00Z");
  assert.equal(turnMetricsFilename("Brazil", "csv", fixedDate), "sovereign-brazil-turn-metrics-2026-09-04.csv");
  assert.equal(turnMetricsFilename("Brazil", "json", fixedDate), "sovereign-brazil-turn-metrics-2026-09-04.json");
});
