"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, GUEST_STATE_KEY } from "@/context/AuthContext";
import {
  loadGameState,
  recordTurnHistory,
  saveGameState,
} from "@/lib/supabase/campaigns";
import {
  buildAdvisorContext,
  buildPresidentContext,
  createInitialGameState,
  hydrateGameState,
  firstSentence,
  pushTurnRecord,
  type GameState,
  type InterviewRequest,
  type TurnRecord,
  type WorldEvent,
} from "@/lib/gameState";
import {
  applyEventEffects,
  type GameEventDefinition,
} from "@/lib/events";
import { getAdvisorById, getAdvisorsFromState } from "@/lib/advisors";
import {
  applyNumericEffects,
  roundGameStateNumbers,
  type FailureThreshold,
} from "@/lib/simulationEngine";
import type {
  TurnResult as AITurnResult,
  WorldEventsResult,
} from "@/lib/aiPrompts";
import {
  getChainedEvent,
  planTurnEvents,
} from "@/lib/eventGenerator";
import type { ProposedAction } from "@/lib/actions/types";
import { processInstitutionalActions } from "@/lib/turn/institutionalProcessing";
import { finalizeTurn, resolveTurn } from "@/lib/turn/resolveTurn";
import { applyCongressAction, type CongressAction } from "@/lib/congress";
import {
  cancelLifecycleEntity,
  createLifecycleEntities,
  processLifecycleTurn,
} from "@/lib/operationsProjectsEngine";
import { applyEventPipeline } from "@/lib/eventPipeline";

export interface TurnResult {
  narrative: string;
  approvalChange: number;
  securityIndexChange: number;
}

export interface AdvisorBriefing {
  report: string;
  recommendation: string;
  turnGenerated: number;
}

interface GameContextValue {
  gameState: GameState;
  isLoading: boolean;
  error: string | null;
  lastResult: TurnResult | null;
  issueOrders: (actions: ProposedAction[]) => Promise<void>;
  activeEvent: GameEventDefinition | null;
  isResolvingEvent: boolean;
  eventError: string | null;
  resolveEvent: (optionId: string) => Promise<void>;
  advisorBriefings: Record<string, AdvisorBriefing>;
  advisorLoading: Record<string, boolean>;
  advisorErrors: Record<string, string>;
  fetchAdvisorBriefing: (advisorId: string) => Promise<void>;
  /** Deducts `cost` action points if enough remain; returns whether it succeeded. */
  spendActionPoints: (cost: number) => boolean;
  /** Appends a meeting record (individual or cabinet) to the turn history log. */
  addMeetingRecord: (record: TurnRecord) => void;
  spinRoomAssessment: { text: string; turnGenerated: number } | null;
  spinRoomLoading: boolean;
  spinRoomError: string | null;
  fetchSpinRoomAssessment: () => Promise<void>;
  acceptInterview: (id: string) => void;
  declineInterview: (id: string) => void;
  /** Crisis alerts from checkFailureThresholds, queued one at a time. */
  activeFailureAlerts: FailureThreshold[];
  dismissFailureAlert: () => void;
  /** Applies a world event's chosen response and returns the consequence narrative. */
  respondToWorldEvent: (eventId: string, optionId: string) => Promise<string>;
  respondingWorldEventId: string | null;
  worldEventResponseError: string | null;
  /** The Supabase campaign this session is bound to, if the player is authenticated and resumed/started one. */
  campaignId: string | null;
  /** Auto-save status for the sidebar's "Auto-saved" indicator. */
  saveStatus: "idle" | "saving" | "saved" | "error";
  manageLegislation: (proceedingId: string, action: CongressAction) => Promise<string>;
  cancelLifecycle: (entityId: string) => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth();
  const searchParams = useSearchParams();
  const requestedCampaignId = searchParams.get("campaign");

  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== "undefined" && !requestedCampaignId) {
      const guestRaw = window.localStorage.getItem(GUEST_STATE_KEY);
      if (guestRaw) {
        try {
          return hydrateGameState(JSON.parse(guestRaw) as Partial<GameState>);
        } catch {
          // fall through to a fresh game
        }
      }
    }
    return createInitialGameState();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TurnResult | null>(null);

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Resume a specific authenticated campaign when arriving via ?campaign=<id>.
  useEffect(() => {
    if (!requestedCampaignId) return;
    setCampaignId(requestedCampaignId);
    loadGameState(requestedCampaignId).then(({ state, error: loadError }) => {
      if (state) setGameState(state);
      else if (loadError) console.error("Failed to load campaign:", loadError);
    });
  }, [requestedCampaignId]);

  const persistTurn = useCallback(
    async (
      newState: GameState,
      orders: string,
      narrative: string,
      approvalChange: number,
      securityChange: number
    ) => {
      if (user && campaignId) {
        setSaveStatus("saving");
        const { error: saveError } = await saveGameState(campaignId, newState);
        if (saveError) {
          setSaveStatus("error");
          return;
        }
        void recordTurnHistory(
          campaignId,
          newState.turn,
          orders,
          narrative,
          approvalChange,
          securityChange,
          newState.worldDriftLog.slice(-5)
        );
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else if (isGuest && typeof window !== "undefined") {
        window.localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(newState));
      }
    },
    [user, campaignId, isGuest]
  );

  const [activeEvent, setActiveEvent] = useState<GameEventDefinition | null>(
    null
  );
  const [isResolvingEvent, setIsResolvingEvent] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  const [advisorBriefings, setAdvisorBriefings] = useState<
    Record<string, AdvisorBriefing>
  >({});
  const [advisorLoading, setAdvisorLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [advisorErrors, setAdvisorErrors] = useState<Record<string, string>>(
    {}
  );

  const [spinRoomAssessment, setSpinRoomAssessment] = useState<{
    text: string;
    turnGenerated: number;
  } | null>(null);
  const [spinRoomLoading, setSpinRoomLoading] = useState(false);
  const [spinRoomError, setSpinRoomError] = useState<string | null>(null);

  const [activeFailureAlerts, setActiveFailureAlerts] = useState<FailureThreshold[]>(
    []
  );

  const [respondingWorldEventId, setRespondingWorldEventId] = useState<string | null>(
    null
  );
  const [worldEventResponseError, setWorldEventResponseError] = useState<string | null>(
    null
  );

  const issueOrders = useCallback(
    async (actions: ProposedAction[]) => {
      if (actions.length === 0) return;
      const submittedActions = processInstitutionalActions(gameState, actions).map(
        ({ action }) => action
      );
      const combinedOrders = submittedActions
        .map((action) => action.rawOrder.trim())
        .filter(Boolean)
        .join("\n");
      if (!combinedOrders) return;

      setIsLoading(true);
      setError(null);

      try {
        const current = gameState;
        const executablePreviewActions = processInstitutionalActions(current, submittedActions)
          .filter((item) => item.disposition === "EXECUTABLE")
          .map((item) => item.action);
        const lifecyclePreview = processLifecycleTurn(
          createLifecycleEntities(current, executablePreviewActions),
          current.turn
        );

        // --- Step 8: order resolution — structured Gemini response ---------
        const res = await fetch("/api/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actions: submittedActions,
            context: {
              countryName: current.countryName,
              playerTitle: current.playerTitle,
              turn: current.turn,
              date: current.date,
              approval: current.approval,
              securityIndex: current.securityIndex,
              gdpGrowth: current.gdpGrowth,
              inflation: current.inflation,
              congressionalSupport: current.congressionalSupport,
              militaryMorale: current.militaryMorale,
              civilLiberties: current.civilLiberties,
              internationalPressure: current.internationalPressure,
              fdiFlow: current.fdiFlow,
              unemployment: current.unemployment,
              businessRegistrations: current.businessRegistrations,
              creditRating: current.creditRating,
              criminalOrganisations: current.criminalOrganisations.map((o) => ({
                id: o.id,
                shortName: o.shortName,
                capacity: o.capacity,
                threatLevel: o.threatLevel,
              })),
              recentEvents: current.history.slice(-5).map((h) => ({
                turn: h.turn,
                date: h.date,
                summary: h.eventSummary,
              })),
              president: buildPresidentContext(current),
              lifecycleFacts: lifecyclePreview.reports,
            },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Something went wrong.");
        }

        const aiResult = data as AITurnResult & { actions?: ProposedAction[] };
        const resolvedActions = aiResult.actions ?? submittedActions;
        const approvalChange = aiResult.effects?.approval ?? 0;
        const securityIndexChange = aiResult.effects?.securityIndex ?? 0;

        const draft = resolveTurn({
          state: current,
          actions: resolvedActions,
          aiResult,
          generatedMedia: null,
        });
        const eventPlan = planTurnEvents(draft.state, draft.state.turn);
        let generatedWorldEvents: WorldEventsResult | null = null;

        if (eventPlan.randomSeeds.length > 0 || eventPlan.generateNovel) {
          try {
            const weRes = await fetch("/api/world-events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
               context: buildAdvisorContext(draft.state),
                seeds: eventPlan.randomSeeds.map((s) => ({
                  title: s.title,
                  type: s.type,
                  category: s.category,
                  severity: s.severity,
                })),
                generateNovel: eventPlan.generateNovel,
              }),
            });
            const weData = await weRes.json();

            if (weRes.ok) generatedWorldEvents = weData as WorldEventsResult;
          } catch (weErr) {
            console.error("World event generation failed:", weErr);
          }
        }

        const resolution = finalizeTurn(draft, {
          plan: generatedWorldEvents
            ? eventPlan
            : { ...eventPlan, randomSeeds: [], generateNovel: false },
          randomDetails: generatedWorldEvents?.randomEvents,
          novelEvent: generatedWorldEvents?.novelEvent,
        });
        const finalState = resolution.state;
        const thresholds = resolution.failureThresholds;
        const triggeredGameEvent = resolution.triggeredGameEvent;

        setGameState(finalState);
        setLastResult({
          narrative: aiResult.narrative,
          approvalChange,
          securityIndexChange,
        });
        if (thresholds.length > 0) setActiveFailureAlerts(thresholds);
        if (triggeredGameEvent) setActiveEvent(triggeredGameEvent);

        void persistTurn(
          finalState,
          combinedOrders,
          aiResult.narrative,
          approvalChange,
          securityIndexChange
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    },
    [gameState, persistTurn]
  );

  const dismissFailureAlert = useCallback(() => {
    setActiveFailureAlerts((prev) => prev.slice(1));
  }, []);

  const manageLegislation = useCallback(
    async (proceedingId: string, action: CongressAction): Promise<string> => {
      try {
        const result = applyCongressAction(gameState, proceedingId, action);
        const reported = applyEventPipeline(gameState, result.state).state;
        setGameState(reported);

        if (user && campaignId) {
          setSaveStatus("saving");
          const { error: saveError } = await saveGameState(campaignId, reported);
          setSaveStatus(saveError ? "error" : "saved");
          if (!saveError) setTimeout(() => setSaveStatus("idle"), 2000);
        } else if (isGuest && typeof window !== "undefined") {
          window.localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(reported));
        }
        return result.message;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Congressional action failed.");
      }
    },
    [gameState, user, campaignId, isGuest]
  );

  const cancelLifecycle = useCallback(async (entityId: string) => {
    if (gameState.actionPoints < 1) throw new Error("Cancellation requires 1 action point.");
    const cancelledRaw = cancelLifecycleEntity(
      { ...gameState, actionPoints: gameState.actionPoints - 1 },
      entityId
    );
    const cancelled = applyEventPipeline(gameState, cancelledRaw).state;
    setGameState(cancelled);
    if (user && campaignId) {
      setSaveStatus("saving");
      const { error: saveError } = await saveGameState(campaignId, cancelled);
      setSaveStatus(saveError ? "error" : "saved");
      if (!saveError) setTimeout(() => setSaveStatus("idle"), 2000);
    } else if (isGuest && typeof window !== "undefined") {
      window.localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(cancelled));
    }
  }, [gameState, user, campaignId, isGuest]);

  const respondToWorldEvent = useCallback(
    async (eventId: string, optionId: string): Promise<string> => {
      const current = gameState;
      const worldEvent = current.worldEvents.find((e) => e.id === eventId);
      if (!worldEvent) return "";
      const option = worldEvent.responseOptions.find((o) => o.id === optionId);
      if (!option) return "";

      setRespondingWorldEventId(eventId);
      setWorldEventResponseError(null);

      try {
        if (
          option.requiresActionPoints > 0 &&
          current.actionPoints < option.requiresActionPoints
        ) {
          throw new Error("Not enough action points to choose this response.");
        }

        let narrative = option.consequenceNarrative;
        try {
          const res = await fetch("/api/world-event-response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventTitle: worldEvent.title,
              eventDescription: worldEvent.description,
              optionLabel: option.label,
              consequenceHint: option.consequenceNarrative,
              context: {
                countryName: current.countryName,
                playerTitle: current.playerTitle,
                turn: current.turn,
                date: current.date,
                approval: current.approval,
                securityIndex: current.securityIndex,
                recentEvents: [],
                president: buildPresidentContext(current),
              },
            }),
          });
          const data = await res.json();
          if (res.ok && typeof data.narrative === "string") {
            narrative = data.narrative;
          }
        } catch {
          // fall back to the pre-authored consequenceNarrative
        }

        const effected = applyNumericEffects(
          {
            ...current,
            worldEvents: current.worldEvents.map((e) => ({ ...e })),
            resolvedWorldEvents: [...current.resolvedWorldEvents],
          },
          option.effects
        );

        const resolvedEvent: WorldEvent = {
          ...worldEvent,
          status: "resolved",
          playerResponse: option.label,
          resolvedOnTurn: current.turn,
        };

        // Some resolved events seed a follow-up ("the world has memory").
        const chainedEvent = getChainedEvent(resolvedEvent, effected, effected.turn);

        setGameState(
          roundGameStateNumbers({
            ...effected,
            actionPoints: Math.max(0, effected.actionPoints - option.requiresActionPoints),
            worldEvents: [
              ...effected.worldEvents.filter((e) => e.id !== eventId),
              ...(chainedEvent ? [chainedEvent] : []),
            ],
            resolvedWorldEvents: [...effected.resolvedWorldEvents, resolvedEvent].slice(-60),
          })
        );

        return narrative;
      } catch (err) {
        setWorldEventResponseError(
          err instanceof Error ? err.message : "Something went wrong."
        );
        return "";
      } finally {
        setRespondingWorldEventId(null);
      }
    },
    [gameState]
  );

  const resolveEvent = useCallback(
    async (optionId: string) => {
      if (!activeEvent || isResolvingEvent) return;
      const option = activeEvent.options.find((o) => o.id === optionId);
      if (!option) return;

      setIsResolvingEvent(true);
      setEventError(null);

      const current = gameState;
      const effected = applyEventEffects(current, option.effects);

      try {
        const res = await fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: {
              title: activeEvent.title,
              description: activeEvent.description,
            },
            optionLabel: option.label,
            context: {
              countryName: effected.countryName,
              playerTitle: effected.playerTitle,
              turn: effected.turn,
              date: effected.date,
              approval: effected.approval,
              securityIndex: effected.securityIndex,
              recentEvents: [],
              president: buildPresidentContext(effected),
            },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Something went wrong.");
        }

        const record: TurnRecord = {
          turn: effected.turn,
          date: effected.date,
          orders: `[Event] ${activeEvent.title} → ${option.label}`,
          narrative: data.narrative,
          eventSummary: firstSentence(data.narrative),
          approvalChange: option.effects.approval ?? 0,
          securityIndexChange: option.effects.securityIndex ?? 0,
        };

        const finalState: GameState = roundGameStateNumbers({
          ...effected,
          situation: firstSentence(data.narrative) || effected.situation,
          history: pushTurnRecord(effected.history, record),
        });

        setGameState(finalState);
        setActiveEvent(null);
      } catch (err) {
        setEventError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setIsResolvingEvent(false);
      }
    },
    [activeEvent, isResolvingEvent, gameState]
  );

  const fetchAdvisorBriefing = useCallback(
    async (advisorId: string) => {
      const current = gameState;
      const advisor = getAdvisorById(advisorId, getAdvisorsFromState(current));
      if (!advisor) return;

      const cached = advisorBriefings[advisorId];
      if (cached && cached.turnGenerated === current.turn) {
        return; // already fresh for this turn — no need to re-generate
      }

      setAdvisorLoading((prev) => ({ ...prev, [advisorId]: true }));
      setAdvisorErrors((prev) => {
        const next = { ...prev };
        delete next[advisorId];
        return next;
      });

      try {
        const res = await fetch("/api/advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            advisorId,
            personaPrompt: advisor.personaPrompt,
            context: buildAdvisorContext(current),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Something went wrong.");
        }

        setAdvisorBriefings((prev) => ({
          ...prev,
          [advisorId]: {
            report: data.report,
            recommendation: data.recommendation,
            turnGenerated: current.turn,
          },
        }));
      } catch (err) {
        setAdvisorErrors((prev) => ({
          ...prev,
          [advisorId]:
            err instanceof Error ? err.message : "Something went wrong.",
        }));
      } finally {
        setAdvisorLoading((prev) => ({ ...prev, [advisorId]: false }));
      }
    },
    [gameState, advisorBriefings]
  );

  const spendActionPoints = useCallback(
    (cost: number): boolean => {
      if (gameState.actionPoints < cost) return false;
      setGameState({
        ...gameState,
        actionPoints: gameState.actionPoints - cost,
      });
      return true;
    },
    [gameState]
  );

  const addMeetingRecord = useCallback(
    (record: TurnRecord) => {
      setGameState({
        ...gameState,
        history: pushTurnRecord(gameState.history, record),
      });
    },
    [gameState]
  );

  const fetchSpinRoomAssessment = useCallback(async () => {
    const current = gameState;
    if (spinRoomAssessment && spinRoomAssessment.turnGenerated === current.turn) {
      return; // already fresh for this turn
    }

    setSpinRoomLoading(true);
    setSpinRoomError(null);

    try {
      const res = await fetch("/api/spin-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            turn: current.turn,
            date: current.date,
            approval: current.approval,
            mediaSentiment: current.mediaSentiment,
            pressCoverage: current.pressCoverage,
            dominantNarrative: current.dominantNarrative,
            pendingInterviews: current.pendingInterviews
              .filter((i) => i.accepted === null)
              .map((i) => ({
                outlet: i.outlet,
                topic: i.topic,
                risk: i.risk,
                opportunity: i.opportunity,
              })),
            president: buildPresidentContext(current),
          },
          chiefOfStaffPersona: getAdvisorsFromState(current).find(
            (a) => a.role === "chief_of_staff"
          )?.personaPrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setSpinRoomAssessment({ text: data.assessment, turnGenerated: current.turn });
    } catch (err) {
      setSpinRoomError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSpinRoomLoading(false);
    }
  }, [gameState, spinRoomAssessment]);

  const setInterviewStatus = useCallback(
    (id: string, accepted: boolean) => {
      setGameState({
        ...gameState,
        pendingInterviews: gameState.pendingInterviews.map(
          (i: InterviewRequest) => (i.id === id ? { ...i, accepted } : i)
        ),
      });
    },
    [gameState]
  );

  const acceptInterview = useCallback(
    (id: string) => setInterviewStatus(id, true),
    [setInterviewStatus]
  );
  const declineInterview = useCallback(
    (id: string) => setInterviewStatus(id, false),
    [setInterviewStatus]
  );

  return (
    <GameContext.Provider
      value={{
        gameState,
        isLoading,
        error,
        lastResult,
        issueOrders,
        activeEvent,
        isResolvingEvent,
        eventError,
        resolveEvent,
        advisorBriefings,
        advisorLoading,
        advisorErrors,
        fetchAdvisorBriefing,
        spendActionPoints,
        addMeetingRecord,
        spinRoomAssessment,
        spinRoomLoading,
        spinRoomError,
        fetchSpinRoomAssessment,
        acceptInterview,
        declineInterview,
        activeFailureAlerts,
        dismissFailureAlert,
        respondToWorldEvent,
        respondingWorldEventId,
        worldEventResponseError,
        campaignId,
        saveStatus,
        manageLegislation,
        cancelLifecycle,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used inside a GameProvider");
  }
  return ctx;
}
