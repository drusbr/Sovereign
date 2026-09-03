import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  buildCabinetPrompt,
  buildCabinetSystemInstruction,
  parseCabinetResponse,
  type AdvisorContext,
  type CabinetTurn,
} from "@/lib/aiPrompts";
import type { AdvisorDefinition } from "@/lib/advisors";

interface CabinetMeetingRequestBody {
  context?: AdvisorContext;
  history?: CabinetTurn[];
  advisors?: AdvisorDefinition[];
}

export async function POST(request: NextRequest) {
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
    const prompt = buildCabinetPrompt(body.context, body.history, body.advisors);
    const text = await generateAI({
      system: buildCabinetSystemInstruction(body.advisors),
      prompt,
      jsonMode: true,
      requestName: "cabinet-meeting",
    });
    const cabinetResult = parseCabinetResponse(text);

    return NextResponse.json(cabinetResult);
  } catch (error) {
    console.error("AI cabinet meeting failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "The cabinet failed to respond. Please try again." },
      { status }
    );
  }
}
