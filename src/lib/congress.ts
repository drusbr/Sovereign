import type { ProposedAction } from "@/lib/actions/types";
import type { GameState } from "@/lib/gameState";
import { applyFiscalAction, isFiscalAction } from "@/lib/fiscal";
import { createLifecycleEntities } from "@/lib/operationsProjectsEngine";
import { fmtPct } from "@/lib/format";

export type LegislativeStatus =
  | "INTRODUCED"
  | "NEGOTIATING"
  | "READY_FOR_VOTE"
  | "PASSED"
  | "FAILED"
  | "WITHDRAWN";

export interface LegislativeConcession {
  id: string;
  turn: number;
  kind: "COALITION_NEGOTIATION" | "POLICY_CONCESSION" | "AMENDMENT" | "PUBLIC_PRESSURE";
  description: string;
  chamberSupportChange: number;
  senateSupportChange: number;
}

export interface ChamberVoteResult {
  yes: number;
  no: number;
  abstain: number;
  quorum: number;
  approvalThreshold: number;
  approvalRule: "SIMPLE_MAJORITY" | "ABSOLUTE_MAJORITY" | "THREE_FIFTHS";
  passed: boolean;
}

export interface LegislativeVoteResult {
  turn: number;
  chamber: ChamberVoteResult;
  senate: ChamberVoteResult;
  passed: boolean;
}

export interface LegislativeProceeding {
  id: string;
  actionId: string;
  title: string;
  description: string;
  proposedTurn: number;
  status: LegislativeStatus;
  billType: "ORDINARY" | "COMPLEMENTARY" | "CONSTITUTIONAL_AMENDMENT";
  requiredInstitution: "National Congress";
  supportModifier: number;
  senateModifier: number;
  uncertaintyModifier: number;
  proposalStrength: number;
  concessions: LegislativeConcession[];
  voteResult?: LegislativeVoteResult;
  actionResolution: {
    actionId: string;
    status: "PENDING" | "EXECUTED" | "FAILED";
    reason: string;
  };
  originalAction: ProposedAction;
}

export interface ChamberProjection {
  totalSeats: number;
  quorum: number;
  projectedApprovalThreshold: number;
  approvalRule: ChamberVoteResult["approvalRule"];
  support: number;
  opposition: number;
  uncertain: number;
  supportRate: number;
}

export interface CongressProjection {
  chamber: ChamberProjection;
  senate: ChamberProjection;
  sources: string[];
  resistance: string[];
}

export type CongressAction =
  | "NEGOTIATE"
  | "CONCEDE"
  | "AMEND"
  | "PUBLIC_PRESSURE"
  | "WITHDRAW"
  | "CALL_VOTE";

export interface CongressActionResult {
  state: GameState;
  message: string;
  voteResult?: LegislativeVoteResult;
}

const CHAMBER_TOTAL = 513;
const SENATE_TOTAL = 81;
const CHAMBER_QUORUM = 257;
const SENATE_QUORUM = 41;

interface ChamberRule {
  quorum: number;
  fixedApprovalThreshold?: number;
  approvalRule: ChamberVoteResult["approvalRule"];
}

export function chamberRule(
  billType: LegislativeProceeding["billType"],
  chamber: "CHAMBER" | "SENATE"
): ChamberRule {
  const quorum = chamber === "CHAMBER" ? CHAMBER_QUORUM : SENATE_QUORUM;
  if (billType === "COMPLEMENTARY") {
    return { quorum, fixedApprovalThreshold: quorum, approvalRule: "ABSOLUTE_MAJORITY" };
  }
  if (billType === "CONSTITUTIONAL_AMENDMENT") {
    return {
      quorum,
      fixedApprovalThreshold: chamber === "CHAMBER" ? 308 : 49,
      approvalRule: "THREE_FIFTHS",
    };
  }
  return { quorum, approvalRule: "SIMPLE_MAJORITY" };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function proposalLean(action: ProposedAction): "left" | "right" | "neutral" {
  const text = action.rawOrder.toLowerCase();
  if (/welfare|poverty|union|worker|public health|education|wealth|top.*tax|income tax|environment|amazon/.test(text)) return "left";
  if (/tax cut|deregulat|privati|military|police|security|business|market|fiscal discipline/.test(text)) return "right";
  return "neutral";
}

function alignmentFit(state: GameState, action: ProposedAction): number {
  const lean = proposalLean(action);
  if (lean === "neutral" || state.playerAlignment === "centre") return 0;
  return lean === state.playerAlignment ? 5 : -7;
}

function priorityFit(state: GameState, action: ProposedAction): number {
  const order = action.rawOrder.toLowerCase();
  const relevant = state.presidentialPriorities.some((priority) => {
    const words = priority.toLowerCase().split(/\W+/).filter((word) => word.length > 4);
    return words.some((word) => order.includes(word));
  });
  return relevant ? 4 : 0;
}

function projection(totalSeats: number, rule: ChamberRule, rate: number, uncertaintyRate: number): ChamberProjection {
  const uncertain = Math.round(totalSeats * uncertaintyRate / 100);
  const support = clamp(Math.round(totalSeats * rate / 100), 0, totalSeats - uncertain);
  const opposition = totalSeats - support - uncertain;
  const projectedApprovalThreshold = rule.fixedApprovalThreshold ?? Math.floor((support + opposition) / 2) + 1;
  return { totalSeats, quorum: rule.quorum, projectedApprovalThreshold, approvalRule: rule.approvalRule, support, uncertain, opposition, supportRate: rate };
}

export function calculateCongressSupport(state: GameState, proceeding: LegislativeProceeding): CongressProjection {
  const approvalEffect = clamp(Math.round((state.approval - 50) * 0.15), -8, 8);
  const fit = alignmentFit(state, proceeding.originalAction);
  const priority = priorityFit(state, proceeding.originalAction);
  const centreBonus = state.playerAlignment === "centre" ? 3 : 0;
  const chamberRate = clamp(
    Math.round(state.congressionalSupport + approvalEffect + fit + priority + centreBonus + proceeding.supportModifier),
    10,
    90
  );
  // The Senate is smaller, less coalition-disciplined, and modestly more resistant to rapid change.
  const senateRate = clamp(
    Math.round(state.congressionalSupport * 0.92 + approvalEffect * 0.7 + fit * 0.7 + priority + proceeding.senateModifier - 2),
    10,
    90
  );
  const uncertainty = clamp(12 + proceeding.uncertaintyModifier, 3, 24);
  const sources = [
    `Governing coalition provides a ${fmtPct(state.congressionalSupport)} political base`,
    ...(approvalEffect > 0 ? ["Public approval strengthens pressure on wavering legislators"] : []),
    ...(fit > 0 ? ["The proposal fits the governing alignment"] : []),
    ...(priority > 0 ? ["The bill advances a declared presidential priority"] : []),
  ];
  const resistance = [
    ...(approvalEffect < 0 ? ["Weak public approval reduces presidential leverage"] : []),
    ...(fit < 0 ? ["The proposal cuts against the governing alignment"] : []),
    "The Senate is less responsive to coalition discipline than the Chamber",
  ];
  return {
    chamber: projection(CHAMBER_TOTAL, chamberRule(proceeding.billType, "CHAMBER"), chamberRate, uncertainty),
    senate: projection(SENATE_TOTAL, chamberRule(proceeding.billType, "SENATE"), senateRate, uncertainty + 2),
    sources,
    resistance,
  };
}

function billTitle(order: string): string {
  const clean = order.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
  return clean.length <= 92 ? clean : `${clean.slice(0, 89)}…`;
}

export function createLegislativeProceeding(action: ProposedAction, turn: number): LegislativeProceeding {
  return {
    id: `bill-${action.id}`,
    actionId: action.id,
    title: billTitle(action.rawOrder),
    description: action.rawOrder.trim(),
    proposedTurn: turn,
    status: "INTRODUCED",
    billType: "ORDINARY",
    requiredInstitution: "National Congress",
    supportModifier: 0,
    senateModifier: 0,
    uncertaintyModifier: 0,
    proposalStrength: 100,
    concessions: [],
    actionResolution: {
      actionId: action.id,
      status: "PENDING",
      reason: "Awaiting passage by the Chamber of Deputies and Federal Senate.",
    },
    originalAction: structuredClone(action),
  };
}

export function ensureLegislativeProceedings(
  state: GameState,
  actions: ProposedAction[],
  turn: number
): GameState {
  const existing = state.legislativeProceedings ?? [];
  const ids = new Set(existing.map((bill) => bill.actionId));
  const additions = actions
    .filter((action) => !ids.has(action.id) && assessLegislativeEntry(action).entersCongress)
    .map((action) => createLegislativeProceeding(action, turn));
  return additions.length ? { ...state, legislativeProceedings: [...existing, ...additions] } : state;
}

export interface LegislativeEntryDecision {
  entersCongress: boolean;
  proceedingId?: string;
  blocker?: string;
}

export function assessLegislativeEntry(action: ProposedAction): LegislativeEntryDecision {
  if (action.authority.type !== "LEGISLATIVE") {
    return { entersCongress: false, blocker: "The action is not classified as legislative." };
  }
  const blocker = action.validationIssues.find(
    (issue) => issue.severity === "BLOCKER" && issue.code !== "REQUIRES_LEGISLATION"
  );
  return blocker
    ? { entersCongress: false, blocker: blocker.message }
    : { entersCongress: true, proceedingId: `bill-${action.id}` };
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seeded(seed: number): () => number {
  let value = seed || 1;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function determineChamberOutcome(
  counts: Pick<ChamberVoteResult, "yes" | "no" | "abstain">,
  rule: ChamberRule
): ChamberVoteResult {
  const attendance = counts.yes + counts.no + counts.abstain;
  const approvalThreshold = rule.fixedApprovalThreshold ?? Math.floor((counts.yes + counts.no) / 2) + 1;
  return {
    ...counts,
    quorum: rule.quorum,
    approvalThreshold,
    approvalRule: rule.approvalRule,
    passed: attendance >= rule.quorum && counts.yes >= approvalThreshold,
  };
}

function voteChamber(projected: ChamberProjection, random: () => number): ChamberVoteResult {
  let yes = projected.support;
  let no = projected.opposition;
  let abstain = 0;
  for (let i = 0; i < projected.uncertain; i++) {
    const roll = random();
    if (roll < projected.supportRate / 100) yes++;
    else if (roll < 0.9) no++;
    else abstain++;
  }
  return determineChamberOutcome(
    { yes, no, abstain },
    {
      quorum: projected.quorum,
      approvalRule: projected.approvalRule,
      ...(projected.approvalRule === "SIMPLE_MAJORITY"
        ? {}
        : { fixedApprovalThreshold: projected.projectedApprovalThreshold }),
    }
  );
}

export function resolveCongressVote(state: GameState, proceedingId: string): CongressActionResult {
  const proceeding = (state.legislativeProceedings ?? []).find((bill) => bill.id === proceedingId);
  if (!proceeding) throw new Error("Legislative proceeding not found.");
  if (["PASSED", "FAILED", "WITHDRAWN"].includes(proceeding.status)) throw new Error("This proceeding is already closed.");
  if (state.actionPoints < 1) throw new Error("Calling a vote requires 1 action point.");

  const projected = calculateCongressSupport(state, proceeding);
  const random = seeded(hashSeed(`${proceeding.id}:${proceeding.proposedTurn}:${state.turn}`));
  const chamber = voteChamber(projected.chamber, random);
  const senate = voteChamber(projected.senate, random);
  const passed = chamber.passed && senate.passed;
  const voteResult: LegislativeVoteResult = { turn: state.turn, chamber, senate, passed };
  const isLifecycleAction = proceeding.originalAction.actionType === "FUND_PROJECT"
    || proceeding.originalAction.actionType === "FUND_OPERATION"
    || proceeding.originalAction.actionType === "PROJECT_INITIATIVE"
    || proceeding.originalAction.actionType === "SECURITY_OPERATION";
  const lifecycleState = passed && isLifecycleAction
    ? createLifecycleEntities(state, [proceeding.originalAction], { legislationPassed: true })
    : state;
  const lifecycleCreated = lifecycleState.projects.some((item) => item.actionId === proceeding.originalAction.id)
    || lifecycleState.activeOperations.some((item) => item.actionId === proceeding.originalAction.id);
  const fiscalResult = passed && isFiscalAction(proceeding.originalAction) && !isLifecycleAction
    ? applyFiscalAction(state, proceeding.originalAction, { legislationPassed: true, proceedingId })
    : null;
  const implemented = passed && (isLifecycleAction ? lifecycleCreated : !fiscalResult || Boolean(fiscalResult.entry));
  const linkedProjectIds = lifecycleState.projects.filter((item) => item.actionId === proceeding.originalAction.id).map((item) => item.id);
  const linkedOperationIds = lifecycleState.activeOperations.filter((item) => item.actionId === proceeding.originalAction.id).map((item) => item.id);
  const implementation = passed ? {
    id: `implementation-${proceeding.id}`,
    proceedingId,
    actionId: proceeding.originalAction.id,
    title: proceeding.title,
    status: (implemented ? (fiscalResult?.entry ? "FUNDING_RELEASED" : "IMPLEMENTATION_PHASE") : "BLOCKED") as "FUNDING_RELEASED" | "IMPLEMENTATION_PHASE" | "BLOCKED",
    startedTurn: state.turn,
    expectedCompletionTurn: state.turn + (isLifecycleAction ? 8 : 12),
    responsibleInstitution: proceeding.originalAction.actionType === "FUND_OPERATION" || proceeding.originalAction.actionType === "SECURITY_OPERATION" ? "Ministry of Justice and federal security agencies" : isFiscalAction(proceeding.originalAction) ? "Ministry of Finance and Federal Revenue Service" : "Presidency and responsible federal ministries",
    departmentsAffected: null,
    expectedAnnualFiscalImpact: fiscalResult?.entry?.annualRunRateImpact ?? null,
    linkedProjectIds,
    linkedOperationIds,
    summary: linkedProjectIds.length || linkedOperationIds.length ? "Congressional authority obtained; delivery is proceeding through the linked funded programme or operation." : fiscalResult?.entry ? "Congressional authority obtained and the enacted fiscal measure has entered the federal accounts." : "Congressional authority obtained; responsible ministries are preparing implementation.",
  } : null;
  const updated: LegislativeProceeding = {
    ...proceeding,
    status: passed ? "PASSED" : "FAILED",
    voteResult,
    actionResolution: {
      actionId: proceeding.actionId,
      status: implemented ? "EXECUTED" : "FAILED",
      reason: implemented
        ? fiscalResult
          ? "Both chambers passed the bill; legal authority was obtained and authorised fiscal effects were recorded."
          : "Both chambers passed the bill; legal authority has been obtained."
        : passed
          ? `The bill passed, but implementation failed fiscal validation: ${fiscalResult?.validation.issues.join(" ")}`
        : "The bill failed to obtain approval in both required chambers.",
    },
  };
  return {
    state: {
      ...(fiscalResult?.state ?? lifecycleState),
      actionPoints: state.actionPoints - 1,
      approval: clamp(state.approval + (passed ? 2 : -2), 0, 100),
      congressionalSupport: clamp(state.congressionalSupport + (passed ? 2 : -4), 0, 100),
      legislativeProceedings: state.legislativeProceedings.map((bill) => bill.id === proceedingId ? updated : bill),
      policyImplementations: implementation && !state.policyImplementations.some((item) => item.proceedingId === proceedingId) ? [...state.policyImplementations, implementation] : state.policyImplementations,
    },
    voteResult,
    message: implemented
      ? "The bill passed both chambers and its authorised fiscal effects were recorded."
      : passed
        ? "The bill passed, but its fiscal implementation could not be recorded because the action lacked valid fiscal parameters."
        : "The bill failed in Congress and will not take effect.",
  };
}

export function applyCongressAction(state: GameState, proceedingId: string, action: CongressAction): CongressActionResult {
  if (action === "CALL_VOTE") return resolveCongressVote(state, proceedingId);
  const proceeding = (state.legislativeProceedings ?? []).find((bill) => bill.id === proceedingId);
  if (!proceeding) throw new Error("Legislative proceeding not found.");
  if (["PASSED", "FAILED", "WITHDRAWN"].includes(proceeding.status)) throw new Error("This proceeding is already closed.");
  if (action === "WITHDRAW") {
    const withdrawn = { ...proceeding, status: "WITHDRAWN" as const, actionResolution: { actionId: proceeding.actionId, status: "FAILED" as const, reason: "Withdrawn by the President." } };
    return { state: { ...state, legislativeProceedings: state.legislativeProceedings.map((bill) => bill.id === proceedingId ? withdrawn : bill) }, message: "The bill was withdrawn from Congress." };
  }
  if (state.actionPoints < 1) throw new Error("This congressional action requires 1 action point.");

  const requestedKind: Record<Exclude<CongressAction, "CALL_VOTE" | "WITHDRAW">, LegislativeConcession["kind"]> = {
    NEGOTIATE: "COALITION_NEGOTIATION",
    CONCEDE: "POLICY_CONCESSION",
    AMEND: "AMENDMENT",
    PUBLIC_PRESSURE: "PUBLIC_PRESSURE",
  };
  const duplicate = proceeding.concessions.find(
    (item) => item.turn === state.turn && item.kind === requestedKind[action]
  );
  if (duplicate) return { state, message: "This congressional intervention has already been recorded for the current turn." };

  let support = 0;
  let senate = 0;
  let uncertainty = 0;
  let proposalStrength = proceeding.proposalStrength;
  let approval = state.approval;
  let congressionalSupport = state.congressionalSupport;
  let mediaSentiment = state.mediaSentiment;
  let kind: LegislativeConcession["kind"];
  let description: string;

  if (action === "NEGOTIATE") {
    support = 6; senate = 4; uncertainty = -2; congressionalSupport -= 1;
    kind = "COALITION_NEGOTIATION"; description = "Coalition leaders received committee and agenda assurances.";
  } else if (action === "CONCEDE") {
    support = 9; senate = 7; uncertainty = -3; proposalStrength -= 12; approval -= 2;
    kind = "POLICY_CONCESSION"; description = "Substantive policy concessions broadened legislative support.";
  } else if (action === "AMEND") {
    support = 7; senate = 8; uncertainty = -4; proposalStrength -= 18;
    kind = "AMENDMENT"; description = "The proposal was softened to answer institutional objections.";
  } else {
    const gain = state.approval >= 60 ? 8 : state.approval >= 45 ? 4 : -2;
    support = gain; senate = Math.round(gain / 2); uncertainty = 2;
    mediaSentiment += gain > 0 ? 2 : -3;
    congressionalSupport += gain < 0 ? -2 : 0;
    kind = "PUBLIC_PRESSURE"; description = gain > 0 ? "A public campaign pressured undecided legislators." : "A weak public campaign hardened congressional resistance.";
  }

  const concession: LegislativeConcession = {
    id: `${proceeding.id}-${action.toLowerCase()}-${proceeding.concessions.length + 1}`,
    turn: state.turn,
    kind,
    description,
    chamberSupportChange: support,
    senateSupportChange: senate,
  };
  const updated: LegislativeProceeding = {
    ...proceeding,
    status: "NEGOTIATING",
    supportModifier: proceeding.supportModifier + support,
    senateModifier: proceeding.senateModifier + senate,
    uncertaintyModifier: proceeding.uncertaintyModifier + uncertainty,
    proposalStrength: clamp(proposalStrength, 40, 100),
    concessions: [...proceeding.concessions, concession],
  };
  return {
    state: {
      ...state,
      actionPoints: state.actionPoints - 1,
      approval: clamp(approval, 0, 100),
      congressionalSupport: clamp(congressionalSupport, 0, 100),
      mediaSentiment: clamp(mediaSentiment, 0, 100),
      legislativeProceedings: state.legislativeProceedings.map((bill) => bill.id === proceedingId ? updated : bill),
    },
    message: description,
  };
}
