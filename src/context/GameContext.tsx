"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  advanceGameDate,
  buildAdvisorContext,
  clamp0to100,
  createInitialGameState,
  firstSentence,
  pushCapped,
  pushTurnRecord,
  type ActiveOperation,
  type BrazilImpact,
  type CriminalOrganisation,
  type DomesticCategory,
  type EventResponseOption,
  type GameState,
  type InternationalCategory,
  type InterviewRequest,
  type NewsArticle,
  type TurnRecord,
  type WorldEvent,
} from "@/lib/gameState";
import { applyStateSecurityChanges } from "@/lib/brazilStates";
import {
  applyEventEffects,
  findTriggeredEvent,
  type GameEventDefinition,
} from "@/lib/events";
import { getAdvisorById } from "@/lib/advisors";
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
import { getProjectRuntimeInfo, type ProjectDefinition } from "@/lib/projects";
import {
  applyNumericEffects,
  checkFailureThresholds,
  deriveThreatLevelFromCapacity,
  describeTriggeredRule,
  runTurnTick,
  type FailureThreshold,
} from "@/lib/simulationEngine";
import type {
  NewOperationSpec,
  NewProjectSpec,
  OrganisationEffect,
} from "@/lib/gemini";

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
  issueOrders: (orders: string) => Promise<void>;
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
}

const GameContext = createContext<GameContextValue | null>(null);

function applyOrganisationEffects(
  orgs: CriminalOrganisation[],
  effects: OrganisationEffect[]
): CriminalOrganisation[] {
  if (effects.length === 0) return orgs;
  return orgs.map((org) => {
    const effect = effects.find((e) => e.id === org.id);
    if (!effect || effect.capacityChange === 0) return org;
    const nextCapacity = clamp0to100(org.capacity + effect.capacityChange);
    return {
      ...org,
      capacity: nextCapacity,
      threatLevel: deriveThreatLevelFromCapacity(nextCapacity),
      trend: effect.capacityChange < 0 ? "weakening" : "growing",
    };
  });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function applyNewOperation(
  operations: ActiveOperation[],
  spec: NewOperationSpec,
  turn: number
): ActiveOperation[] {
  const newOp: ActiveOperation = {
    id: `op_${turn}_${slugify(spec.name)}`,
    name: spec.name,
    type: spec.type,
    location: spec.location,
    objective: spec.objective,
    startTurn: turn,
    status: "active",
    leadAgency: spec.leadAgency,
  };
  return [...operations, newOp];
}

function applyNewProject(
  projects: ProjectDefinition[],
  spec: NewProjectSpec,
  turn: number
): ProjectDefinition[] {
  const newProject: ProjectDefinition = {
    id: `proj_${turn}_${slugify(spec.name)}`,
    name: spec.name,
    category: spec.category,
    startTurn: turn,
    endTurn: turn + spec.durationTurns,
    statusText: spec.statusText,
    unlocks: spec.unlocks,
  };
  return [...projects, newProject];
}

/** Projects whose phase just crossed into "completed" between the two turn numbers. */
function findNewlyCompletedProjects(
  projects: ProjectDefinition[],
  fromTurn: number,
  toTurn: number
): ProjectDefinition[] {
  return projects.filter((p) => {
    const was = getProjectRuntimeInfo(p, fromTurn).phase === "completed";
    const now = getProjectRuntimeInfo(p, toTurn).phase === "completed";
    return !was && now;
  });
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TurnResult | null>(null);

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

  const issueOrders = useCallback(
    async (orders: string) => {
      const trimmed = orders.trim();
      if (!trimmed) return;

      setIsLoading(true);
      setError(null);

      try {
        const current = gameState;

        // --- Step 8: order resolution — structured Gemini response ---------
        const res = await fetch("/api/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orders: trimmed,
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
            },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Something went wrong.");
        }

        const approvalChange = data.effects?.approval ?? 0;
        const securityIndexChange = data.effects?.securityIndex ?? 0;

        // Apply the order's precise structured effects to a working copy.
        let working: GameState = applyNumericEffects(
          {
            ...current,
            criminalOrganisations: current.criminalOrganisations.map((o) => ({ ...o })),
            activeOperations: [...current.activeOperations],
            projects: current.projects.map((p) => ({ ...p })),
          },
          data.effects ?? {}
        );
        working = {
          ...working,
          criminalOrganisations: applyOrganisationEffects(
            working.criminalOrganisations,
            data.organisationEffects ?? []
          ),
          stateSecurity: applyStateSecurityChanges(
            working.stateSecurity,
            data.stateSecurityChanges ?? []
          ),
        };
        if (data.newOperation) {
          working = {
            ...working,
            activeOperations: applyNewOperation(
              working.activeOperations,
              data.newOperation,
              current.turn
            ),
          };
        }
        if (data.newProject) {
          working = {
            ...working,
            projects: applyNewProject(working.projects, data.newProject, current.turn),
          };
        }

        const record: TurnRecord = {
          turn: current.turn,
          date: current.date,
          orders: trimmed,
          narrative: data.narrative,
          eventSummary: data.eventSummary,
          approvalChange,
          securityIndexChange,
        };
        working = {
          ...working,
          situation: data.situationSummary || working.situation,
          history: pushTurnRecord(working.history, record),
          intelligenceEvents: pushIntelligenceEvent(
            working.intelligenceEvents,
            buildIntelligenceEvent(record)
          ),
        };

        // --- Media coverage — independent Gemini call; failure degrades gracefully ---
        let nextMediaSentiment = working.mediaSentiment;
        try {
          const mediaRes = await fetch("/api/media-news", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderSummary: trimmed,
              narrative: data.narrative,
              context: buildAdvisorContext(working),
            }),
          });
          const mediaData = await mediaRes.json();

          if (mediaRes.ok) {
            const articles: NewsArticle[] = mediaData.articles.map(
              (
                a: {
                  outlet: string;
                  headline: string;
                  body: string;
                  sentiment: string;
                  topic: string;
                  isBreaking: boolean;
                },
                i: number
              ) => ({
                id: `article-${current.turn}-${i}`,
                turn: current.turn,
                date: current.date,
                outlet: a.outlet,
                headline: a.headline,
                body: a.body,
                sentiment: a.sentiment,
                topic: a.topic,
                isBreaking: a.isBreaking,
              })
            );

            const sentimentDelta = computeSentimentDelta(articles);
            const breakingCount = articles.filter((a) => a.isBreaking).length;
            nextMediaSentiment = clamp0to100(working.mediaSentiment + sentimentDelta);

            const mediaEvents = [...working.mediaEvents];
            if (Math.abs(sentimentDelta) >= 5 || breakingCount > 0) {
              mediaEvents.push({
                turn: current.turn,
                date: current.date,
                description:
                  mediaData.dominantNarrative ||
                  articles[0]?.headline ||
                  "Notable press reaction",
                sentimentImpact: sentimentDelta,
              });
            }

            working = {
              ...working,
              newsArticles: appendArticles(working.newsArticles, articles),
              mediaSentiment: nextMediaSentiment,
              pressCoverage: computePressCoverage(articles.length, breakingCount),
              dominantNarrative: mediaData.dominantNarrative || working.dominantNarrative,
              mediaEvents: mediaEvents.slice(-30),
            };
          }
        } catch (mediaErr) {
          console.error("Media generation failed:", mediaErr);
        }

        // --- Diplomacy engine ------------------------------------------------
        const pressureDrag = applyInternationalPressureDrag(
          working.diplomaticRelations,
          working.internationalPressure,
          current.turn,
          current.date
        );
        const expiredOpportunities = expireOpportunities(
          working.diplomaticOpportunities,
          current.turn + 1
        );
        const nextDiplomaticPressures = maybeAddSecurityOperationPressure(
          working.diplomaticPressures,
          securityIndexChange,
          current.turn
        );
        working = {
          ...working,
          diplomaticRelations: pressureDrag.relations,
          diplomaticOpportunities: expiredOpportunities,
          diplomaticPressures: nextDiplomaticPressures,
          diplomaticEvents: [...working.diplomaticEvents, ...pressureDrag.events].slice(
            -40
          ),
          globalStanding: computeGlobalStanding(pressureDrag.relations),
          activeNegotiations: computeActiveNegotiations(expiredOpportunities),
        };

        // --- Step 9: push rolling histories (post-effect values) -------------
        working = {
          ...working,
          gdpHistory: pushCapped(working.gdpHistory, working.gdpGrowth),
          fdiHistory: pushCapped(working.fdiHistory, working.fdiFlow),
          businessRegistrationHistory: pushCapped(
            working.businessRegistrationHistory,
            working.businessRegistrations
          ),
          approvalHistory: pushCapped(working.approvalHistory, working.approval),
          mediaSentimentHistory: pushCapped(
            working.mediaSentimentHistory,
            nextMediaSentiment
          ),
          // --- Step 10: credit rating -----------------------------------------
          creditRating: adjustCreditRating(
            working.creditRating,
            working.gdpGrowth,
            working.inflation
          ),
        };

        // --- Steps 11-12: advance date, increment turn, reset AP -------------
        const previousTurn = current.turn;
        working = {
          ...working,
          date: advanceGameDate(current.date),
          turn: previousTurn + 1,
          actionPoints: 3,
        };

        // --- Step 1-2 (of the NEW turn): world tick -----------------------
        const { newState: ticked, triggeredRules } = runTurnTick(working);
        const worldDriftLog = triggeredRules
          .map((id) => describeTriggeredRule(id))
          .filter((line): line is string => Boolean(line));

        // --- Step 5: project completions --------------------------------
        const newlyCompleted = findNewlyCompletedProjects(
          ticked.projects,
          previousTurn,
          ticked.turn
        );
        let finalState: GameState = {
          ...ticked,
          worldDriftLog,
        };
        if (newlyCompleted.length > 0) {
          finalState = {
            ...finalState,
            worldDriftLog: [
              ...finalState.worldDriftLog,
              ...newlyCompleted.map((p) => `${p.name} completed: ${p.unlocks}`),
            ],
          };
        }

        // --- Step 4: failure thresholds — queue any not yet shown -----------
        const thresholds = checkFailureThresholds(finalState).filter(
          (t) => !finalState.triggeredFailureThresholdIds.includes(t.id)
        );
        if (thresholds.length > 0) {
          finalState = {
            ...finalState,
            triggeredFailureThresholdIds: [
              ...finalState.triggeredFailureThresholdIds,
              ...thresholds.map((t) => t.id),
            ],
          };
        }

        // Existing narrative-event system (GAME_EVENTS)
        const triggeredGameEvent = findTriggeredEvent(finalState);
        if (triggeredGameEvent) {
          finalState = {
            ...finalState,
            triggeredEventIds: [...finalState.triggeredEventIds, triggeredGameEvent.id],
          };
        }

        setGameState(finalState);
        setLastResult({
          narrative: data.narrative,
          approvalChange,
          securityIndexChange,
        });
        if (thresholds.length > 0) setActiveFailureAlerts(thresholds);
        if (triggeredGameEvent) setActiveEvent(triggeredGameEvent);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    },
    [gameState]
  );

  const dismissFailureAlert = useCallback(() => {
    setActiveFailureAlerts((prev) => prev.slice(1));
  }, []);

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

        const finalState: GameState = {
          ...effected,
          situation: firstSentence(data.narrative) || effected.situation,
          history: pushTurnRecord(effected.history, record),
        };

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
      const advisor = getAdvisorById(advisorId);
      if (!advisor) return;

      const current = gameState;
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
          },
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
