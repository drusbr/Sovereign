import type { AIUsage } from "./provider";

/**
 * Rough, approximate per-million-token prices in USD, used only to estimate
 * spend for internal cost tracking. Not billed anywhere in the app — update
 * these if a provider changes pricing.
 */
const PRICE_PER_MILLION_TOKENS_USD: Record<
  string,
  { input: number; output: number }
> = {
  "grok-4.3": { input: 3, output: 15 },
  "gemini-3.6-flash": { input: 0.15, output: 0.6 },
};

function estimateCostUsd(model: string, usage: AIUsage | undefined): number | undefined {
  if (!usage) return undefined;
  const price = PRICE_PER_MILLION_TOKENS_USD[model];
  if (!price) return undefined;

  const inputCost = ((usage.inputTokens ?? 0) / 1_000_000) * price.input;
  const outputCost = ((usage.outputTokens ?? 0) / 1_000_000) * price.output;
  return Math.round((inputCost + outputCost) * 100000) / 100000;
}

export interface AIUsageLogEntry {
  requestName: string;
  provider: string;
  model: string;
  success: boolean;
  durationMs: number;
  usage?: AIUsage;
  errorKind?: string;
}

/**
 * Server-side-only usage/cost logging. Intentionally simple (console output)
 * for now — enough to eyeball per-turn and per-campaign AI spend. Never
 * surfaced to the player.
 */
export function logAIUsage(entry: AIUsageLogEntry): void {
  const estimatedCostUsd = estimateCostUsd(entry.model, entry.usage);

  const line = {
    at: new Date().toISOString(),
    ...entry,
    estimatedCostUsd,
  };

  if (entry.success) {
    console.log("[ai-usage]", JSON.stringify(line));
  } else {
    console.warn("[ai-usage]", JSON.stringify(line));
  }
}
