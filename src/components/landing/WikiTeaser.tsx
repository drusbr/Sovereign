import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CATEGORIES = [
  "Economics",
  "Government & Politics",
  "Foreign Affairs",
  "Security",
  "Society",
  "How the Simulation Works",
];

export function WikiTeaser() {
  return (
    <section className="landing-fade-in border-t border-border bg-panel/40 px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-semibold text-text sm:text-3xl">
          Understand the world you&apos;re governing
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
          The Sovereign Wiki explains the real economic, political, and
          security systems that underpin the simulation — written without
          ideology, built for curiosity.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href="/wiki"
              className="rounded-full border border-border px-4 py-2 text-xs font-medium text-text-muted transition hover:border-accent/50 hover:text-text"
            >
              {category}
            </Link>
          ))}
        </div>

        <Link
          href="/wiki"
          className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
        >
          Explore the Wiki
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
