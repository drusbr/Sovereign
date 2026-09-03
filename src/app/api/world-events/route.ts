import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  buildWorldEventsPrompt,
  buildWorldEventsSystemInstruction,
  parseWorldEventsResponse,
  type AdvisorContext,
  type WorldEventSeedInput,
} from "@/lib/aiPrompts";

interface WorldEventsRequestBody {
  context?: AdvisorContext;
  seeds?: WorldEventSeedInput[];
  generateNovel?: boolean;
}

export async function POST(request: NextRequest) {
  let body: WorldEventsRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.context) {
    return NextResponse.json({ error: "Missing game context." }, { status: 400 });
  }

  const seeds = body.seeds ?? [];
  const generateNovel = body.generateNovel === true;

  if (seeds.length === 0 && !generateNovel) {
    return NextResponse.json({ randomEvents: [], novelEvent: null });
  }

  try {
    const prompt = buildWorldEventsPrompt(body.context, seeds, generateNovel);
    const text = await generateAI({
      system: buildWorldEventsSystemInstruction(),
      prompt,
      jsonMode: true,
      requestName: "world-events",
    });
    const worldEventsResult = parseWorldEventsResponse(text);

    return NextResponse.json(worldEventsResult);
  } catch (error) {
    console.error("AI world events generation failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to generate world events." },
      { status }
    );
  }
}
