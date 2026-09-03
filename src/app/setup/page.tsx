"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, GUEST_FLAG_KEY, GUEST_STATE_KEY } from "@/context/AuthContext";
import { createCampaign, getUserCampaigns } from "@/lib/supabase/campaigns";
import { SetupHeader } from "@/components/setup/SetupHeader";
import { Step1President } from "@/components/setup/Step1President";
import { Step2Alignment } from "@/components/setup/Step2Alignment";
import { Step3Advisors } from "@/components/setup/Step3Advisors";
import { Step4Agenda } from "@/components/setup/Step4Agenda";
import { Step5Confirm } from "@/components/setup/Step5Confirm";
import {
  advisorPoolsFor,
  buildCampaignGameState,
  createEmptySetupState,
  type SetupState,
} from "@/lib/setupWizard";
import { ADVISOR_ROLES } from "@/lib/advisorCandidates";
import type { PriorityId } from "@/lib/setupData";

const MAX_CAMPAIGNS = 3;

export default function SetupPage() {
  const { user, loadingUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [setup, setSetup] = useState<SetupState>(() => createEmptySetupState());
  const [pools] = useState(() => advisorPoolsFor(setup));
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      Promise.resolve().then(() => setCheckingLimit(false));
      return;
    }
    getUserCampaigns(user.id).then(({ campaigns, error }) => {
      if (!error && campaigns.length >= MAX_CAMPAIGNS) {
        router.replace("/campaigns?error=max_campaigns");
        return;
      }
      setCheckingLimit(false);
    });
  }, [loadingUser, user, router]);

  function patch(update: Partial<SetupState>) {
    setSetup((prev) => ({ ...prev, ...update }));
  }

  function toggleAdvisor(role: (typeof ADVISOR_ROLES)[number], candidateId: string) {
    setSetup((prev) => ({
      ...prev,
      selectedAdvisors: { ...prev.selectedAdvisors, [role]: candidateId },
    }));
  }

  function togglePriority(id: PriorityId) {
    setSetup((prev) => {
      const existing = prev.priorities.indexOf(id);
      if (existing !== -1) {
        return { ...prev, priorities: prev.priorities.filter((p) => p !== id) };
      }
      if (prev.priorities.length >= 3) return prev;
      return { ...prev, priorities: [...prev.priorities, id] };
    });
  }

  const step1Valid = setup.name.trim().length > 0 && !!setup.backgroundId && !!setup.portraitSeed;
  const step2Valid = !!setup.alignment;
  const step3Valid = ADVISOR_ROLES.every((r) => setup.selectedAdvisors[r]);
  const step4Valid = setup.priorities.length === 3 && setup.manifesto.trim().length > 0;

  async function handleBegin() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const finalState = buildCampaignGameState(setup);

      if (user) {
        const { campaign, error } = await createCampaign(user.id, finalState);
        if (error || !campaign) {
          setSubmitError(error ?? "Failed to create campaign.");
          setSubmitting(false);
          return;
        }
        router.push(`/dashboard?campaign=${campaign.id}`);
        return;
      }

      // Guest: persist locally and flag as guest so the game layout picks it up.
      if (typeof window !== "undefined") {
        window.localStorage.setItem(GUEST_FLAG_KEY, "true");
        window.localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(finalState));
      }
      router.push("/dashboard");
    } catch {
      setSubmitError("Something went wrong building your presidency. Please try again.");
      setSubmitting(false);
    }
  }

  if (checkingLimit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-text-muted">Preparing your campaign…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SetupHeader step={step} onBack={step > 1 ? () => setStep((s) => s - 1) : undefined} />

      {step === 1 && <Step1President setup={setup} onChange={patch} />}
      {step === 2 && (
        <Step2Alignment
          alignment={setup.alignment}
          onChange={(alignment) => patch({ alignment })}
        />
      )}
      {step === 3 && (
        <Step3Advisors
          pools={pools}
          selected={setup.selectedAdvisors}
          onSelect={toggleAdvisor}
        />
      )}
      {step === 4 && (
        <Step4Agenda
          priorities={setup.priorities}
          manifesto={setup.manifesto}
          onTogglePriority={togglePriority}
          onManifestoChange={(manifesto) => patch({ manifesto })}
        />
      )}
      {step === 5 && <Step5Confirm setup={setup} />}

      <div className="mx-auto max-w-4xl px-6 pb-12">
        {submitError && (
          <p className="mb-3 text-center text-sm text-danger">{submitError}</p>
        )}
        <div className="flex justify-end gap-3">
          {step === 5 ? (
            <>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-text transition hover:border-text-muted"
              >
                Back to Review
              </button>
              <button
                type="button"
                onClick={handleBegin}
                disabled={submitting}
                className="rounded-md bg-accent px-8 py-3 text-base font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Building your presidency…" : "Begin Presidency"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && !step1Valid) ||
                (step === 2 && !step2Valid) ||
                (step === 3 && !step3Valid) ||
                (step === 4 && !step4Valid)
              }
              className="rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-text-muted"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
