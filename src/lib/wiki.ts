import {
  inflationArticle,
  gdpArticle,
  economicGrowthArticle,
  unemploymentArticle,
  interestRatesArticle,
  governmentSpendingArticle,
  taxationArticle,
  nationalDebtArticle,
  debtToGdpArticle,
  tradeBalanceArticle,
  fdiArticle,
  exchangeRatesArticle,
  productivityArticle,
  recessionsArticle,
} from "@/lib/wiki/economics";

import {
  congressArticle,
  approvalRatingsArticle,
  politicalCapitalArticle,
  electionsArticle,
  politicalPartiesArticle,
  coalitionBuildingArticle,
  civilLibertiesArticle,
  publicOpinionArticle,
  politicalCrisesArticle,
} from "@/lib/wiki/government";

export interface WikiArticle {
  slug: string;
  title: string;
}

export type WikiCategorySlug =
  | "economics"
  | "government"
  | "foreign-affairs"
  | "security"
  | "society"
  | "simulation";

export interface WikiCategory {
  slug: WikiCategorySlug;
  label: string;
  description: string;
  colorClasses: {
    text: string;
    bg: string;
    border: string;
  };
  articles: WikiArticle[];
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function articles(titles: string[]): WikiArticle[] {
  return titles.map((title) => ({ slug: slugify(title), title }));
}

export const WIKI_CATEGORIES: WikiCategory[] = [
  {
    slug: "economics",
    label: "Economics",
    description: "The forces that drive growth, prices, and prosperity.",
    colorClasses: {
      text: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/30",
    },
    articles: articles([
      "Inflation",
      "GDP",
      "Economic Growth",
      "Unemployment",
      "Interest Rates",
      "Government Spending",
      "Taxation",
      "National Debt",
      "Debt-to-GDP Ratio",
      "Trade Balance",
      "Foreign Direct Investment",
      "Exchange Rates",
      "Productivity",
      "Recessions",
    ]),
  },
  {
    slug: "government",
    label: "Government & Politics",
    description: "How power is won, shared, and spent.",
    colorClasses: {
      text: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-purple-400/30",
    },
    articles: articles([
      "Congress",
      "Approval Ratings",
      "Political Capital",
      "Elections",
      "Political Parties",
      "Coalition Building",
      "Civil Liberties",
      "Public Opinion",
      "Political Crises",
    ]),
  },
  {
    slug: "foreign-affairs",
    label: "Foreign Affairs",
    description: "Brazil's place among nations.",
    colorClasses: {
      text: "text-teal-400",
      bg: "bg-teal-400/10",
      border: "border-teal-400/30",
    },
    articles: articles([
      "Diplomatic Relations",
      "Alliances",
      "Sanctions",
      "Trade Agreements",
      "Military Alliances",
      "Diplomatic Pressure",
      "International Reputation",
      "Foreign Investment",
    ]),
  },
  {
    slug: "security",
    label: "Security",
    description: "Keeping order at home and strength abroad.",
    colorClasses: {
      text: "text-danger",
      bg: "bg-danger/10",
      border: "border-danger/30",
    },
    articles: articles([
      "Military Morale",
      "Defence Spending",
      "Intelligence",
      "Organised Crime",
      "Counter-Terrorism",
      "Internal Security",
      "Police Capacity",
      "Military Operations",
    ]),
  },
  {
    slug: "society",
    label: "Society",
    description: "The lives of the people you govern.",
    colorClasses: {
      text: "text-positive",
      bg: "bg-positive/10",
      border: "border-positive/30",
    },
    articles: articles([
      "Poverty",
      "Inequality",
      "Healthcare",
      "Education",
      "Crime",
      "Public Services",
      "Demographics",
      "Immigration",
    ]),
  },
  {
    slug: "simulation",
    label: "How the Simulation Works",
    description: "The engine behind every turn.",
    colorClasses: {
      text: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/30",
    },
    articles: articles([
      "How Turns Work",
      "How Decisions Are Evaluated",
      "Why Outcomes Aren't Guaranteed",
      "How Cascading Effects Work",
      "How Uncertainty Works",
      "How Events Are Generated",
      "How AI Interacts With the Simulation",
    ]),
  },
];

export function findCategory(slug: string): WikiCategory | undefined {
  return WIKI_CATEGORIES.find((c) => c.slug === slug);
}

export function findArticle(
  categorySlug: string,
  articleSlug: string
): { category: WikiCategory; article: WikiArticle } | undefined {
  const category = findCategory(categorySlug);
  const article = category?.articles.find((a) => a.slug === articleSlug);
  if (!category || !article) return undefined;
  return { category, article };
}

export interface StandardArticleContent {
  template: "standard";
  whatIsIt: string;
  whyItMatters: string;
  whatAffectsIt: string[];
  whatItAffects: string[];
  howGovernmentInfluences: string[];
  tradeOffs: string;
}

export interface SimulationArticleContent {
  template: "simulation";
  overview: string;
  mechanics: string;
  decisionImplications: string;
}

export type ArticleContent = StandardArticleContent | SimulationArticleContent;

const ARTICLE_CONTENT: Record<string, ArticleContent> = {
  "economics/inflation": {
    template: "standard",
    ...inflationArticle,
  },

  "economics/gdp": {
    template: "standard",
    ...gdpArticle,
  },

  "economics/economic-growth": {
    template: "standard",
    ...economicGrowthArticle,
  },

  "economics/unemployment": {
    template: "standard",
    ...unemploymentArticle,
  },

  "economics/interest-rates": {
    template: "standard",
    ...interestRatesArticle,
  },

  "economics/government-spending": {
    template: "standard",
    ...governmentSpendingArticle,
  },

  "economics/taxation": {
    template: "standard",
    ...taxationArticle,
  },

  "economics/national-debt": {
    template: "standard",
    ...nationalDebtArticle,
  },

  "economics/debt-to-gdp-ratio": {
    template: "standard",
    ...debtToGdpArticle,
  },

  "economics/trade-balance": {
    template: "standard",
    ...tradeBalanceArticle,
  },

  "economics/fdi": {
    template: "standard",
    ...fdiArticle,
  },

  "economics/exchange-rates": {
    template: "standard",
    ...exchangeRatesArticle,
  },

  "economics/productivity": {
    template: "standard",
    ...productivityArticle,
  },

  "economics/recessions": {
    template: "standard",
    ...recessionsArticle,
  },

  "government/congress": {
  template: "standard",
  ...congressArticle,
},

"government/approval-ratings": {
  template: "standard",
  ...approvalRatingsArticle,
},

"government/political-capital": {
  template: "standard",
  ...politicalCapitalArticle,
},

"government/elections": {
  template: "standard",
  ...electionsArticle,
},

"government/political-parties": {
  template: "standard",
  ...politicalPartiesArticle,
},

"government/coalition-building": {
  template: "standard",
  ...coalitionBuildingArticle,
},

"government/civil-liberties": {
  template: "standard",
  ...civilLibertiesArticle,
},

"government/public-opinion": {
  template: "standard",
  ...publicOpinionArticle,
},

"government/political-crises": {
  template: "standard",
  ...politicalCrisesArticle,
},
};

export function getArticleContent(
  category: WikiCategory,
  article: WikiArticle
): ArticleContent {
  const key = `${category.slug}/${article.slug}`;

  const content = ARTICLE_CONTENT[key];

  if (content) {
    return content;
  }

  if (category.slug === "simulation") {
    return {
      template: "simulation",
      overview: `An overview of ${article.title.toLowerCase()} within the Sovereign simulation. Content coming soon.`,
      mechanics: `A breakdown of the underlying mechanics that drive ${article.title.toLowerCase()}. Content coming soon.`,
      decisionImplications: `What ${article.title.toLowerCase()} means for the decisions you make each turn. Content coming soon.`,
    };
  }

  return {
    template: "standard",
    whatIsIt: `A plain-language explanation of ${article.title.toLowerCase()}. Content coming soon.`,
    whyItMatters: `Why ${article.title.toLowerCase()} matters to a country and to the people governing it. Content coming soon.`,
    whatAffectsIt: [
      "Placeholder factor one",
      "Placeholder factor two",
      "Placeholder factor three",
      "Placeholder factor four",
    ],
    whatItAffects: [
      "Placeholder downstream effect one",
      "Placeholder downstream effect two",
      "Placeholder downstream effect three",
      "Placeholder downstream effect four",
    ],
    howGovernmentInfluences: [
      "Placeholder policy lever one",
      "Placeholder policy lever two",
      "Placeholder policy lever three",
    ],
    tradeOffs: `There is no universally correct answer here — the right approach to ${article.title.toLowerCase()} depends entirely on context, timing, and what a government is willing to sacrifice elsewhere. Content coming soon.`,
  };
}