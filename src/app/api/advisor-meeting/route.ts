import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  MEETING_CONVERSATION_INSTRUCTIONS,
  buildAdvisorMeetingPrompt,
  parseAdvisorMeetingResponse,
  type AdvisorContext,
  type MeetingTurn,
} from "@/lib/gemini";
import { getAdvisorById } from "@/lib/advisors";

interface AdvisorMeetingRequestBody {
  advisorId?: string;
  context?: AdvisorContext;
  history?: MeetingTurn[];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  let body: AdvisorMeetingRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const advisor = body.advisorId ? getAdvisorById(body.advisorId) : undefined;
  if (!advisor || !body.context) {
    return NextResponse.json(
      { error: "Missing or unknown advisor." },
      { status: 400 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: `${advisor.personaPrompt}\n\n${MEETING_CONVERSATION_INSTRUCTIONS}`,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildAdvisorMeetingPrompt(body.context, body.history ?? []);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const meetingResult = parseAdvisorMeetingResponse(text);

    return NextResponse.json(meetingResult);
  } catch (error) {
    console.error("Gemini advisor meeting failed:", error);
    return NextResponse.json(
      { error: "Failed to reach the advisor. Please try again." },
      { status: 502 }
    );
  }
}
