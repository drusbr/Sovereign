import { NextRequest, NextResponse } from "next/server";
import { generateAI, AIProviderError } from "@/lib/ai";
import {
  SYSTEM_INSTRUCTION,
  buildTurnPrompt,
  parseTurnResponse,
  type TurnEngineContext,
} from "@/lib/aiPrompts";
import type { ProposedAction } from "@/lib/actions/types";
import { applyActionValidation } from "@/lib/actions/validation";
import { processInstitutionalActions } from "@/lib/turn/institutionalProcessing";
import { assessLegislativeEntry } from "@/lib/congress";

export async function POST(request: NextRequest) {
  let body: { actions?: ProposedAction[]; context?: TurnEngineContext };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const actions = Array.isArray(body.actions) ? body.actions : [];
  if (actions.length === 0 || actions.some((action) => !action.id || !action.rawOrder?.trim())) {
    return NextResponse.json({ error: "At least one valid action is required." }, { status: 400 });
  }
  if (!body.context) {
    return NextResponse.json({ error: "Missing game context." }, { status: 400 });
  }

  const validatedActions = actions.map((action) =>
    applyActionValidation(body.context!, action)
  );
  const processedActions = processInstitutionalActions(body.context, validatedActions);
  const institutionalFacts = processedActions.map(({ action, disposition, reason }) => {
    const legislative = assessLegislativeEntry(action);
    return {
      actionId: action.id,
      disposition,
      reason,
      legislativeProceedingCreated: legislative.entersCongress,
      ...(legislative.proceedingId
        ? { proceedingId: legislative.proceedingId, proceedingStatus: "INTRODUCED" as const }
        : {}),
      ...(legislative.blocker ? { deterministicBlocker: legislative.blocker } : {}),
    };
  });

  try {
    const prompt = buildTurnPrompt(
      processedActions.map(({ action }) => action),
      body.context,
      institutionalFacts
    );
    const text = await generateAI({
      system: SYSTEM_INSTRUCTION,
      prompt,
      jsonMode: true,
      requestName: "turn",
    });
    const turnResult = parseTurnResponse(text);

    return NextResponse.json({
      ...turnResult,
      actions: processedActions.map(({ action }) => action),
      institutionalFacts,
    });
  } catch (error) {
    console.error("AI turn generation failed:", error);
    const status = error instanceof AIProviderError ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to generate the turn's narrative. Please try again." },
      { status }
    );
  }
}
