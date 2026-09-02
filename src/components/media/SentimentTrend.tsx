"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MediaEvent } from "@/lib/gameState";
import { SectionHeader } from "@/components/SectionHeader";

function SentimentChart({
  history,
  currentTurn,
}: {
  history: number[];
  currentTurn: number;
}) {
  // Floor once at the series start (not per-point) so labels stay a
  // consecutive, non-duplicated run even early in the game when
  // currentTurn - history.length would otherwise go negative.
  const startTurn = Math.max(1, currentTurn - history.length);
  const chartData = history.map((value, i) => ({
    turn: startTurn + i,
    value,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="turn"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#1e293b" }}
            tickLine={false}
            tickFormatter={(v) => `T${v}`}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid #1e293b",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#f1f5f9" }}
            labelFormatter={(v) => `Turn ${v}`}
            formatter={(value) => [`${value}`, "Sentiment"]}
          />
          <ReferenceLine y={50} stroke="#64748b" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SentimentTrend({
  history,
  currentTurn,
  events,
}: {
  history: number[];
  currentTurn: number;
  events: MediaEvent[];
}) {
  const topEvents = [...events]
    .sort((a, b) => Math.abs(b.sentimentImpact) - Math.abs(a.sentimentImpact))
    .slice(0, 3);

  return (
    <div>
      <SectionHeader title="Sentiment Trend" />
      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <SentimentChart history={history} currentTurn={currentTurn} />

        {topEvents.length > 0 && (
          <div className="mt-4 overflow-x-auto border-t border-border pt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-text-muted">
                  <th className="pb-2 pr-4 font-semibold">Turn</th>
                  <th className="pb-2 pr-4 font-semibold">Event</th>
                  <th className="pb-2 font-semibold">Impact</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.map((event, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="py-2 pr-4 font-mono text-xs text-text-muted">
                      T{event.turn}
                    </td>
                    <td className="py-2 pr-4 text-text-muted">
                      {event.description}
                    </td>
                    <td
                      className={`py-2 font-semibold ${
                        event.sentimentImpact > 0
                          ? "text-positive"
                          : event.sentimentImpact < 0
                            ? "text-danger"
                            : "text-text-muted"
                      }`}
                    >
                      {event.sentimentImpact > 0 ? "+" : ""}
                      {event.sentimentImpact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
