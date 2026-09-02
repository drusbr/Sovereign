import { Hero } from "@/components/landing/Hero";
import { WhatIsSovereign } from "@/components/landing/WhatIsSovereign";
import { WikiTeaser } from "@/components/landing/WikiTeaser";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="bg-background">
      <Hero />

      <div className="border-t border-border px-6 py-6 text-center">
        <p className="text-xs text-text-muted/70">
          Brazil Campaign available now. More nations coming.
        </p>
      </div>

      <WhatIsSovereign />
      <WikiTeaser />
      <LandingFooter />
    </div>
  );
}
