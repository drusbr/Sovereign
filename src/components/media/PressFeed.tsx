import { Newspaper } from "lucide-react";
import type { NewsArticle } from "@/lib/gameState";
import { OUTLET_COLORS, SENTIMENT_STYLES, TOPIC_LABELS } from "@/lib/media";
import { SectionHeader } from "@/components/SectionHeader";

function ArticleCard({ article }: { article: NewsArticle }) {
  const outletColor = OUTLET_COLORS[article.outlet];
  const sentimentStyle = SENTIMENT_STYLES[article.sentiment];

  return (
    <div className="rounded-lg border border-border bg-panel/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            color: outletColor,
            borderColor: `${outletColor}4d`,
            backgroundColor: `${outletColor}1a`,
          }}
        >
          {article.outlet}
        </span>
        {article.isBreaking && (
          <span className="animate-pulse rounded-full border border-danger/40 bg-danger/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger">
            Breaking
          </span>
        )}
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${sentimentStyle.text} ${sentimentStyle.bg} ${sentimentStyle.border}`}
        >
          {sentimentStyle.label}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          {TOPIC_LABELS[article.topic]}
        </span>
      </div>

      <h3 className="mt-2.5 text-sm font-medium leading-snug text-text">
        {article.headline}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
        {article.body}
      </p>

      <p className="mt-2.5 text-right font-mono text-[10px] text-text-muted/70">
        T{article.turn} · {article.date}
      </p>
    </div>
  );
}

export function PressFeed({ articles }: { articles: NewsArticle[] }) {
  // Most recent turn first; articles within a turn keep their generation order.
  const turns = Array.from(new Set(articles.map((a) => a.turn))).sort(
    (a, b) => b - a
  );

  return (
    <div>
      <SectionHeader title="Press Feed" />

      {articles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-panel/40 p-10 text-center">
          <Newspaper size={28} className="text-text-muted/50" />
          <p className="text-sm text-text-muted">
            No press coverage yet. Issue your first orders to generate media
            attention.
          </p>
        </div>
      ) : (
        <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1">
          {turns.map((turn) => {
            const turnArticles = articles.filter((a) => a.turn === turn);
            return (
              <div key={turn} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                    Turn {turn} — {turnArticles[0]?.date}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {turnArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
