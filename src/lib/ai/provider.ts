/**
 * Provider-agnostic AI abstraction.
 *
 * Game logic never talks to Gemini or Grok directly — it builds a system
 * prompt + user prompt (see `@/lib/aiPrompts`), hands them to `generateAI`
 * (see `./index`), and parses the returned text. This file only defines the
 * shape every provider must implement; it knows nothing about GDP, Congress,
 * advisors, or any other game concept.
 */

export interface AIGenerateParams {
  /** The system instruction / persona for this request. */
  system: string;
  /** The user-turn prompt built by a game-specific prompt builder. */
  prompt: string;
  /** Ask the provider to constrain output to a single JSON object, if it supports that. */
  jsonMode?: boolean;
  /** Optional sampling temperature; providers fall back to a sensible default. */
  temperature?: number;
  /** A short, stable label for what kind of request this is (e.g. "turn", "advisor-briefing") — used only for logging. */
  requestName?: string;
}

export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AIGenerateResult {
  text: string;
  provider: string;
  model: string;
  usage?: AIUsage;
  durationMs: number;
}

export interface AIProvider {
  readonly name: string;
  generateText(params: AIGenerateParams): Promise<AIGenerateResult>;
}

export type AIProviderErrorKind =
  | "missing_api_key"
  | "auth"
  | "rate_limit"
  | "insufficient_credits"
  | "timeout"
  | "server_error"
  | "invalid_response"
  | "unknown";

/** A normalised error shape so API routes don't need to know provider-specific error formats. */
export class AIProviderError extends Error {
  readonly provider: string;
  readonly kind: AIProviderErrorKind;
  readonly cause?: unknown;

  constructor(
    message: string,
    provider: string,
    kind: AIProviderErrorKind,
    cause?: unknown
  ) {
    super(message);
    this.name = "AIProviderError";
    this.provider = provider;
    this.kind = kind;
    this.cause = cause;
  }
}
