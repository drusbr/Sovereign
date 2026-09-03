import assert from "node:assert/strict";
import test from "node:test";
import type { EventFact } from "./eventFacts.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { renderEvent } from "./proceduralWriter.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "./gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { applyEventPipeline } from "./eventPipeline.ts";

const operationFact: EventFact = {
  id: "fact-op", turn: 2, occurredTurn: 2, date: "January 15, 2026", type: "OPERATION_BREAKTHROUGH", category: "security", source: "OPERATION", importance: "HIGH",
  subjects: [{ id: "iron-net", type: "OPERATION", name: "Operation Iron Net" }], metrics: { arrests: 37, highValueArrests: 3, assetsSeized: 0.42, facilitiesDisrupted: 2, criminalCapacityReduction: 12, civilianCasualties: 0 },
  relatedOperationIds: ["iron-net"], dedupeKey: "operation:iron-net:development:2", surfacedToPresident: true,
};

test("procedural output is deterministic and preserves exact metrics", () => {
  const a = renderEvent(operationFact, "GENERAL_NEWS");
  const b = renderEvent(operationFact, "GENERAL_NEWS");
  assert.deepEqual(a, b);
  assert.match(a.body, /37 arrests/);
  assert.match(a.body, /3 high-value arrests/);
  assert.match(a.body, /R\$0\.42bn/);
  assert.match(a.body, /12 points/);
  assert.match(a.body, /Civilian casualties: 0/);
});

test("template history rotates variants reproducibly", () => {
  const first = renderEvent(operationFact, "GENERAL_NEWS");
  const second = renderEvent(operationFact, "GENERAL_NEWS", { recentTemplateIds: [first.templateId] });
  assert.notEqual(first.templateId, second.templateId);
  assert.deepEqual(second, renderEvent(operationFact, "GENERAL_NEWS", { recentTemplateIds: [first.templateId] }));
});

test("different style profiles present the same truth differently", () => {
  const briefing = renderEvent(operationFact, "PRESIDENTIAL_BRIEFING");
  const news = renderEvent(operationFact, "GENERAL_NEWS");
  const intelligence = renderEvent(operationFact, "SECURITY_INTELLIGENCE");
  assert.notEqual(briefing.headline, news.headline);
  assert.notEqual(news.headline, intelligence.headline);
  for (const rendered of [briefing, news, intelligence]) assert.match(rendered.body, /37 arrests/);
});

test("project failure writing preserves failed status and budget facts", () => {
  const event: EventFact = { ...operationFact, id: "project-fail", type: "PROJECT_FAILED", category: "government", source: "PROJECT", subjects: [{ id: "hospital", type: "PROJECT", name: "National Hospital Expansion" }], metrics: { budget: 12, spent: 4.8, progress: 31 }, dedupeKey: "project:hospital:FAILED" };
  const rendered = renderEvent(event, "PRESIDENTIAL_BRIEFING");
  assert.match(rendered.body, /has failed/);
  assert.match(rendered.body, /R\$12bn/);
  assert.match(rendered.body, /R\$4\.8bn/);
  assert.match(rendered.body, /31%/);
  assert.doesNotMatch(rendered.body, /completed successfully/i);
});

test("pipeline creates readable persisted news without an LLM", () => {
  const before = createInitialGameState(); before.approval = 41;
  const after = structuredClone(before); after.approval = 34;
  const result = applyEventPipeline(before, after);
  assert.ok(result.events.length > 0);
  assert.ok(result.state.eventHistory.length > 0);
  assert.ok(result.state.newsArticles.some((article) => article.isProcedural && article.eventFactId));
  assert.ok(result.state.newsArticles.at(-1)?.headline);
  assert.ok(result.state.newsArticles.at(-1)?.body);
});
