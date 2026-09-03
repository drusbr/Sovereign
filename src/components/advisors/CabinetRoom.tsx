"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { buildAdvisorContext, firstSentence } from "@/lib/gameState";
import { getAdvisorsFromState, type AdvisorDefinition } from "@/lib/advisors";
import type { CabinetTurn } from "@/lib/aiPrompts";
import { TypingIndicator } from "@/components/advisors/TypingIndicator";

const CABINET_OPENER =
  "Mr. President, the cabinet is assembled. What would you like to discuss?";
const WRAP_UP_LINE =
  "Mr. President, we're running short on time. Do you want to summarise any decisions before we adjourn?";

interface CabinetMessage {
  id: number;
  /** "player" or an advisor id */
  speaker: string;
  text: string;
}

/** Seat positions around the table, in a fixed role order (chief of staff at the head-left). */
const SEAT_POSITIONS = [
  { xPct: 10, yPct: 44 },
  { xPct: 27, yPct: 10 },
  { xPct: 50, yPct: 2 },
  { xPct: 73, yPct: 10 },
  { xPct: 90, yPct: 44 },
];

const SEAT_ROLE_ORDER = ["chief_of_staff", "security", "economic", "foreign", "social"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A small randomised pause between cabinet responses, kept out of the component body for purity. */
function sleepWithJitter(baseMs: number, jitterMs: number) {
  return sleep(baseMs + Math.random() * jitterMs);
}

export function CabinetRoom({ onClose }: { onClose: () => void }) {
  const { gameState, addMeetingRecord } = useGame();
  const advisors = getAdvisorsFromState(gameState);
  const chiefOfStaff = advisors.find((a) => a.role === "chief_of_staff") ?? advisors[0];
  const seats = SEAT_ROLE_ORDER.map((role, i) => {
    const advisor = advisors.find((a) => a.role === role);
    return advisor ? { advisor, ...SEAT_POSITIONS[i] } : null;
  }).filter((s): s is { advisor: AdvisorDefinition; xPct: number; yPct: number } => s !== null);

  const [messages, setMessages] = useState<CabinetMessage[]>([
    { id: 0, speaker: chiefOfStaff.id, text: CABINET_OPENER },
  ]);
  const [input, setInput] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [hasNudged, setHasNudged] = useState(false);
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBusy = isFetching || activeSpeakerId !== null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, activeSpeakerId, isFetching]);

  function nextId() {
    idRef.current += 1;
    return idRef.current;
  }

  async function revealResponses(
    responses: { advisorId: string; message: string }[]
  ) {
    for (const r of responses) {
      setActiveSpeakerId(r.advisorId);
      await sleepWithJitter(700, 500);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), speaker: r.advisorId, text: r.message },
      ]);
    }
    setActiveSpeakerId(null);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isBusy) return;

    const playerMessage: CabinetMessage = { id: nextId(), speaker: "player", text };
    const nextMessages = [...messages, playerMessage];
    setMessages(nextMessages);
    setInput("");
    setIsFetching(true);
    setError(null);

    try {
      const history: CabinetTurn[] = nextMessages.map((m) => ({
        speaker: m.speaker,
        text: m.text,
      }));

      const res = await fetch("/api/cabinet-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: buildAdvisorContext(gameState),
          history,
          advisors,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setIsFetching(false);
      await revealResponses(data.responses ?? []);

      const newCount = exchangeCount + 1;
      setExchangeCount(newCount);
      if (newCount >= 3 && !hasNudged) {
        setHasNudged(true);
        await sleep(400);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), speaker: chiefOfStaff.id, text: WRAP_UP_LINE },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsFetching(false);
      setActiveSpeakerId(null);
    }
  }

  async function handleEndMeeting() {
    setIsEnding(true);
    try {
      let summaryText = "- Convened the cabinet; no substantive discussion took place.";
      const playerSpoke = messages.some((m) => m.speaker === "player");

      if (playerSpoke) {
        const transcript = messages
          .map((m) => {
            if (m.speaker === "player") return `President: ${m.text}`;
            const advisor = advisors.find((a) => a.id === m.speaker);
            return `${advisor?.name ?? m.speaker}: ${m.text}`;
          })
          .join("\n");

        try {
          const res = await fetch("/api/meeting-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "cabinet", transcript }),
          });
          const data = await res.json();
          if (res.ok && typeof data.summary === "string") {
            summaryText = data.summary;
          }
        } catch {
          // fall back to the generic summaryText above
        }
      }

      addMeetingRecord({
        turn: gameState.turn,
        date: gameState.date,
        orders: "[Cabinet Meeting]",
        narrative: summaryText,
        eventSummary: firstSentence(summaryText),
        approvalChange: 0,
        securityIndexChange: 0,
      });
    } finally {
      setIsEnding(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05070f]">
      {/* Warm ambient lighting overlay — distinct from the rest of the app's cool tones */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 30%, rgba(251,191,36,0.07), transparent 65%), radial-gradient(ellipse 80% 60% at 50% 90%, rgba(239,68,68,0.04), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
            Palácio do Planalto
          </p>
          <h1 className="text-lg font-semibold text-text">Cabinet Room</h1>
        </div>
        <button
          type="button"
          onClick={handleEndMeeting}
          disabled={isEnding}
          className="rounded-md border border-border bg-panel-2 px-4 py-2 text-sm font-semibold text-text transition hover:border-danger/50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnding ? "Ending…" : "End Cabinet Meeting"}
        </button>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Table + seats */}
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="relative aspect-[4/3] w-full max-w-2xl">
            <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full">
              <defs>
                <radialGradient id="cabinetTable" cx="50%" cy="35%" r="75%">
                  <stop offset="0%" stopColor="#2a1c10" />
                  <stop offset="100%" stopColor="#120b05" />
                </radialGradient>
              </defs>
              <ellipse
                cx="200"
                cy="150"
                rx="175"
                ry="112"
                fill="url(#cabinetTable)"
                stroke="#4a2f16"
                strokeWidth="3"
              />
              <ellipse
                cx="200"
                cy="150"
                rx="152"
                ry="94"
                fill="none"
                stroke="#5c3a1a"
                strokeWidth="1"
                opacity="0.5"
              />
            </svg>

            {seats.map((seat) => {
              const advisor = seat.advisor;
              const isSpeaking = activeSpeakerId === advisor.id;
              return (
                <div
                  key={advisor.id}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-center"
                  style={{ left: `${seat.xPct}%`, top: `${seat.yPct}%` }}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold transition-shadow ${advisor.avatarTextClass}`}
                    style={{
                      backgroundColor: advisor.hex,
                      boxShadow: isSpeaking
                        ? `0 0 0 3px ${advisor.hex}80, 0 0 22px ${advisor.hex}70`
                        : "0 0 0 1px rgba(255,255,255,0.08)",
                    }}
                  >
                    {advisor.initials}
                  </div>
                  <div className="max-w-[92px]">
                    <p className="truncate text-[11px] font-semibold text-text">
                      {advisor.name.split(" ").slice(-1)[0]}
                    </p>
                    <p className="truncate text-[9px] text-text-muted">
                      {advisor.title}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* President's seat, at the head of the table */}
            <div
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-center"
              style={{ left: "50%", top: "94%" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent bg-panel text-xs font-bold text-accent">
                You
              </div>
              <p className="text-[11px] font-semibold text-text">
                {gameState.playerTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Conversation feed */}
        <div className="flex w-full flex-col border-t border-border/60 bg-panel/40 lg:w-[420px] lg:border-l lg:border-t-0">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.map((m) => {
              if (m.speaker === "player") {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg rounded-tr-none bg-panel-2 px-3 py-2 text-sm leading-relaxed text-text">
                      {m.text}
                    </div>
                  </div>
                );
              }
              const advisor = advisors.find((a) => a.id === m.speaker);
              if (!advisor) return null;
              return (
                <div key={m.id} className="flex items-start gap-2">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${advisor.avatarTextClass}`}
                    style={{ backgroundColor: advisor.hex }}
                  >
                    {advisor.initials}
                  </div>
                  <div className="min-w-0 max-w-[85%]">
                    <p
                      className="text-[11px] font-semibold"
                      style={{ color: advisor.hex }}
                    >
                      {advisor.name}
                    </p>
                    <div
                      className="mt-0.5 rounded-lg rounded-tl-none border px-3 py-2 text-sm leading-relaxed text-text"
                      style={{
                        backgroundColor: `${advisor.hex}14`,
                        borderColor: `${advisor.hex}40`,
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {isFetching && (
              <div className="flex items-center gap-2 text-text-muted">
                <TypingIndicator />
                <span className="text-xs">The cabinet is deliberating…</span>
              </div>
            )}

            {activeSpeakerId && (
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                    advisors.find((a) => a.id === activeSpeakerId)?.avatarTextClass ?? ""
                  }`}
                  style={{
                    backgroundColor: advisors.find((a) => a.id === activeSpeakerId)?.hex,
                  }}
                >
                  {advisors.find((a) => a.id === activeSpeakerId)?.initials}
                </div>
                <TypingIndicator
                  color={advisors.find((a) => a.id === activeSpeakerId)?.hex}
                />
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}
          </div>

          <div className="border-t border-border/60 px-5 py-4">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={isBusy || isEnding}
                placeholder="Address the cabinet, Mr. President…"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-border bg-panel px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isBusy || isEnding || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-text-muted"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
