import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="text-xs font-bold tracking-widest text-text-muted">
          SOVEREIGN
        </span>
        <span className="text-xs text-text-muted">
          A nation simulation. No right answers.
        </span>
        <div className="flex items-center gap-5 text-xs text-text-muted">
          <Link href="/wiki" className="hover:text-text">
            Wiki
          </Link>
          <Link href="/wiki" className="hover:text-text">
            How to Play
          </Link>
          <Link href="/wiki" className="hover:text-text">
            Feedback
          </Link>
        </div>
      </div>
      <p className="mt-6 text-center text-[10px] text-text-muted/60">
        Built with Claude. Powered by curiosity.
      </p>
    </footer>
  );
}
