import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  MEETING_SUMMARY_SYSTEM_INSTRUCTION,
  buildCabinetMeetingSummaryPrompt,
  buildIndividualMeetingSummaryPrompt,
  parseMeetingSummaryResponse,
} from "@/lib/aiPrompts";

interface MeetingSummaryRequestBody {
  kind?: "individual" | "cabinet";
  advisorName?: string;
  transcript?: string;
}

export async function POST(request: NextRequest) {
  let body: MeetingSummaryRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const transcript = body.transcript?.trim();
  if (!transcript || (body.kind !== "individual" && body.kind !== "cabinet")) {
    return NextResponse.json(
      { error: "Missing meeting transcript." },
      { status: 400 }
    );
  }

  const advisorName = body.advisorName?.trim();
  if (body.kind === "individual" && !advisorName) {
    return NextResponse.json(
      { error: "Missing advisor name." },
      { status: 400 }
    );
  }

  try {
    const prompt =
      body.kind === "individual" && advisorName
        ? buildIndividualMeetingSummaryPrompt(advisorName, transcript)
        : buildCabinetMeetingSummaryPrompt(transcript);

    const text = await generateAI({
      system: MEETING_SUMMARY_SYSTEM_INSTRUCTION,
      prompt,
      jsonMode: true,
      requestName: "meeting-summary",
    });
    const summaryResult = parseMeetingSummaryResponse(text);

    return NextResponse.json(summaryResult);
  } catch (error) {
    console.error("AI meeting summary failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to summarize the meeting." },
      { status }
    );
  }
}
