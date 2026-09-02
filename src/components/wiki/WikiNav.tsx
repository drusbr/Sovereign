"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { WIKI_CATEGORIES, type WikiCategorySlug } from "@/lib/wiki";

export function WikiNav({
  expandedCategories,
  onToggleCategory,
  selected,
  onSelectArticle,
}: {
  expandedCategories: Set<WikiCategorySlug>;
  onToggleCategory: (slug: WikiCategorySlug) => void;
  selected: { category: WikiCategorySlug; article: string } | null;
  onSelectArticle: (category: WikiCategorySlug, article: string) => void;
}) {
  return (
    <nav className="h-full overflow-y-auto px-3 py-5">
      {WIKI_CATEGORIES.map((category) => {
        const expanded = expandedCategories.has(category.slug);
        return (
          <div key={category.slug} className="mb-1">
            <button
              type="button"
              onClick={() => onToggleCategory(category.slug)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted transition hover:text-text"
            >
              {expanded ? (
                <ChevronDown size={13} className="shrink-0" />
              ) : (
                <ChevronRight size={13} className="shrink-0" />
              )}
              <span className={expanded ? category.colorClasses.text : ""}>
                {category.label}
              </span>
            </button>
            {expanded && (
              <ul className="ml-3 space-y-0.5 border-l border-border pl-3">
                {category.articles.map((article) => {
                  const isActive =
                    selected?.category === category.slug &&
                    selected?.article === article.slug;
                  return (
                    <li key={article.slug}>
                      <button
                        type="button"
                        onClick={() => onSelectArticle(category.slug, article.slug)}
                        className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                          isActive
                            ? "bg-panel-2 font-medium text-text"
                            : "text-text-muted hover:bg-panel-2/60 hover:text-text"
                        }`}
                      >
                        {article.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
