import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";

const SYSTEM_INSTRUCTION =
  "You are a precise constitutional classification assistant for a Brazilian presidential nation-simulation game. You classify a single order by which institution actually has authority over it. Respond with strict JSON only.";

type AuthorityCategory = "EXECUTIVE" | "LEGISLATIVE" | "INDEPENDENT";

interface OrderAuthorityRequestBody {
  orderText?: string;
}

function buildPrompt(orderText: string): string {
  return `Classify this presidential order into one of three categories:
- EXECUTIVE: The President can do this directly without congressional approval
- LEGISLATIVE: This requires congressional approval or a new law
- INDEPENDENT: This involves institutions outside presidential control (central bank, courts, foreign governments, private sector)

Order: "${orderText}"

Respond with JSON only: {"category": "EXECUTIVE"|"LEGISLATIVE"|"INDEPENDENT", "reason": "one sentence explanation"}`;
}

function isAuthorityCategory(value: unknown): value is AuthorityCategory {
  return value === "EXECUTIVE" || value === "LEGISLATIVE" || value === "INDEPENDENT";
}

export async function POST(request: NextRequest) {
  let body: OrderAuthorityRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderText = body.orderText?.trim();
  if (!orderText) {
    return NextResponse.json({ error: "Missing order text." }, { status: 400 });
  }

  try {
    const text = await generateAI({
      system: SYSTEM_INSTRUCTION,
      prompt: buildPrompt(orderText),
      jsonMode: true,
      requestName: "order-authority",
    });

    const parsed = JSON.parse(text) as {
      category?: unknown;
      reason?: unknown;
    };

    if (!isAuthorityCategory(parsed.category)) {
      throw new Error("Model returned an unrecognised category.");
    }

    return NextResponse.json({
      category: parsed.category,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    });
  } catch (error) {
    console.error("AI order-authority classification failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to classify order authority." },
      { status }
    );
  }
}
