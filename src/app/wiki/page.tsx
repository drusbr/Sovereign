"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { WikiNav } from "@/components/wiki/WikiNav";
import { WikiWelcome } from "@/components/wiki/WikiWelcome";
import { ArticleView } from "@/components/wiki/ArticleView";
import { findCategory, type WikiCategorySlug } from "@/lib/wiki";

interface Selection {
  category: WikiCategorySlug;
  article: string;
}

export default function WikiPage() {
  const [expandedCategories, setExpandedCategories] = useState<
    Set<WikiCategorySlug>
  >(new Set(["economics"]));
  const [selected, setSelected] = useState<Selection | null>(null);

  function toggleCategory(slug: WikiCategorySlug) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function selectArticle(category: WikiCategorySlug, article: string) {
    setSelected({ category, article });
  }

  function selectCategory(slug: WikiCategorySlug) {
    setExpandedCategories((prev) => new Set(prev).add(slug));
    const category = findCategory(slug);
    const first = category?.articles[0];
    if (first) setSelected({ category: slug, article: first.slug });
  }

  const selectedCategory = selected ? findCategory(selected.category) : null;
  const selectedArticle = selectedCategory?.articles.find(
    (a) => a.slug === selected?.article
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-5">
        <span className="text-sm font-bold tracking-widest text-text">
          SOVEREIGN WIKI
        </span>

        <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-md border border-border bg-panel px-3 py-1.5">
          <Search size={14} className="text-text-muted" />
          <input
            type="text"
            placeholder="Search the wiki…"
            disabled
            className="w-full bg-transparent text-sm text-text-muted placeholder:text-text-muted focus:outline-none"
          />
        </div>

        <Link
          href="/dashboard"
          className="shrink-0 text-xs font-semibold text-accent hover:underline"
        >
          Back to Game
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-[260px] shrink-0 border-r border-border">
          <WikiNav
            expandedCategories={expandedCategories}
            onToggleCategory={toggleCategory}
            selected={selected}
            onSelectArticle={selectArticle}
          />
        </aside>

        <main className="flex-1 overflow-y-auto">
          {selectedCategory && selectedArticle ? (
            <ArticleView category={selectedCategory} article={selectedArticle} />
          ) : (
            <WikiWelcome onSelectCategory={selectCategory} />
          )}
        </main>
      </div>
    </div>
  );
}
