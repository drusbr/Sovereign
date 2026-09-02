import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  SYSTEM_INSTRUCTION,
  buildTurnPrompt,
  parseTurnResponse,
  type TurnEngineContext,
} from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  let body: { orders?: string; context?: TurnEngineContext };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orders = body.orders?.trim();
  if (!orders) {
    return NextResponse.json({ error: "Orders cannot be empty." }, { status: 400 });
  }
  if (!body.context) {
    return NextResponse.json({ error: "Missing game context." }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildTurnPrompt(orders, body.context);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const turnResult = parseTurnResponse(text);

    return NextResponse.json(turnResult);
  } catch (error) {
    console.error("Gemini turn generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate the turn's narrative. Please try again." },
      { status: 502 }
    );
  }
}
