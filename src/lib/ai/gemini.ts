import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIProviderError,
  type AIGenerateParams,
  type AIGenerateResult,
  type AIProvider,
} from "./provider";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function classifyGeminiError(error: unknown): AIProviderError["kind"] {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("api key") || message.includes("permission")) return "auth";
  if (message.includes("429") || message.includes("quota") || message.includes("rate"))
    return "rate_limit";
  if (message.includes("timeout") || message.includes("deadline")) return "timeout";
  if (message.includes("500") || message.includes("503") || message.includes("internal"))
    return "server_error";
  return "unknown";
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  async generateText(params: AIGenerateParams): Promise<AIGenerateResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError(
        "GEMINI_API_KEY is not configured.",
        this.name,
        "missing_api_key"
      );
    }

    const model = DEFAULT_MODEL;
    const started = Date.now();

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const generativeModel = genAI.getGenerativeModel({
        model,
        systemInstruction: params.system,
        generationConfig: params.jsonMode
          ? { responseMimeType: "application/json" }
          : undefined,
      });

      const result = await generativeModel.generateContent(params.prompt);
      const text = result.response.text();
      const usageMetadata = result.response.usageMetadata;

      return {
        text,
        provider: this.name,
        model,
        durationMs: Date.now() - started,
        usage: usageMetadata
          ? {
              inputTokens: usageMetadata.promptTokenCount,
              outputTokens: usageMetadata.candidatesTokenCount,
              totalTokens: usageMetadata.totalTokenCount,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(
        error instanceof Error ? error.message : "Gemini request failed.",
        this.name,
        classifyGeminiError(error),
        error
      );
    }
  }
}
