import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  MEDIA_SYSTEM_INSTRUCTION,
  buildMediaPrompt,
  parseMediaResponse,
  type AdvisorContext,
} from "@/lib/aiPrompts";

interface MediaNewsRequestBody {
  orderSummary?: string;
  narrative?: string;
  context?: AdvisorContext;
}

export async function POST(request: NextRequest) {
  let body: MediaNewsRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderSummary = body.orderSummary?.trim();
  const narrative = body.narrative?.trim();
  if (!orderSummary || !narrative || !body.context) {
    return NextResponse.json(
      { error: "Missing turn context for media generation." },
      { status: 400 }
    );
  }

  try {
    const prompt = buildMediaPrompt(body.context, orderSummary, narrative);
    const text = await generateAI({
      system: MEDIA_SYSTEM_INSTRUCTION,
      prompt,
      jsonMode: true,
      requestName: "media-news",
    });
    const mediaResult = parseMediaResponse(text);

    return NextResponse.json(mediaResult);
  } catch (error) {
    console.error("AI media generation failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to generate press coverage." },
      { status }
    );
  }
}
