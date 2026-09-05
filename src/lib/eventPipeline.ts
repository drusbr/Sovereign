import type { GameState, NewsArticle } from "@/lib/gameState";
import { detectStateChanges } from "@/lib/eventDetector";
import { renderStory, type NarrativeStyle } from "@/lib/proceduralWriter";
import type { EventFact } from "@/lib/eventFacts";
import { buildStoryCandidates } from "@/lib/storyAggregator";

function topic(event: EventFact): NewsArticle["topic"] { return event.category === "security" ? "security" : event.category === "economy" ? "economy" : event.category === "international" ? "diplomacy" : event.category === "social" ? "social" : "politics"; }
function outlet(event: EventFact): NewsArticle["outlet"] { return event.source === "FISCAL" || event.source === "MONETARY" || event.source === "ECONOMY" ? "InfoMoney" : event.source === "CONGRESS" ? "Poder360" : event.source === "OPERATION" || event.source === "SECURITY" ? "O Globo" : "Folha de S.Paulo"; }
function sentiment(event: EventFact): NewsArticle["sentiment"] { if (/FAILED|CASUALTIES|STALLED/.test(event.type)) return event.importance === "CRITICAL" ? "critical" : "negative"; if (/PASSED|COMPLETED|BREAKTHROUGH|RESUMED/.test(event.type)) return "positive"; return "neutral"; }
function style(event: EventFact): NarrativeStyle { return event.category === "security" ? "SECURITY_INTELLIGENCE" : event.category === "economy" ? "ECONOMIC_NEWS" : "GENERAL_NEWS"; }

export function applyEventPipeline(previousState: GameState, currentState: GameState): { state: GameState; events: EventFact[] } {
  const events = detectStateChanges({ previousState, currentState });
  if (!events.length) return { state: currentState, events: [] };
  const recent = [...(currentState.proceduralTemplateHistory ?? [])];
  const articles: NewsArticle[] = [];
  for (const story of buildStoryCandidates(events)) {
    const event = story.primaryFact;
    const rendered = renderStory(story, style(event), { recentTemplateIds: recent });
    recent.push(rendered.templateId);
    for (const fact of story.facts) fact.debug = { ...fact.debug!, templateIds: [rendered.templateId], llmEnriched: false };
    articles.push({ id: `procedural-${story.id}`, turn: currentState.turn, date: currentState.date, outlet: outlet(event), headline: rendered.headline, body: rendered.body, sentiment: sentiment(event), topic: topic(event), isBreaking: event.importance === "CRITICAL", eventFactId: event.id, eventFactIds: story.facts.map((fact) => fact.id), isProcedural: true });
  }
  return {
    state: {
      ...currentState,
      eventHistory: [...(currentState.eventHistory ?? []), ...events].slice(-500),
      proceduralTemplateHistory: recent.slice(-40),
      newsArticles: [...currentState.newsArticles, ...articles].slice(-100),
    },
    events,
  };
}
