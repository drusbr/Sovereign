"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  abandonCampaign,
  getUserCampaigns,
  loadGameState,
  type CampaignRecord,
} from "@/lib/supabase/campaigns";

const MAX_CAMPAIGNS = 3;

async function fetchCampaignsWithApprovals(userId: string) {
  const { campaigns: rows, error } = await getUserCampaigns(userId);
  if (error) return { rows: null, approvals: {}, error };

  const entries = await Promise.all(
    rows.map(async (row) => {
      const { state } = await loadGameState(row.id);
      return [row.id, state?.approval ?? 0] as const;
    })
  );
  return { rows, approvals: Object.fromEntries(entries), error: null };
}

function approvalColor(approval: number) {
  if (approval >= 50) return "text-positive";
  if (approval >= 30) return "text-amber-400";
  return "text-danger";
}

function formatLastPlayed(updatedAt: string) {
  const date = new Date(updatedAt);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CampaignsPage() {
  const { user, loadingUser } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<CampaignRecord[] | null>(null);
  const [approvals, setApprovals] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bannerError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("error") === "max_campaigns"
      ? "You have reached the maximum of 3 active campaigns. Abandon one to start a new campaign."
      : null;
  });
  const [confirmingAbandonId, setConfirmingAbandonId] = useState<string | null>(
    null
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    const { rows, approvals: nextApprovals, error } =
      await fetchCampaignsWithApprovals(user.id);
    if (error || !rows) {
      setLoadError(error ?? "Failed to load campaigns.");
      return;
    }
    setCampaigns(rows);
    setApprovals(nextApprovals);
  }, [user]);

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      router.replace("/");
      return;
    }
    fetchCampaignsWithApprovals(user.id).then(
      ({ rows, approvals: nextApprovals, error }) => {
        if (error || !rows) {
          setLoadError(error ?? "Failed to load campaigns.");
          return;
        }
        setCampaigns(rows);
        setApprovals(nextApprovals);
      }
    );
  }, [loadingUser, user, router]);

  function handleNewCampaign() {
    if (campaigns && campaigns.length >= MAX_CAMPAIGNS) return;
    router.push("/setup");
  }

  async function handleAbandon(campaignId: string) {
    await abandonCampaign(campaignId);
    setConfirmingAbandonId(null);
    refresh();
  }

  const atLimit = (campaigns?.length ?? 0) >= MAX_CAMPAIGNS;

  return (
    <div className="min-h-screen bg-background px-6 py-14">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-center text-3xl font-thin uppercase tracking-[0.3em] text-text">
          Sovereign
        </h1>

        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Your Campaigns</h2>
          <button
            type="button"
            disabled={atLimit}
            onClick={handleNewCampaign}
            title={
              atLimit
                ? "Maximum 3 campaigns reached. Abandon one to start a new campaign."
                : undefined
            }
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-text-muted"
          >
            New Campaign
          </button>
        </div>

        {(loadError || bannerError) && (
          <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
            {loadError ?? bannerError}
          </p>
        )}

        {campaigns === null ? (
          <p className="mt-8 text-sm text-text-muted">Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <div className="mt-10 rounded-lg border border-border bg-panel/60 p-10 text-center">
            <h3 className="text-xl font-semibold text-text">
              Begin your first campaign
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              Choose a nation to govern.
            </p>

            <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleNewCampaign}
                className="rounded-lg border border-accent/40 bg-panel-2 p-6 text-center transition hover:border-accent"
              >
                <span className="text-3xl">🇧🇷</span>
                <p className="mt-2 text-sm font-semibold text-text">Brazil</p>
              </button>
              <div className="rounded-lg border border-border bg-panel/40 p-6 text-center opacity-50">
                <span className="text-3xl grayscale">🌍</span>
                <p className="mt-2 text-sm font-semibold text-text-muted">
                  Coming Soon
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex flex-col rounded-lg border border-border bg-panel/60 p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇧🇷</span>
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {campaign.player_name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {campaign.player_title} of {campaign.country_name}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                  <span>Turn {campaign.turn}</span>
                  <span>{campaign.game_date}</span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Last played {formatLastPlayed(campaign.updated_at)}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">Approval</span>
                  <span
                    className={`text-sm font-semibold ${approvalColor(
                      approvals[campaign.id] ?? 0
                    )}`}
                  >
                    {approvals[campaign.id] ?? "—"}%
                  </span>
                </div>

                {confirmingAbandonId === campaign.id ? (
                  <div className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3">
                    <p className="text-xs text-danger">
                      Are you sure? This campaign cannot be recovered.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAbandon(campaign.id)}
                        className="flex-1 rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-danger/90"
                      >
                        Yes, Abandon
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingAbandonId(null)}
                        className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:text-text"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard?campaign=${campaign.id}`)
                      }
                      className="flex-1 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent/90"
                    >
                      Resume Campaign
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingAbandonId(campaign.id)}
                      className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-text-muted transition hover:text-danger"
                    >
                      Abandon
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
