import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  MEDIA_SYSTEM_INSTRUCTION,
  buildMediaPrompt,
  parseMediaResponse,
  type AdvisorContext,
} from "@/lib/gemini";

interface MediaNewsRequestBody {
  orderSummary?: string;
  narrative?: string;
  context?: AdvisorContext;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  let body: MediaNewsRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderSummary = body.orderSummary?.trim();
  const narrative = body.narrative?.trim();
  if (!orderSummary || !narrative || !body.context) {
    return NextResponse.json(
      { error: "Missing turn context for media generation." },
      { status: 400 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: MEDIA_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildMediaPrompt(body.context, orderSummary, narrative);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const mediaResult = parseMediaResponse(text);

    return NextResponse.json(mediaResult);
  } catch (error) {
    console.error("Gemini media generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate press coverage." },
      { status: 502 }
    );
  }
}
