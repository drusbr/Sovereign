import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildSpinRoomPrompt,
  buildSpinRoomSystemInstruction,
  parseSpinRoomResponse,
  type SpinRoomContext,
} from "@/lib/gemini";

interface SpinRoomRequestBody {
  context?: SpinRoomContext;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  let body: SpinRoomRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.context) {
    return NextResponse.json(
      { error: "Missing media context." },
      { status: 400 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: buildSpinRoomSystemInstruction(),
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildSpinRoomPrompt(body.context);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const spinRoomResult = parseSpinRoomResponse(text);

    return NextResponse.json(spinRoomResult);
  } catch (error) {
    console.error("Gemini spin room assessment failed:", error);
    return NextResponse.json(
      { error: "Failed to generate the Chief of Staff's assessment." },
      { status: 502 }
    );
  }
}
