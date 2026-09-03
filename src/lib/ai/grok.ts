import {
  AIProviderError,
  type AIGenerateParams,
  type AIGenerateResult,
  type AIProvider,
} from "./provider";

const XAI_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = process.env.XAI_MODEL || "grok-4.3";
const REQUEST_TIMEOUT_MS = 60_000;

interface XaiChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; code?: string };
}

function classifyGrokError(status: number, body: string): AIProviderError["kind"] {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status === 402) return "insufficient_credits";
  if (status >= 500) return "server_error";
  if (body.toLowerCase().includes("timeout")) return "timeout";
  return "unknown";
}

/** xAI's Grok API, called via its OpenAI-compatible chat completions endpoint. */
export class GrokProvider implements AIProvider {
  readonly name = "grok";

  async generateText(params: AIGenerateParams): Promise<AIGenerateResult> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        "XAI_API_KEY is not configured.",
        this.name,
        "missing_api_key"
      );
    }

    const model = DEFAULT_MODEL;
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.prompt },
          ],
          temperature: params.temperature ?? 0.9,
          ...(params.jsonMode
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
        signal: controller.signal,
      });

      const rawBody = await response.text();

      if (!response.ok) {
        throw new AIProviderError(
          `xAI request failed with status ${response.status}: ${rawBody.slice(0, 300)}`,
          this.name,
          classifyGrokError(response.status, rawBody)
        );
      }

      let parsed: XaiChatCompletionResponse;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        throw new AIProviderError(
          "xAI returned a response that wasn't valid JSON.",
          this.name,
          "invalid_response"
        );
      }

      const text = parsed.choices?.[0]?.message?.content;
      if (!text) {
        throw new AIProviderError(
          "xAI response contained no message content.",
          this.name,
          "invalid_response"
        );
      }

      return {
        text,
        provider: this.name,
        model,
        durationMs: Date.now() - started,
        usage: parsed.usage
          ? {
              inputTokens: parsed.usage.prompt_tokens,
              outputTokens: parsed.usage.completion_tokens,
              totalTokens: parsed.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      const isAbort = error instanceof Error && error.name === "AbortError";
      throw new AIProviderError(
        isAbort
          ? "xAI request timed out."
          : error instanceof Error
            ? error.message
            : "xAI request failed.",
        this.name,
        isAbort ? "timeout" : "unknown",
        error
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
