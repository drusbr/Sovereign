import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildCabinetPrompt,
  buildCabinetSystemInstruction,
  parseCabinetResponse,
  type AdvisorContext,
  type CabinetTurn,
} from "@/lib/gemini";

interface CabinetMeetingRequestBody {
  context?: AdvisorContext;
  history?: CabinetTurn[];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  let body: CabinetMeetingRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.context || !body.history || body.history.length === 0) {
    return NextResponse.json(
      { error: "Missing cabinet meeting context." },
      { status: 400 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: buildCabinetSystemInstruction(),
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildCabinetPrompt(body.context, body.history);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cabinetResult = parseCabinetResponse(text);

    return NextResponse.json(cabinetResult);
  } catch (error) {
    console.error("Gemini cabinet meeting failed:", error);
    return NextResponse.json(
      { error: "The cabinet failed to respond. Please try again." },
      { status: 502 }
    );
  }
}
