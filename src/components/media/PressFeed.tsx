import { Newspaper } from "lucide-react";
import type { NewsArticle } from "@/lib/gameState";

function Byline({ article }: { article: NewsArticle }) { return <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted"><span className="text-brass">{article.outlet}</span> · {article.topic} · Turn {article.turn}</p>; }
function SecondaryStory({ article }: { article: NewsArticle }) { return <article className="border-t border-border py-4"><Byline article={article}/><h3 className="mt-2 font-serif text-xl leading-tight text-text">{article.headline}</h3><p className="mt-2 text-[13px] leading-6 text-text-muted">{article.body}</p></article>; }

export function PressFeed({ articles }: { articles: NewsArticle[] }) {
  const ordered = [...articles].sort((a,b)=>b.turn-a.turn); const lead = ordered[0]; const secondary = ordered.slice(1,5); const latest = ordered.slice(5);
  if (!lead) return <div className="border-y border-border py-16 text-center"><Newspaper size={28} className="mx-auto text-text-muted"/><p className="mt-3 font-serif text-xl text-text">The presses are quiet.</p><p className="mt-1 text-sm text-text-muted">Coverage will appear as government decisions and national developments unfold.</p></div>;
  return <div><div className="mb-3 flex items-center justify-between border-b-2 border-text pb-2"><h2 className="font-serif text-2xl text-text">Front Page</h2><span className="text-[10px] uppercase tracking-wider text-text-muted">{lead.date}</span></div>
    <article className="border-b border-border pb-6"><Byline article={lead}/><h2 className="mt-3 max-w-3xl font-serif text-3xl leading-[1.08] text-text md:text-4xl">{lead.headline}</h2><p className="mt-4 max-w-3xl text-[15px] leading-7 text-text-muted">{lead.body}</p></article>
    {secondary.length > 0 && <div className="grid md:grid-cols-2">{secondary.map((article,index)=><div key={article.id} className={`${index%2===0 ? "md:pr-5" : "md:border-l md:border-border md:pl-5"}`}><SecondaryStory article={article}/></div>)}</div>}
    {latest.length > 0 && <section className="mt-6"><h3 className="border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text">Latest dispatches</h3><div>{latest.map((article)=><article key={article.id} className="grid gap-2 border-b border-border py-3 md:grid-cols-[110px_1fr_auto]"><span className="text-[10px] uppercase tracking-wider text-brass">{article.outlet}</span><div><h4 className="font-serif text-base text-text">{article.headline}</h4><p className="mt-1 line-clamp-2 text-xs leading-5 text-text-muted">{article.body}</p></div><span className="text-[10px] text-text-muted">T{article.turn}</span></article>)}</div></section>}
  </div>;
}
