import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  EVENT_SYSTEM_INSTRUCTION,
  buildEventPrompt,
  parseEventResponse,
  type TurnContext,
} from "@/lib/gemini";

interface EventRequestBody {
  event?: { title?: string; description?: string };
  optionLabel?: string;
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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: EVENT_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildEventPrompt({
      eventTitle,
      eventDescription,
      optionLabel,
      context: body.context,
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const eventResult = parseEventResponse(text);

    return NextResponse.json(eventResult);
  } catch (error) {
    console.error("Gemini event generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate the event's consequence. Please try again." },
      { status: 502 }
    );
  }
}
