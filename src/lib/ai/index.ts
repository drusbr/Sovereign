import { GrokProvider } from "./grok";
import { GeminiProvider } from "./gemini";
import { logAIUsage } from "./usageLog";
import {
  AIProviderError,
  type AIGenerateParams,
  type AIGenerateResult,
  type AIProvider,
} from "./provider";

export { AIProviderError };
export type { AIGenerateParams, AIGenerateResult, AIProvider };

const PROVIDERS: Record<string, () => AIProvider> = {
  grok: () => new GrokProvider(),
  gemini: () => new GeminiProvider(),
};

function resolveProviderName(): string {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();
  return configured && configured in PROVIDERS ? configured : "grok";
}

function fallbackProviderName(primary: string): string | null {
  // The only fallback pair we know about for now: Grok's sibling is Gemini,
  // and vice versa. If neither key is configured, there's nothing to fall
  // back to and the original error should surface.
  const candidate = primary === "grok" ? "gemini" : "grok";
  return candidate in PROVIDERS ? candidate : null;
}

/**
 * The single entry point every API route should use to talk to an AI model.
 * Selects the active provider via `AI_PROVIDER` (defaulting to Grok), and
 * falls back to the other configured provider if the primary one fails —
 * so a Grok outage doesn't take the whole game down.
 */
export async function generateAI(params: AIGenerateParams): Promise<string> {
  const primaryName = resolveProviderName();
  const requestName = params.requestName ?? "unnamed";

  try {
    const result = await PROVIDERS[primaryName]().generateText(params);
    logAIUsage({
      requestName,
      provider: result.provider,
      model: result.model,
      success: true,
      durationMs: result.durationMs,
      usage: result.usage,
    });
    return result.text;
  } catch (primaryError) {
    const kind =
      primaryError instanceof AIProviderError ? primaryError.kind : "unknown";
    logAIUsage({
      requestName,
      provider: primaryName,
      model: "unknown",
      success: false,
      durationMs: 0,
      errorKind: kind,
    });

    const fallbackName = fallbackProviderName(primaryName);
    if (!fallbackName) throw primaryError;

    console.warn(
      `[ai] Primary provider "${primaryName}" failed (${kind}); falling back to "${fallbackName}".`
    );

    try {
      const result = await PROVIDERS[fallbackName]().generateText(params);
      logAIUsage({
        requestName,
        provider: result.provider,
        model: result.model,
        success: true,
        durationMs: result.durationMs,
        usage: result.usage,
      });
      return result.text;
    } catch (fallbackError) {
      const fallbackKind =
        fallbackError instanceof AIProviderError
          ? fallbackError.kind
          : "unknown";
      logAIUsage({
        requestName,
        provider: fallbackName,
        model: "unknown",
        success: false,
        durationMs: 0,
        errorKind: fallbackKind,
      });
      // Surface the original (primary) failure — it's usually the more
      // actionable one — but keep the fallback's error attached as context.
      throw primaryError;
    }
  }
}
