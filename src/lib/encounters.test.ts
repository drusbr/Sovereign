import assert from "node:assert/strict";
import test from "node:test";
import { acceptInterviewRequest, answerEncounter, buildInterviewEncounter, declineInterviewRequest, expireEncounters, startEncounter } from "./encounters";
import { createInitialGameState, hydrateGameState } from "./gameState";

test("interview request becomes a persistent accepted encounter", () => {
  const state = createInitialGameState();
  const next = acceptInterviewRequest(state, "interview_001");
  assert.equal(next.pendingInterviews[0].accepted, true);
  assert.equal(next.encounters.length, 1);
  assert.equal(next.encounters[0].status, "ACCEPTED");
  assert.equal(next.eventHistory.filter((e) => e.type === "INTERVIEW_ACCEPTED").length, 1);
});

test("interview generation uses current state and creates 3 to 5 structured questions", () => {
  const state = createInitialGameState();
  state.inflation = 8.2;
  const encounter = buildInterviewEncounter(state, state.pendingInterviews[1]);
  assert.ok(encounter.decisionNodes.length >= 3 && encounter.decisionNodes.length <= 5);
  assert.match(encounter.decisionNodes.map((q) => q.displayQuestion).join(" "), /8\.2%/);
  assert.ok(encounter.decisionNodes.every((q) => q.responseOptions.length === 4));
  const economic = encounter.decisionNodes.find((q) => q.questionIntent === "FISCAL_CREDIBILITY_CHALLENGE");
  const security = encounter.decisionNodes.find((q) => q.questionIntent === "SECURITY_ACCOUNTABILITY");
  assert.notDeepEqual(economic?.responseOptions.map((o) => o.label), security?.responseOptions.map((o) => o.label));
  assert.match(economic?.responseOptions.map((o) => o.assessment.text).join(" ") ?? "", /8\.2|debt|growth/i);
});

test("response resolution is deterministic, conservative and applies once", () => {
  let a = acceptInterviewRequest(createInitialGameState(), "interview_001");
  a = startEncounter(a, a.encounters[0].id);
  const b = structuredClone(a);
  const responseId = a.encounters[0].decisionNodes[0].responseOptions[0].id;
  const questionId = a.encounters[0].decisionNodes[0].id;
  const resolvedA = answerEncounter(a, a.encounters[0].id, questionId, responseId);
  const resolvedB = answerEncounter(b, b.encounters[0].id, questionId, responseId);
  assert.deepEqual(resolvedA.encounters[0].responses[0], resolvedB.encounters[0].responses[0]);
  assert.ok(Math.abs(resolvedA.approval - a.approval) <= 2);
  assert.ok(Math.abs(resolvedA.mediaSentiment - a.mediaSentiment) <= 3);
  assert.deepEqual(answerEncounter(resolvedA, a.encounters[0].id, questionId, responseId), resolvedA);
});

test("player-facing choices expose assessments but not mechanical effects", () => {
  const state = createInitialGameState();
  const encounter = buildInterviewEncounter(state, state.pendingInterviews[0]);
  for (const option of encounter.decisionNodes[0].responseOptions) {
    assert.equal("effects" in option, false);
    assert.doesNotMatch(option.assessment.text, /[+-]\d|approval \+|sentiment \+/i);
  }
});

test("completion emits one fact and one procedural article", () => {
  let state = acceptInterviewRequest(createInitialGameState(), "interview_001");
  const id = state.encounters[0].id;
  state = startEncounter(state, id);
  for (const question of state.encounters[0].decisionNodes) state = answerEncounter(state, id, question.id, question.responseOptions[0].id);
  assert.equal(state.encounters[0].status, "COMPLETED");
  assert.equal(state.eventHistory.filter((e) => e.type === "MEDIA_INTERVIEW_COMPLETED").length, 1);
  assert.equal(state.newsArticles.filter((a) => a.eventFactId === `fact-interview-${id}`).length, 1);
});

test("decline, expiry and old-save hydration are safe", () => {
  let state = declineInterviewRequest(createInitialGameState(), "interview_001");
  assert.equal(state.pendingInterviews[0].accepted, false);
  state = { ...state, turn: 10 };
  state = expireEncounters(state);
  assert.equal(state.pendingInterviews[1].accepted, false);
  const old = createInitialGameState();
  const legacy = { ...old } as Partial<typeof old>;
  delete legacy.encounters;
  assert.deepEqual(hydrateGameState(legacy).encounters, []);
});

test("mid-interview hydration preserves progress without replaying effects", () => {
  let state = acceptInterviewRequest(createInitialGameState(), "interview_001");
  const id = state.encounters[0].id;
  state = startEncounter(state, id);
  state = answerEncounter(state, id, state.encounters[0].decisionNodes[0].id, state.encounters[0].decisionNodes[0].responseOptions[1].id);
  const loaded = hydrateGameState(JSON.parse(JSON.stringify(state)));
  assert.equal(loaded.encounters[0].currentNode, 1);
  assert.equal(loaded.encounters[0].responses.length, 1);
  assert.equal(loaded.approval, state.approval);
});
