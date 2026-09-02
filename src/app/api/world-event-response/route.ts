import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  WORLD_EVENT_RESPONSE_SYSTEM_INSTRUCTION,
  buildWorldEventResponsePrompt,
  parseWorldEventResponseNarrative,
  type TurnContext,
} from "@/lib/gemini";

interface WorldEventResponseRequestBody {
  eventTitle?: string;
  eventDescription?: string;
  optionLabel?: string;
  consequenceHint?: string;
  context?: TurnContext;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: WORLD_EVENT_RESPONSE_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildWorldEventResponsePrompt({
      eventTitle,
      eventDescription,
      optionLabel,
      consequenceHint,
      context: body.context,
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseWorldEventResponseNarrative(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Gemini world event response failed:", error);
    return NextResponse.json(
      { error: "Failed to generate the consequence narrative." },
      { status: 502 }
    );
  }
}
