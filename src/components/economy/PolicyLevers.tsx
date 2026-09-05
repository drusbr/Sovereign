import { SectionHeader } from "@/components/SectionHeader";

interface PolicyCard {
  title: string;
  description: string;
  badgeLabel: string;
  badgeColor: "positive" | "amber" | "neutral";
}

const POLICY_CARDS: PolicyCard[] = [
  {
    title: "Interest Rate Adjustment",
    description:
      "COPOM independently sets the Selic rate in response to inflation and economic conditions. Fiscal choices can alter those conditions, but the Presidency cannot direct the decision.",
    badgeLabel: "Independent Institution",
    badgeColor: "neutral",
  },
  {
    title: "Trade Agreement Fast-Track",
    description:
      "Prioritise negotiation of pending trade agreements to boost FDI and export revenue. Requires congressional approval.",
    badgeLabel: "Requires Congress",
    badgeColor: "amber",
  },
  {
    title: "Emergency Stimulus",
    description:
      "Deploy emergency fiscal stimulus to counter a growth slowdown. Increases sovereign debt but boosts short-term activity.",
    badgeLabel: "Available",
    badgeColor: "positive",
  },
];

const BADGE_STYLES: Record<PolicyCard["badgeColor"], string> = {
  positive: "text-positive bg-positive/10 border-positive/30",
  amber: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  neutral: "text-text-muted bg-white/[0.03] border-border",
};

export function PolicyLevers() {
  return (
    <div>
      <SectionHeader title="Policy Levers" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {POLICY_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-border bg-panel/60 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text">
                {card.title}
              </h3>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE_STYLES[card.badgeColor]}`}
              >
                {card.badgeLabel}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              {card.description}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-text-muted">
        Policy actions are issued through the Orders page and reflected here each turn.
      </p>
    </div>
  );
}
