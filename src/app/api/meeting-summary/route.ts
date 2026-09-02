import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  MEETING_SUMMARY_SYSTEM_INSTRUCTION,
  buildCabinetMeetingSummaryPrompt,
  buildIndividualMeetingSummaryPrompt,
  parseMeetingSummaryResponse,
} from "@/lib/gemini";

interface MeetingSummaryRequestBody {
  kind?: "individual" | "cabinet";
  advisorName?: string;
  transcript?: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: MEETING_SUMMARY_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt =
      body.kind === "individual" && advisorName
        ? buildIndividualMeetingSummaryPrompt(advisorName, transcript)
        : buildCabinetMeetingSummaryPrompt(transcript);

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const summaryResult = parseMeetingSummaryResponse(text);

    return NextResponse.json(summaryResult);
  } catch (error) {
    console.error("Gemini meeting summary failed:", error);
    return NextResponse.json(
      { error: "Failed to summarize the meeting." },
      { status: 502 }
    );
  }
}
