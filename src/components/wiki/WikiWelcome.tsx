import { WIKI_CATEGORIES, type WikiCategorySlug } from "@/lib/wiki";

export function WikiWelcome({
  onSelectCategory,
}: {
  onSelectCategory: (slug: WikiCategorySlug) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-text">
        Welcome to the Sovereign Wiki
      </h1>
      <p className="mt-2 text-base text-text-muted">
        The systems behind the simulation, explained without ideology.
      </p>
      <p className="mt-5 max-w-[640px] text-[15px] leading-relaxed text-text">
        Every number on your dashboard represents a real concept with real
        causes and real consequences. This wiki explains what each one means,
        what drives it, and why there&apos;s rarely a simple answer.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {WIKI_CATEGORIES.map((category) => (
          <button
            key={category.slug}
            type="button"
            onClick={() => onSelectCategory(category.slug)}
            className={`rounded-lg border bg-panel/60 p-5 text-left transition hover:bg-panel-2 ${category.colorClasses.border}`}
          >
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${category.colorClasses.text} ${category.colorClasses.bg} ${category.colorClasses.border}`}
            >
              {category.label}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              {category.description}
            </p>
            <p className="mt-3 text-xs font-medium text-text-muted">
              {category.articles.length} articles
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
