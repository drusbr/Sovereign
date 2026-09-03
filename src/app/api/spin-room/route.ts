import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  buildSpinRoomPrompt,
  buildSpinRoomSystemInstruction,
  parseSpinRoomResponse,
  type SpinRoomContext,
} from "@/lib/aiPrompts";

interface SpinRoomRequestBody {
  context?: SpinRoomContext;
  chiefOfStaffPersona?: string;
}

export async function POST(request: NextRequest) {
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
    const prompt = buildSpinRoomPrompt(body.context);
    const text = await generateAI({
      system: buildSpinRoomSystemInstruction(body.chiefOfStaffPersona),
      prompt,
      jsonMode: true,
      requestName: "spin-room",
    });
    const spinRoomResult = parseSpinRoomResponse(text);

    return NextResponse.json(spinRoomResult);
  } catch (error) {
    console.error("AI spin room assessment failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to generate the Chief of Staff's assessment." },
      { status }
    );
  }
}
