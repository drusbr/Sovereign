import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  MEETING_CONVERSATION_INSTRUCTIONS,
  buildAdvisorMeetingPrompt,
  parseAdvisorMeetingResponse,
  type AdvisorContext,
  type MeetingTurn,
} from "@/lib/aiPrompts";
import { getAdvisorById } from "@/lib/advisors";

interface AdvisorMeetingRequestBody {
  advisorId?: string;
  personaPrompt?: string;
  context?: AdvisorContext;
  history?: MeetingTurn[];
}

export async function POST(request: NextRequest) {
  let body: AdvisorMeetingRequestBody;
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
    const prompt = buildAdvisorMeetingPrompt(body.context, body.history ?? []);
    const text = await generateAI({
      system: `${personaPrompt}\n\n${MEETING_CONVERSATION_INSTRUCTIONS}`,
      prompt,
      jsonMode: true,
      requestName: "advisor-meeting",
    });
    const meetingResult = parseAdvisorMeetingResponse(text);

    return NextResponse.json(meetingResult);
  } catch (error) {
    console.error("AI advisor meeting failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to reach the advisor. Please try again." },
      { status }
    );
  }
}
