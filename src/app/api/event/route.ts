import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  EVENT_SYSTEM_INSTRUCTION,
  buildEventPrompt,
  parseEventResponse,
  type TurnContext,
} from "@/lib/aiPrompts";

interface EventRequestBody {
  event?: { title?: string; description?: string };
  optionLabel?: string;
  context?: TurnContext;
}

export async function POST(request: NextRequest) {
  let body: EventRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const eventTitle = body.event?.title?.trim();
  const eventDescription = body.event?.description?.trim();
  const optionLabel = body.optionLabel?.trim();

  if (!eventTitle || !eventDescription || !optionLabel || !body.context) {
    return NextResponse.json({ error: "Missing event context." }, { status: 400 });
  }

  try {
    const prompt = buildEventPrompt({
      eventTitle,
      eventDescription,
      optionLabel,
      context: body.context,
    });
    const text = await generateAI({
      system: EVENT_SYSTEM_INSTRUCTION,
      prompt,
      jsonMode: true,
      requestName: "event-response",
    });
    const eventResult = parseEventResponse(text);

    return NextResponse.json(eventResult);
  } catch (error) {
    console.error("AI event generation failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to generate the event's consequence. Please try again." },
      { status }
    );
  }
}
