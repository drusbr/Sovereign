import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import { createDraftAction, type ProposedAction } from "@/lib/actions/types";
import {
  ACTION_INTERPRETATION_SYSTEM_INSTRUCTION,
  buildActionInterpretationPrompt,
  parseActionInterpretation,
  inferExplicitLegislativeAction,
  inferExplicitFiscalAction,
} from "@/lib/actions/interpretation";

interface RequestBody {
  id?: string;
  actorId?: string;
  rawOrder?: string;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.id || !body.actorId || !body.rawOrder?.trim()) {
    return NextResponse.json({ error: "Missing proposed action fields." }, { status: 400 });
  }

  const draft: ProposedAction = createDraftAction({
    id: body.id,
    actorId: body.actorId,
    rawOrder: body.rawOrder.trim(),
  });

  try {
    const raw = await generateAI({
      system: ACTION_INTERPRETATION_SYSTEM_INSTRUCTION,
      prompt: buildActionInterpretationPrompt(draft),
      jsonMode: true,
      temperature: 0.2,
      requestName: "action-interpretation",
    });
    return NextResponse.json(parseActionInterpretation(raw, draft));
  } catch (error) {
    console.error("AI action interpretation failed:", error);
    const fallback = inferExplicitFiscalAction(draft) ?? inferExplicitLegislativeAction(draft);
    if (fallback) return NextResponse.json(fallback);
    return NextResponse.json(
      { error: "Failed to interpret proposed action." },
      { status: error instanceof AIProviderError ? 502 : 500 }
    );
  }
}
