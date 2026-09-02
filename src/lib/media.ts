import type { NewsArticle, NewsOutlet } from "@/lib/gameState";

export const OUTLET_COLORS: Record<NewsOutlet, string> = {
  "Folha de S.Paulo": "#3b82f6",
  "O Globo": "#f97316",
  "Brasil de Fato": "#ef4444",
  Veja: "#8b5cf6",
  "BBC Brasil": "#991b1b",
  Poder360: "#14b8a6",
  InfoMoney: "#10b981",
};

interface BadgeStyle {
  label: string;
  text: string;
  bg: string;
  border: string;
}

export const SENTIMENT_STYLES: Record<NewsArticle["sentiment"], BadgeStyle> = {
  positive: {
    label: "POSITIVE",
    text: "text-positive",
    bg: "bg-positive/10",
    border: "border-positive/30",
  },
  neutral: {
    label: "NEUTRAL",
    text: "text-text-muted",
    bg: "bg-panel-2",
    border: "border-border",
  },
  negative: {
    label: "NEGATIVE",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
  critical: {
    label: "CRITICAL",
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
};

export const TOPIC_LABELS: Record<NewsArticle["topic"], string> = {
  security: "SECURITY",
  economy: "ECONOMY",
  diplomacy: "DIPLOMACY",
  social: "SOCIAL",
  corruption: "CORRUPTION",
  politics: "POLITICS",
};

export const LEVEL_STYLES: Record<"low" | "medium" | "high", BadgeStyle> = {
  low: {
    label: "LOW",
    text: "text-positive",
    bg: "bg-positive/10",
    border: "border-positive/30",
  },
  medium: {
    label: "MEDIUM",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
  high: {
    label: "HIGH",
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
};

/**
 * Turns this turn's article sentiments into a mediaSentiment delta.
 * Positive/neutral articles push sentiment up, negative/critical pull it down,
 * weighted by how strong each sentiment is.
 */
export function computeSentimentDelta(
  articles: { sentiment: NewsArticle["sentiment"] }[]
): number {
  if (articles.length === 0) return 0;

  const score = articles.reduce((sum, a) => {
    switch (a.sentiment) {
      case "positive":
        return sum + 2;
      case "neutral":
        return sum + 0.5;
      case "negative":
        return sum - 1.5;
      case "critical":
        return sum - 3;
    }
  }, 0);

  const average = score / articles.length;
  return Math.round(Math.max(-15, Math.min(15, average * 6)));
}

/** How much you're being talked about this turn, from article volume and breaking-news weight. */
export function computePressCoverage(
  articleCount: number,
  breakingCount: number
): number {
  return Math.max(0, Math.min(100, articleCount * 12 + breakingCount * 10));
}

export function appendArticles(
  existing: NewsArticle[],
  newOnes: NewsArticle[],
  max = 60
): NewsArticle[] {
  return [...existing, ...newOnes].slice(-max);
}
