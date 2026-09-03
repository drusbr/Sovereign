import { applyStateSecurityChanges } from "@/lib/brazilStates";
import {
  advanceGameDate,
  clamp0to100,
  pushCapped,
  pushTurnRecord,
  type BrazilImpact,
  type CriminalOrganisation,
  type DomesticCategory,
  type EventResponseOption,
  type GameState,
  type InternationalCategory,
  type NewsArticle,
  type WorldEvent,
} from "@/lib/gameState";
import { buildIntelligenceEvent, pushIntelligenceEvent } from "@/lib/intelligence";
import { adjustCreditRating } from "@/lib/economy";
import { appendArticles, computePressCoverage, computeSentimentDelta } from "@/lib/media";
import {
  applyInternationalPressureDrag,
  computeActiveNegotiations,
  computeGlobalStanding,
  expireOpportunities,
  maybeAddSecurityOperationPressure,
} from "@/lib/diplomacy";
import { findTriggeredEvent } from "@/lib/events";
import { getProjectRuntimeInfo } from "@/lib/projects";
import {
  applyNumericEffects,
  checkFailureThresholds,
  deriveThreatLevelFromCapacity,
  describeTriggeredRule,
} from "@/lib/simulationEngine";
import { runTurnTick } from "@/lib/simulationEngine";
import type {
  NovelWorldEventResult,
  OrganisationEffect,
  WorldEventDetailResult,
} from "@/lib/aiPrompts";
import type { RandomEventSeed } from "@/lib/eventGenerator";
import { buildActionResolutions, processInstitutionalActions } from "./institutionalProcessing";
import { ensureLegislativeProceedings } from "@/lib/congress";
import { applyFiscalAction, closeFiscalWeek, isFiscalAction } from "@/lib/fiscal";
import { createLifecycleEntities, processLifecycleTurn } from "@/lib/operationsProjectsEngine";
import { applyEventPipeline } from "@/lib/eventPipeline";
import type {
  GeneratedWorldEventsInput,
  ResolveTurnInput,
  TurnResolution,
  TurnResolutionDraft,
} from "./types";

function copyState(state: GameState): GameState {
  return structuredClone(state);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

function applyOrganisationEffects(orgs: CriminalOrganisation[], effects: OrganisationEffect[]) {
  return orgs.map((org) => {
    const effect = effects.find((candidate) => candidate.id === org.id);
    if (!effect || effect.capacityChange === 0) return org;
    const capacity = clamp0to100(org.capacity + effect.capacityChange);
    return {
      ...org,
      capacity,
      threatLevel: deriveThreatLevelFromCapacity(capacity),
      trend: effect.capacityChange < 0 ? "weakening" as const : "growing" as const,
    };
  });
}

function applyMedia(state: GameState, media: ResolveTurnInput["generatedMedia"], turn: number, date: string) {
  if (!media) return state;
  const articles: NewsArticle[] = media.articles.map((article, index) => ({
    id: `article-${turn}-${index}`,
    turn,
    date,
    outlet: article.outlet as NewsArticle["outlet"],
    headline: article.headline,
    body: article.body,
    sentiment: article.sentiment as NewsArticle["sentiment"],
    topic: article.topic as NewsArticle["topic"],
    isBreaking: article.isBreaking,
  }));
  const sentimentDelta = computeSentimentDelta(articles);
  const breakingCount = articles.filter((article) => article.isBreaking).length;
  const mediaSentiment = clamp0to100(state.mediaSentiment + sentimentDelta);
  const mediaEvents = [...state.mediaEvents];
  if (Math.abs(sentimentDelta) >= 5 || breakingCount > 0) {
    mediaEvents.push({
      turn,
      date,
      description: media.dominantNarrative || articles[0]?.headline || "Notable press reaction",
      sentimentImpact: sentimentDelta,
    });
  }
  return {
    ...state,
    newsArticles: appendArticles(state.newsArticles, articles),
    mediaSentiment,
    pressCoverage: computePressCoverage(articles.length, breakingCount),
    dominantNarrative: media.dominantNarrative || state.dominantNarrative,
    mediaEvents: mediaEvents.slice(-30),
  };
}

/** Resolves everything deterministic through the new-turn simulation tick. */
export function resolveTurn(input: ResolveTurnInput): TurnResolutionDraft {
  const current = copyState(input.state);
  const processed = processInstitutionalActions(current, input.actions);
  const actions = processed.map(({ action }) => action);
  const hasExecutableAction = processed.some(({ disposition }) => disposition === "EXECUTABLE");
  const executableActions = processed.filter((item) => item.disposition === "EXECUTABLE").map((item) => item.action);
  const hasLifecycleCreation = executableActions.some((action) =>
    ["FUND_PROJECT", "FUND_OPERATION", "PROJECT_INITIATIVE", "SECURITY_OPERATION"].includes(action.actionType)
  );
  const mechanicalEffects = hasLifecycleCreation
    ? Object.fromEntries(Object.entries(input.aiResult.effects).filter(([key]) =>
        !["approval", "securityIndex", "civilLiberties", "militaryMorale", "internationalPressure"].includes(key)
      )) as typeof input.aiResult.effects
    : input.aiResult.effects;
  const orders = actions.map((action) => action.rawOrder.trim()).filter(Boolean).join("\n");
  const approvalChange = mechanicalEffects.approval ?? 0;
  const securityIndexChange = mechanicalEffects.securityIndex ?? 0;

  let working = ensureLegislativeProceedings(copyState(current), actions, current.turn);
  if (hasExecutableAction) {
    working = applyNumericEffects(working, mechanicalEffects);
    if (!hasLifecycleCreation) {
      working.criminalOrganisations = applyOrganisationEffects(
        working.criminalOrganisations,
        input.aiResult.organisationEffects
      );
      working.stateSecurity = applyStateSecurityChanges(
        working.stateSecurity,
        input.aiResult.stateSecurityChanges
      );
    }
    for (const item of processed) {
      if (item.disposition === "EXECUTABLE" && isFiscalAction(item.action)) {
        if (item.action.actionType !== "FUND_PROJECT" && item.action.actionType !== "FUND_OPERATION") {
          working = applyFiscalAction(working, item.action).state;
        }
      }
    }
  }
  // Projects and operations now come only from authorised structured actions.
  working = createLifecycleEntities(working, executableActions);
  const lifecycle = processLifecycleTurn(working, current.turn);
  working = lifecycle.state;

  const turnRecord = {
    turn: current.turn,
    date: current.date,
    orders,
    narrative: input.aiResult.narrative,
    eventSummary: input.aiResult.eventSummary,
    approvalChange,
    securityIndexChange,
    actions,
    institutionalRecords: processed.map(({ action, disposition, reason }) => {
      const proceeding = working.legislativeProceedings.find(
        (bill) => bill.actionId === action.id
      );
      return {
        actionId: action.id,
        rawOrder: action.rawOrder,
        interpretedActionType: action.actionType,
        authority: action.authority.type,
        validationIssues: action.validationIssues,
        disposition,
        ...(reason ? { reason } : {}),
        proceedingCreated: Boolean(proceeding),
        ...(proceeding ? { proceedingId: proceeding.id } : {}),
      };
    }),
    lifecycleReports: lifecycle.reports,
  };
  working.situation = input.aiResult.situationSummary || working.situation;
  working.history = pushTurnRecord(working.history, turnRecord);
  working.intelligenceEvents = pushIntelligenceEvent(
    working.intelligenceEvents,
    buildIntelligenceEvent(turnRecord)
  );
  working = applyMedia(working, input.generatedMedia, current.turn, current.date);

  const pressureDrag = applyInternationalPressureDrag(
    working.diplomaticRelations,
    working.internationalPressure,
    current.turn,
    current.date
  );
  const opportunities = expireOpportunities(working.diplomaticOpportunities, current.turn + 1);
  working.diplomaticRelations = pressureDrag.relations;
  working.diplomaticOpportunities = opportunities;
  working.diplomaticPressures = maybeAddSecurityOperationPressure(
    working.diplomaticPressures,
    securityIndexChange,
    current.turn
  );
  working.diplomaticEvents = [...working.diplomaticEvents, ...pressureDrag.events].slice(-40);
  working.globalStanding = computeGlobalStanding(pressureDrag.relations);
  working.activeNegotiations = computeActiveNegotiations(opportunities);

  working.gdpHistory = pushCapped(working.gdpHistory, working.gdpGrowth);
  working.fdiHistory = pushCapped(working.fdiHistory, working.fdiFlow);
  working.businessRegistrationHistory = pushCapped(
    working.businessRegistrationHistory,
    working.businessRegistrations
  );
  working.approvalHistory = pushCapped(working.approvalHistory, working.approval);
  working.mediaSentimentHistory = pushCapped(
    working.mediaSentimentHistory,
    working.mediaSentiment
  );
  working.creditRating = adjustCreditRating(
    working.creditRating,
    working.gdpGrowth,
    working.inflation,
    working.fiscal.debtToGDP
  );

  const previousTurn = current.turn;
  working.date = advanceGameDate(current.date);
  working.turn = previousTurn + 1;
  working.actionPoints = 3;
  working = closeFiscalWeek(working);
  const tick = runTurnTick(working);
  tick.newState.worldDriftLog = tick.triggeredRules
    .map(describeTriggeredRule)
    .filter((line): line is string => Boolean(line));

  return {
    previousState: current,
    state: tick.newState,
    actionResolutions: buildActionResolutions(
      processed,
      new Map(working.legislativeProceedings.map((bill) => [bill.actionId, bill.id]))
    ),
    turnRecord,
    previousTurn,
    generatedEffects: hasExecutableAction ? mechanicalEffects : {},
  };
}

function buildSeedEvent(seed: RandomEventSeed, detail: WorldEventDetailResult | undefined, turn: number, index: number): WorldEvent {
  return {
    id: `wevent_${turn}_seed_${index}_${slugify(seed.title)}`,
    type: seed.type,
    category: seed.category,
    title: seed.title,
    location: detail?.location || "Brazil",
    description: detail?.description || "",
    context: detail?.context || "",
    startTurn: turn,
    expiresOnTurn: turn + (seed.severity === "informational" ? 1 : 2),
    severity: seed.severity,
    requiresResponse: false,
    responseOptions: [],
    brazilImpact: detail?.brazilImpact ? {
      description: detail.brazilImpact.description,
      severity: detail.brazilImpact.severity as BrazilImpact["severity"],
      affectedAreas: detail.brazilImpact.affectedAreas,
      suggestedResponse: detail.brazilImpact.suggestedResponse,
    } : null,
    status: "ongoing",
    playerResponse: null,
    resolvedOnTurn: null,
  };
}

function buildNovelEvent(novel: NovelWorldEventResult, turn: number): WorldEvent {
  const responseOptions: EventResponseOption[] = novel.responseOptions.map((option) => ({
    id: slugify(option.label),
    label: option.label,
    description: option.description,
    effects: option.effects as Partial<Record<keyof GameState, number>>,
    requiresActionPoints: option.requiresActionPoints,
    consequenceNarrative: option.consequenceNarrative,
  }));
  return {
    id: `wevent_${turn}_novel_${slugify(novel.title)}`,
    type: novel.type,
    category: novel.category as DomesticCategory | InternationalCategory,
    title: novel.title,
    location: novel.location,
    description: novel.description,
    context: novel.context,
    startTurn: turn,
    expiresOnTurn: turn + (novel.requiresResponse ? 3 : 2),
    severity: novel.severity as WorldEvent["severity"],
    requiresResponse: novel.requiresResponse,
    responseOptions,
    brazilImpact: novel.brazilImpact ? {
      description: novel.brazilImpact.description,
      severity: novel.brazilImpact.severity as BrazilImpact["severity"],
      affectedAreas: novel.brazilImpact.affectedAreas,
      suggestedResponse: novel.brazilImpact.suggestedResponse,
    } : null,
    status: novel.requiresResponse ? "active" : "ongoing",
    playerResponse: null,
    resolvedOnTurn: null,
  };
}

function activateAndArchiveEvents(state: GameState): GameState {
  const worldEvents: WorldEvent[] = [];
  const archived: WorldEvent[] = [];
  for (const original of state.worldEvents) {
    const event = original.status === "ongoing" && original.requiresResponse && original.startTurn <= state.turn
      ? { ...original, status: "active" as const }
      : original;
    if ((event.status === "active" || event.status === "ongoing") && event.expiresOnTurn <= state.turn) {
      archived.push({
        ...event,
        status: event.requiresResponse ? "expired" : "resolved",
        resolvedOnTurn: state.turn,
      });
    } else {
      worldEvents.push(event);
    }
  }
  return {
    ...state,
    worldEvents,
    resolvedWorldEvents: [...state.resolvedWorldEvents, ...archived].slice(-60),
  };
}

/** Adds externally generated events, then completes deterministic end-of-turn checks. */
export function finalizeTurn(
  draft: TurnResolutionDraft,
  generated: GeneratedWorldEventsInput
): TurnResolution {
  const state = copyState(draft.state);
  const newWorldEvents = [...generated.plan.deterministicEvents];
  generated.plan.randomSeeds.forEach((seed, index) => {
    newWorldEvents.push(buildSeedEvent(seed, generated.randomDetails?.[index], state.turn, index));
  });
  if (generated.novelEvent) newWorldEvents.push(buildNovelEvent(generated.novelEvent, state.turn));

  state.worldEvents = [...state.worldEvents, ...newWorldEvents];
  state.eventCooldowns = { ...state.eventCooldowns, ...generated.plan.cooldownUpdates };
  let finalState = activateAndArchiveEvents(state);

  const completed = finalState.projects.filter((project) => {
    const was = getProjectRuntimeInfo(project, draft.previousTurn).phase === "completed";
    const now = getProjectRuntimeInfo(project, finalState.turn).phase === "completed";
    return !was && now;
  });
  if (completed.length > 0) {
    finalState.worldDriftLog = [
      ...finalState.worldDriftLog,
      ...completed.map((project) => `${project.name} completed: ${project.unlocks}`),
    ];
  }

  const failureThresholds = checkFailureThresholds(finalState).filter(
    (threshold) => !finalState.triggeredFailureThresholdIds.includes(threshold.id)
  );
  if (failureThresholds.length > 0) {
    finalState.triggeredFailureThresholdIds = [
      ...finalState.triggeredFailureThresholdIds,
      ...failureThresholds.map((threshold) => threshold.id),
    ];
  }
  const triggeredGameEvent = findTriggeredEvent(finalState) ?? null;
  if (triggeredGameEvent) {
    finalState.triggeredEventIds = [...finalState.triggeredEventIds, triggeredGameEvent.id];
  }

  const pipeline = applyEventPipeline(draft.previousState, finalState);
  finalState = pipeline.state;
  const eventFactIds = pipeline.events.map((event) => event.id);
  if (eventFactIds.length > 0) {
    finalState.history = finalState.history.map((record, index, all) =>
      index === all.length - 1 && record.turn === draft.turnRecord.turn
        ? { ...record, eventFactIds }
        : record
    );
  }
  const turnRecord = { ...draft.turnRecord, eventFactIds };

  return {
    state: finalState,
    actionResolutions: draft.actionResolutions,
    turnRecord,
    generatedEffects: draft.generatedEffects,
    newWorldEvents,
    failureThresholds,
    triggeredGameEvent,
    eventFacts: pipeline.events,
  };
}
