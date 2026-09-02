import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildWorldEventsPrompt,
  buildWorldEventsSystemInstruction,
  parseWorldEventsResponse,
  type AdvisorContext,
  type WorldEventSeedInput,
} from "@/lib/gemini";

interface WorldEventsRequestBody {
  context?: AdvisorContext;
  seeds?: WorldEventSeedInput[];
  generateNovel?: boolean;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: buildWorldEventsSystemInstruction(),
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildWorldEventsPrompt(body.context, seeds, generateNovel);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const worldEventsResult = parseWorldEventsResponse(text);

    return NextResponse.json(worldEventsResult);
  } catch (error) {
    console.error("Gemini world events generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate world events." },
      { status: 502 }
    );
  }
}
