import type { ReactNode } from "react";
import type { WikiArticle, WikiCategory } from "@/lib/wiki";
import { getArticleContent } from "@/lib/wiki";

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-l-2 border-accent pl-3 text-sm font-semibold uppercase tracking-widest text-text-muted">
      {children}
    </h2>
  );
}

function TradeOffHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-l-2 border-amber-400 pl-3 text-sm font-semibold uppercase tracking-widest text-text-muted">
      {children}
    </h2>
  );
}

export function ArticleView({
  category,
  article,
}: {
  category: WikiCategory;
  article: WikiArticle;
}) {
  const content = getArticleContent(category, article);

  return (
    <div className="mx-auto max-w-[680px] px-8 py-10">
      <p className="text-xs text-text-muted">
        Wiki <span className="mx-1 text-text-muted/50">›</span> {category.label}{" "}
        <span className="mx-1 text-text-muted/50">›</span> {article.title}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          {article.title}
        </h1>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${category.colorClasses.text} ${category.colorClasses.bg} ${category.colorClasses.border}`}
        >
          {category.label}
        </span>
      </div>
      <p className="mt-2 text-xs italic text-text-muted">
        Content coming soon
      </p>

      <div className="mt-8 space-y-8" style={{ lineHeight: 1.7 }}>
        {content.template === "standard" ? (
          <>
            <section className="space-y-2.5">
              <SectionHeading>What is it?</SectionHeading>
              <p className="text-[15px] text-text">{content.whatIsIt}</p>
            </section>

            <section className="space-y-2.5">
              <SectionHeading>Why does it matter?</SectionHeading>
              <p className="text-[15px] text-text">{content.whyItMatters}</p>
            </section>

            <section className="space-y-2.5">
              <SectionHeading>What affects it?</SectionHeading>
              <ul className="list-inside list-disc space-y-1.5 text-[15px] text-text">
                {content.whatAffectsIt.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2.5">
              <SectionHeading>What does it affect?</SectionHeading>
              <ul className="list-inside list-disc space-y-1.5 text-[15px] text-text">
                {content.whatItAffects.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2.5">
              <SectionHeading>How can a government influence it?</SectionHeading>
              <ul className="list-inside list-disc space-y-1.5 text-[15px] text-text">
                {content.howGovernmentInfluences.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2.5">
              <TradeOffHeading>The trade-offs</TradeOffHeading>
              <p className="text-[15px] text-text">{content.tradeOffs}</p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2.5">
              <SectionHeading>Overview</SectionHeading>
              <p className="text-[15px] text-text">{content.overview}</p>
            </section>

            <section className="space-y-2.5">
              <SectionHeading>The mechanics</SectionHeading>
              <p className="text-[15px] text-text">{content.mechanics}</p>
            </section>

            <section className="space-y-2.5">
              <SectionHeading>What this means for your decisions</SectionHeading>
              <p className="text-[15px] text-text">
                {content.decisionImplications}
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
