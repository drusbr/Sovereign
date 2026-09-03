import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/landing/Hero";
import { WhatIsSovereign } from "@/components/landing/WhatIsSovereign";
import { WikiTeaser } from "@/components/landing/WikiTeaser";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/campaigns");
  }

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
