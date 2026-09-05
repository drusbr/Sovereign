import type { GameState } from "@/lib/gameState";
import { EVENT_THRESHOLDS as T, type EventFact, type EventImportance } from "@/lib/eventFacts";

export interface DetectStateChangesInput { previousState: GameState; currentState: GameState; turnContext?: { relatedActionIds?: string[] }; }

function hash(text: string): string { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function crossed(a: number, b: number, threshold: number) { return (a < threshold && b >= threshold) || (a >= threshold && b < threshold); }
function importance(score: number): EventImportance { return score >= 85 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW"; }
export function scoreEventImportance(event: Omit<EventFact, "importance" | "surfacedToPresident" | "debug" | "id">): number {
  let score = event.source === "CONGRESS" ? 45 : event.source === "MONETARY" ? 40 : event.source === "OPERATION" || event.source === "PROJECT" ? 35 : 25;
  const m = event.metrics ?? {};
  score += Math.min(35, Number(m.budget ?? m.expenditure ?? 0) * 2);
  score += Math.min(30, Number(m.civilianCasualties ?? 0) * 10);
  score += Math.min(25, Math.abs(Number(m.change ?? m.capacityChange ?? m.criminalCapacityReduction ?? 0)) * 2);
  if (/FAILED|COMPLETED|PASSED|CASUALTIES|BREAKTHROUGH/.test(event.type)) score += 20;
  return Math.round(score);
}
export function shouldSurfaceToPresident(event: EventFact): boolean {
  return event.importance === "HIGH" || event.importance === "CRITICAL"
    || ["CONGRESS", "PROJECT", "OPERATION", "FISCAL", "MONETARY"].includes(event.source) && event.importance === "MEDIUM";
}
function fact(base: Omit<EventFact, "id" | "importance" | "surfacedToPresident" | "debug">): EventFact {
  const score = scoreEventImportance(base);
  const event = { ...base, id: `fact-${base.occurredTurn}-${hash(base.dedupeKey)}`, importance: importance(score), surfacedToPresident: false, debug: { significanceScore: score, llmEnriched: false } } as EventFact;
  event.surfacedToPresident = shouldSurfaceToPresident(event);
  return event;
}

function detectCongress(prev: GameState, curr: GameState): EventFact[] {
  const out: EventFact[] = [];
  for (const bill of curr.legislativeProceedings) {
    const before = prev.legislativeProceedings.find((item) => item.id === bill.id);
    if (!before) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "LEGISLATION_INTRODUCED", category: "government", source: "CONGRESS", headlineKey: "bill-introduced", subjects: [{ id: bill.id, type: "PROCEEDING", name: bill.title }], metrics: { billType: bill.billType }, relatedActionIds: [bill.actionId], relatedProceedingIds: [bill.id], dedupeKey: `congress:${bill.id}:introduced` }));
    else if (before.status !== bill.status && ["PASSED", "FAILED", "WITHDRAWN"].includes(bill.status)) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: bill.status === "PASSED" ? "LEGISLATION_PASSED" : bill.status === "FAILED" ? "LEGISLATION_FAILED" : "LEGISLATION_WITHDRAWN", category: "government", source: "CONGRESS", subjects: [{ id: bill.id, type: "PROCEEDING", name: bill.title }], previousValues: { status: before.status }, currentValues: { status: bill.status }, metrics: { billType: bill.billType, chamberYes: bill.voteResult?.chamber.yes ?? 0, senateYes: bill.voteResult?.senate.yes ?? 0 }, relatedActionIds: [bill.actionId], relatedProceedingIds: [bill.id], dedupeKey: `congress:${bill.id}:${bill.status}` }));
  }
  return out;
}

function detectProjects(prev: GameState, curr: GameState): EventFact[] {
  const out: EventFact[] = [];
  for (const p of curr.projects) {
    const before = prev.projects.find((item) => item.id === p.id);
    const statusBefore = before?.lifecycle.status;
    if (!before || statusBefore !== p.lifecycle.status) {
      const map: Record<string, EventFact["type"]> = { ACTIVE: before?.lifecycle.status === "STALLED" ? "PROJECT_RESUMED" : "PROJECT_STARTED", STALLED: "PROJECT_STALLED", COMPLETED: "PROJECT_COMPLETED", FAILED: "PROJECT_FAILED", CANCELLED: "PROJECT_CANCELLED" };
      const type = map[p.lifecycle.status];
      if (type) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type, category: p.category === "Social" ? "social" : "government", source: "PROJECT", subjects: [{ id: p.id, type: "PROJECT", name: p.name }], previousValues: { status: statusBefore ?? "NONE", progress: before?.lifecycle.progress ?? 0 }, currentValues: { status: p.lifecycle.status, progress: p.lifecycle.progress }, metrics: { budget: p.lifecycle.totalBudget, spent: p.lifecycle.spent, progress: Math.round(p.lifecycle.progress) }, causes: p.lifecycle.status === "STALLED" || p.lifecycle.status === "FAILED" ? ["insufficient funding"] : undefined, geography: p.geographicTarget ? [p.geographicTarget] : undefined, relatedActionIds: [p.actionId], relatedProjectIds: [p.id], dedupeKey: `project:${p.id}:${p.lifecycle.status}` }));
    } else if (p.lifecycle.totalBudget >= T.projectNewsBudget) {
      for (const milestone of [25, 50, 75]) if ((before?.lifecycle.progress ?? 0) < milestone && p.lifecycle.progress >= milestone) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "PROJECT_MILESTONE", category: "government", source: "PROJECT", subjects: [{ id: p.id, type: "PROJECT", name: p.name }], previousValues: { progress: before?.lifecycle.progress ?? 0 }, currentValues: { progress: p.lifecycle.progress }, metrics: { milestone, budget: p.lifecycle.totalBudget, spent: p.lifecycle.spent }, relatedProjectIds: [p.id], dedupeKey: `project:${p.id}:milestone:${milestone}` }));
    }
  }
  return out;
}

function metricDelta(after: Record<string, number>, before?: Record<string, number>) { const out: Record<string, number> = {}; for (const [key, value] of Object.entries(after)) out[key] = value - (before?.[key] ?? 0); return out; }
function detectOperations(prev: GameState, curr: GameState): EventFact[] {
  const out: EventFact[] = [];
  for (const op of curr.activeOperations) {
    const before = prev.activeOperations.find((item) => item.id === op.id);
    const delta = metricDelta(op.cumulativeResults as unknown as Record<string, number>, before?.cumulativeResults as unknown as Record<string, number> | undefined);
    const subject = [{ id: op.id, type: "OPERATION" as const, name: op.name }];
    if (!before) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "OPERATION_LAUNCHED", category: "security", source: "OPERATION", subjects: subject, metrics: { budget: op.lifecycle.totalBudget, duration: op.lifecycle.plannedDurationTurns }, geography: [op.location], relatedActionIds: [op.actionId], relatedOperationIds: [op.id], dedupeKey: `operation:${op.id}:launched` }));
    const significant = delta.highValueArrests > 0 || delta.assetsSeized >= T.majorAssetSeizure || delta.criminalCapacityReduction >= 2 || delta.facilitiesDisrupted >= 2;
    if (significant) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: delta.highValueArrests > 0 ? "OPERATION_BREAKTHROUGH" : "OPERATION_DEVELOPMENT", category: "security", source: "OPERATION", subjects: subject, metrics: delta, geography: [op.location], relatedOperationIds: [op.id], dedupeKey: `operation:${op.id}:development:${curr.turn}` }));
    if (delta.civilianCasualties > 0 || delta.governmentCasualties >= 2) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "OPERATION_CASUALTIES", category: "security", source: "OPERATION", subjects: subject, metrics: delta, geography: [op.location], relatedOperationIds: [op.id], dedupeKey: `operation:${op.id}:casualties:${curr.turn}` }));
    if (before && before.lifecycle.status !== op.lifecycle.status && ["COMPLETED", "FAILED", "CANCELLED"].includes(op.lifecycle.status)) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: op.lifecycle.status === "COMPLETED" ? "OPERATION_COMPLETED" : op.lifecycle.status === "FAILED" ? "OPERATION_FAILED" : "OPERATION_CANCELLED", category: "security", source: "OPERATION", subjects: subject, previousValues: { status: before.lifecycle.status }, currentValues: { status: op.lifecycle.status, outcome: op.finalOutcome ?? "NONE" }, metrics: op.cumulativeResults as unknown as Record<string, number>, relatedOperationIds: [op.id], dedupeKey: `operation:${op.id}:${op.lifecycle.status}` }));
  }
  return out;
}

function thresholdFacts(prev: GameState, curr: GameState): EventFact[] {
  const out: EventFact[] = [];
  // An operation's aggregate development event is the canonical account of its
  // direct impact. Avoid emitting a second article for the same organisation loss.
  const organisationsCoveredByOperations = new Set(
    curr.activeOperations
      .filter((operation) => {
        const before = prev.activeOperations.find((item) => item.id === operation.id);
        return (
          operation.cumulativeResults.criminalCapacityReduction -
            (before?.cumulativeResults.criminalCapacityReduction ?? 0) >=
          2
        );
      })
      .map((operation) => operation.targetOrganisationId)
      .filter((id): id is string => Boolean(id))
  );
  const numeric = (type: EventFact["type"], category: EventFact["category"], source: EventFact["source"], key: string, before: number, after: number, min: number) => { if (Math.abs(after - before) >= min) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type, category, source, subjects: [{ id: "BRA", type: "COUNTRY", name: "Brazil" }], previousValues: { [key]: before }, currentValues: { [key]: after }, metrics: { change: after - before }, dedupeKey: `${source}:${key}:change:${curr.turn}` })); };
  numeric("APPROVAL_SHIFT", "politics", "POLITICS", "approval", prev.approval, curr.approval, T.approvalSharpChange);
  numeric("INFLATION_SHIFT", "economy", "ECONOMY", "inflation", prev.inflation, curr.inflation, T.inflationChange);
  numeric("UNEMPLOYMENT_SHIFT", "economy", "ECONOMY", "unemployment", prev.unemployment, curr.unemployment, T.unemploymentChange);
  numeric("SECURITY_INDEX_SHIFT", "security", "SECURITY", "securityIndex", prev.securityIndex, curr.securityIndex, T.securityChange);
  const previousFx = prev.externalEconomy.exchangeRateBrlPerUsd;
  const currentFx = curr.externalEconomy.exchangeRateBrlPerUsd;
  const fxMoveShare = previousFx > 0 ? (currentFx - previousFx) / previousFx : 0;
  if (Math.abs(fxMoveShare) >= T.exchangeRateMoveShare) {
    out.push(fact({
      turn: curr.turn,
      occurredTurn: curr.turn,
      date: curr.date,
      type: "EXCHANGE_RATE_SHIFT",
      category: "economy",
      source: "ECONOMY",
      subjects: [{ id: "BRL", type: "INSTITUTION", name: "Brazilian real" }],
      previousValues: { exchangeRateBrlPerUsd: previousFx },
      currentValues: { exchangeRateBrlPerUsd: currentFx },
      metrics: {
        change: currentFx - previousFx,
        changePercent: fxMoveShare * 100,
        importedInflationPressure: curr.externalEconomy.importedInflationPressure,
        externalDemandContribution: curr.externalEconomy.externalDemandContribution,
      },
      causes: [
        curr.externalEconomy.globalRiskIndex > 105
          ? "elevated global risk"
          : curr.externalEconomy.commodityConditionsIndex < 95
            ? "weaker commodity conditions"
            : curr.externalEconomy.commodityConditionsIndex > 105
              ? "stronger commodity conditions"
              : "changing external and financial conditions",
      ],
      consequences: [
        fxMoveShare > 0
          ? "Imported price pressure is rising while export competitiveness improves."
          : "Imported price pressure is easing while export competitiveness softens.",
      ],
      dedupeKey: `economy:fx:${curr.turn}`,
    }));
  }
  for (const band of T.approvalBands) if (crossed(prev.approval, curr.approval, band)) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "APPROVAL_THRESHOLD", category: "politics", source: "POLITICS", subjects: [{ id: "PRESIDENCY", type: "INSTITUTION", name: "Presidency" }], previousValues: { approval: prev.approval }, currentValues: { approval: curr.approval }, metrics: { threshold: band }, dedupeKey: `politics:approval:${band}:${curr.approval >= band ? "up" : "down"}` }));
  for (const band of T.coalitionBands) if (crossed(prev.congressionalSupport, curr.congressionalSupport, band)) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "COALITION_THRESHOLD", category: "politics", source: "POLITICS", subjects: [{ id: "CONGRESS", type: "INSTITUTION", name: "National Congress" }], previousValues: { support: prev.congressionalSupport }, currentValues: { support: curr.congressionalSupport }, metrics: { threshold: band }, dedupeKey: `politics:coalition:${band}:${curr.congressionalSupport >= band ? "up" : "down"}` }));
  if (prev.gdpGrowth >= 0 && curr.gdpGrowth < 0 || prev.gdpGrowth < 0 && curr.gdpGrowth >= 0) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: curr.gdpGrowth < 0 ? "RECESSION_BEGAN" : "RECESSION_ENDED", category: "economy", source: "ECONOMY", subjects: [{ id: "BRA", type: "COUNTRY", name: "Brazil" }], previousValues: { growth: prev.gdpGrowth }, currentValues: { growth: curr.gdpGrowth }, dedupeKey: `economy:recession:${curr.gdpGrowth < 0 ? "began" : "ended"}` }));
  if (prev.creditRating !== curr.creditRating) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "CREDIT_RATING_CHANGED", category: "economy", source: "ECONOMY", subjects: [{ id: "BRA", type: "COUNTRY", name: "Brazil" }], previousValues: { rating: prev.creditRating }, currentValues: { rating: curr.creditRating }, dedupeKey: `economy:rating:${curr.creditRating}` }));
  for (const band of T.debtBands) if (crossed(prev.fiscal.debtToGDP, curr.fiscal.debtToGDP, band)) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "DEBT_THRESHOLD", category: "economy", source: "FISCAL", subjects: [{ id: "TREASURY", type: "INSTITUTION", name: "Federal Treasury" }], previousValues: { debtToGDP: prev.fiscal.debtToGDP }, currentValues: { debtToGDP: curr.fiscal.debtToGDP }, metrics: { threshold: band }, dedupeKey: `fiscal:debt:${band}:${curr.fiscal.debtToGDP >= band ? "up" : "down"}` }));
  if (Math.abs(curr.fiscal.nominalBalance - prev.fiscal.nominalBalance) >= T.fiscalBalanceShift) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "FISCAL_BALANCE_SHIFT", category: "economy", source: "FISCAL", subjects: [{ id: "TREASURY", type: "INSTITUTION", name: "Federal Treasury" }], previousValues: { nominalBalance: prev.fiscal.nominalBalance }, currentValues: { nominalBalance: curr.fiscal.nominalBalance }, metrics: { change: curr.fiscal.nominalBalance - prev.fiscal.nominalBalance }, dedupeKey: `fiscal:balance:${curr.turn}` }));
  const newLedger = curr.fiscal.ledger.filter((entry) => !prev.fiscal.ledger.some((old) => old.id === entry.id));
  const expenditure = newLedger.reduce((sum, entry) => sum + (entry.balanceImpact < 0 ? entry.amount : 0), 0);
  if (expenditure >= T.majorExpenditure) {
    const proceedingIds = [...new Set(newLedger.flatMap((entry) => entry.proceedingId ? [entry.proceedingId] : []))];
    const single = newLedger.length === 1 ? newLedger[0] : undefined;
    const annualExpenditureImpact = newLedger.reduce((sum, entry) => sum + Math.max(0, -entry.annualRunRateImpact), 0);
    const annualRevenueImpact = newLedger.reduce((sum, entry) => sum + Math.max(0, entry.annualRunRateImpact), 0);
    const currentTurnCashImpact = newLedger.reduce((sum, entry) => sum + entry.currentTurnCashImpact, 0);
    out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "MAJOR_EXPENDITURE", category: "economy", source: "FISCAL", subjects: [{ id: "TREASURY", type: "INSTITUTION", name: "Federal Treasury" }], metrics: { expenditure, transactions: newLedger.length, annualExpenditureImpact, annualRevenueImpact, currentTurnCashImpact, ...(single ? { annualRunRateImpact: single.annualRunRateImpact, policyDescription: single.description } : {}) }, relatedActionIds: newLedger.map((entry) => entry.actionId), ...(proceedingIds.length === 1 ? { relatedProceedingIds: proceedingIds } : {}), dedupeKey: `fiscal:major-spending:${curr.turn}` }));
  }
  for (const org of curr.criminalOrganisations) { const before = prev.criminalOrganisations.find((item) => item.id === org.id); if (!before) continue; const change = org.capacity - before.capacity; if (!organisationsCoveredByOperations.has(org.id) && Math.abs(change) >= T.criminalCapacityChange) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "CRIMINAL_CAPACITY_SHIFT", category: "security", source: "SECURITY", subjects: [{ id: org.id, type: "ORGANISATION", name: org.name }], previousValues: { capacity: before.capacity }, currentValues: { capacity: org.capacity }, metrics: { capacityChange: change }, geography: org.primaryTerritory, dedupeKey: `security:${org.id}:capacity:${curr.turn}` })); if (before.threatLevel !== org.threatLevel) out.push(fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "CRIMINAL_THREAT_CHANGED", category: "security", source: "SECURITY", subjects: [{ id: org.id, type: "ORGANISATION", name: org.name }], previousValues: { threat: before.threatLevel }, currentValues: { threat: org.threatLevel }, dedupeKey: `security:${org.id}:threat:${org.threatLevel}` })); }
  return out;
}

function detectWorld(prev: GameState, curr: GameState): EventFact[] { return curr.worldEvents.filter((event) => !prev.worldEvents.some((old) => old.id === event.id)).map((event) => fact({ turn: curr.turn, occurredTurn: curr.turn, date: curr.date, type: "WORLD_EVENT", category: event.type === "international" ? "international" : "government", source: "WORLD", subjects: [{ id: event.id, type: event.type === "international" ? "COUNTRY" : "STATE", name: event.location }], metrics: { severity: event.severity, requiresResponse: event.requiresResponse }, consequences: event.brazilImpact ? [event.brazilImpact.description] : undefined, geography: [event.location], dedupeKey: `world:${event.id}` })); }

function detectCopom(prev: GameState, curr: GameState): EventFact[] {
  return curr.monetaryPolicy.decisionHistory
    .filter((decision) => !prev.monetaryPolicy.decisionHistory.some((old) => old.id === decision.id))
    .map((decision) => fact({
      turn: decision.turn,
      occurredTurn: decision.turn,
      date: decision.date,
      type: "COPOM_DECISION",
      category: "economy",
      source: "MONETARY",
      subjects: [{ id: "BCB-COPOM", type: "INSTITUTION", name: "Banco Central do Brasil / COPOM" }],
      previousValues: { selic: decision.previousSelic },
      currentValues: { selic: decision.newSelic },
      metrics: {
        change: decision.change,
        inflation: decision.inflation,
        inflationTarget: decision.inflationTarget,
        outputGap: decision.outputGap,
        decision: decision.decision,
      },
      causes: decision.reasons,
      consequences: ["The new stance will transmit gradually through aggregate demand."],
      dedupeKey: `monetary:${decision.id}`,
    }));
}

export function detectStateChanges({ previousState: prev, currentState: curr }: DetectStateChangesInput): EventFact[] {
  const candidates = [...detectCongress(prev, curr), ...detectProjects(prev, curr), ...detectOperations(prev, curr), ...detectCopom(prev, curr), ...thresholdFacts(prev, curr), ...detectWorld(prev, curr)];
  const historical = new Set((prev.eventHistory ?? []).map((event) => event.dedupeKey));
  const unique = new Map<string, EventFact>();
  for (const event of candidates) if (!historical.has(event.dedupeKey) && !unique.has(event.dedupeKey)) unique.set(event.dedupeKey, event);
  return [...unique.values()];
}
