import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ADVISOR_JSON_INSTRUCTIONS,
  buildAdvisorPrompt,
  parseAdvisorResponse,
  type AdvisorContext,
} from "@/lib/gemini";
import { getAdvisorById } from "@/lib/advisors";

interface AdvisorRequestBody {
  advisorId?: string;
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

  let body: AdvisorRequestBody;
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
      systemInstruction: `${advisor.personaPrompt}\n\n${ADVISOR_JSON_INSTRUCTIONS}`,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildAdvisorPrompt(body.context);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const advisorResult = parseAdvisorResponse(text);

    return NextResponse.json(advisorResult);
  } catch (error) {
    console.error("Gemini advisor briefing failed:", error);
    return NextResponse.json(
      { error: "Failed to generate the briefing. Please try again." },
      { status: 502 }
    );
  }
}
