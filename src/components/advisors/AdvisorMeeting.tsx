"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { buildAdvisorContext } from "@/lib/gameState";
import type { AdvisorDefinition } from "@/lib/advisors";
import type { MeetingTurn } from "@/lib/aiPrompts";
import { TypingIndicator } from "@/components/advisors/TypingIndicator";

export function AdvisorMeeting({
  advisor,
  onEndMeeting,
}: {
  advisor: AdvisorDefinition;
  onEndMeeting: () => void;
}) {
  const { gameState, addMeetingRecord } = useGame();
  const [messages, setMessages] = useState<MeetingTurn[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void fetchAdvisorLine([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isSending]);

  async function fetchAdvisorLine(history: MeetingTurn[]) {
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch("/api/advisor-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisorId: advisor.id,
          personaPrompt: advisor.personaPrompt,
          context: buildAdvisorContext(gameState),
          history,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setMessages((prev) => [...prev, { speaker: "advisor", text: data.message }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    const nextHistory: MeetingTurn[] = [...messages, { speaker: "player", text }];
    setMessages(nextHistory);
    setInput("");
    await fetchAdvisorLine(nextHistory);
  }

  async function handleEnd() {
    setIsEnding(true);
    try {
      let summaryText = `Met privately with ${advisor.name}.`;

      if (messages.length > 0) {
        const transcript = messages
          .map((m) => `${m.speaker === "player" ? "President" : advisor.name}: ${m.text}`)
          .join("\n");

        try {
          const res = await fetch("/api/meeting-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "individual",
              advisorName: advisor.name,
              transcript,
            }),
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
        orders: `[Meeting] ${advisor.name}`,
        narrative: summaryText,
        eventSummary: summaryText,
        approvalChange: 0,
        securityIndexChange: 0,
      });
    } finally {
      setIsEnding(false);
      onEndMeeting();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          Private Meeting
        </span>
        <button
          type="button"
          onClick={handleEnd}
          disabled={isEnding}
          className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-xs font-semibold text-text transition hover:border-danger/50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnding ? "Ending…" : "End Meeting"}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.map((m, i) =>
          m.speaker === "advisor" ? (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${advisor.avatarTextClass}`}
                style={{ backgroundColor: advisor.hex }}
              >
                {advisor.initials}
              </div>
              <div
                className="max-w-[80%] rounded-lg rounded-tl-none border px-3.5 py-2.5 text-sm leading-relaxed text-text"
                style={{
                  backgroundColor: `${advisor.hex}14`,
                  borderColor: `${advisor.hex}40`,
                }}
              >
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] rounded-lg rounded-tr-none bg-panel-2 px-3.5 py-2.5 text-sm leading-relaxed text-text">
                {m.text}
              </div>
            </div>
          )
        )}

        {isSending && (
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${advisor.avatarTextClass}`}
              style={{ backgroundColor: advisor.hex }}
            >
              {advisor.initials}
            </div>
            <div
              className="rounded-lg rounded-tl-none border px-3.5 py-2.5"
              style={{
                backgroundColor: `${advisor.hex}14`,
                borderColor: `${advisor.hex}40`,
              }}
            >
              <TypingIndicator color={advisor.hex} />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="border-t border-border px-6 py-4">
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
            disabled={isSending || isEnding}
            placeholder="Say something, Mr. President…"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-panel px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || isEnding || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-text-muted"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
