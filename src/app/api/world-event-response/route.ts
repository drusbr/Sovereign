import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  WORLD_EVENT_RESPONSE_SYSTEM_INSTRUCTION,
  buildWorldEventResponsePrompt,
  parseWorldEventResponseNarrative,
  type TurnContext,
} from "@/lib/aiPrompts";

interface WorldEventResponseRequestBody {
  eventTitle?: string;
  eventDescription?: string;
  optionLabel?: string;
  consequenceHint?: string;
  context?: TurnContext;
}

export async function POST(request: NextRequest) {
  let body: WorldEventResponseRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const eventTitle = body.eventTitle?.trim();
  const eventDescription = body.eventDescription?.trim();
  const optionLabel = body.optionLabel?.trim();
  const consequenceHint = body.consequenceHint?.trim() ?? "";

  if (!eventTitle || !eventDescription || !optionLabel || !body.context) {
    return NextResponse.json(
      { error: "Missing event response context." },
      { status: 400 }
    );
  }

  try {
    const prompt = buildWorldEventResponsePrompt({
      eventTitle,
      eventDescription,
      optionLabel,
      consequenceHint,
      context: body.context,
    });
    const text = await generateAI({
      system: WORLD_EVENT_RESPONSE_SYSTEM_INSTRUCTION,
      prompt,
      jsonMode: true,
      requestName: "world-event-response",
    });
    const parsed = parseWorldEventResponseNarrative(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("AI world event response failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to generate the consequence narrative." },
      { status }
    );
  }
}
