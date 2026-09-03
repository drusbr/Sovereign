import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  ADVISOR_JSON_INSTRUCTIONS,
  buildAdvisorPrompt,
  parseAdvisorResponse,
  type AdvisorContext,
} from "@/lib/aiPrompts";
import { getAdvisorById } from "@/lib/advisors";

interface AdvisorRequestBody {
  advisorId?: string;
  /** The resolved persona prompt for this campaign's selected advisor — preferred over the static lookup. */
  personaPrompt?: string;
  context?: AdvisorContext;
}

export async function POST(request: NextRequest) {
  let body: AdvisorRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const personaPrompt =
    body.personaPrompt ?? (body.advisorId ? getAdvisorById(body.advisorId)?.personaPrompt : undefined);
  if (!personaPrompt || !body.context) {
    return NextResponse.json(
      { error: "Missing or unknown advisor." },
      { status: 400 }
    );
  }

  try {
    const prompt = buildAdvisorPrompt(body.context);
    const text = await generateAI({
      system: `${personaPrompt}\n\n${ADVISOR_JSON_INSTRUCTIONS}`,
      prompt,
      jsonMode: true,
      requestName: "advisor-briefing",
    });
    const advisorResult = parseAdvisorResponse(text);

    return NextResponse.json(advisorResult);
  } catch (error) {
    console.error("AI advisor briefing failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to generate the briefing. Please try again." },
      { status }
    );
  }
}
