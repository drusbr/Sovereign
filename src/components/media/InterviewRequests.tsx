import type { InterviewRequest } from "@/lib/gameState";
import { LEVEL_STYLES, OUTLET_COLORS } from "@/lib/media";
import { SectionHeader } from "@/components/SectionHeader";

function DeadlineBadge({
  deadline,
  currentTurn,
}: {
  deadline: number;
  currentTurn: number;
}) {
  const remaining = deadline - currentTurn;
  if (remaining < 0) {
    return <span className="text-xs font-medium text-text-muted">Expired</span>;
  }
  const className =
    remaining <= 1
      ? "text-danger"
      : remaining <= 2
        ? "text-amber-400"
        : "text-text-muted";
  return (
    <span className={`text-xs font-medium ${className}`}>
      Expires Turn {deadline}
    </span>
  );
}

function InterviewCard({
  interview,
  currentTurn,
  onAccept,
  onDecline,
}: {
  interview: InterviewRequest;
  currentTurn: number;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const outletColor = OUTLET_COLORS[interview.outlet];
  const riskStyle = LEVEL_STYLES[interview.risk];
  const opportunityStyle = LEVEL_STYLES[interview.opportunity];
  const expired = interview.accepted === null && interview.deadline < currentTurn;

  return (
    <div className="rounded-lg border border-border bg-panel/60 p-4">
      <span
        className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{
          color: outletColor,
          borderColor: `${outletColor}4d`,
          backgroundColor: `${outletColor}1a`,
        }}
      >
        {interview.outlet}
      </span>

      <p className="mt-2 text-sm text-text">{interview.topic}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        <span className="flex items-center gap-1.5 text-text-muted">
          Risk
          <span
            className={`rounded-full border px-1.5 py-0.5 font-semibold uppercase ${riskStyle.text} ${riskStyle.bg} ${riskStyle.border}`}
          >
            {riskStyle.label}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-text-muted">
          Opportunity
          <span
            className={`rounded-full border px-1.5 py-0.5 font-semibold uppercase ${opportunityStyle.text} ${opportunityStyle.bg} ${opportunityStyle.border}`}
          >
            {opportunityStyle.label}
          </span>
        </span>
        <DeadlineBadge deadline={interview.deadline} currentTurn={currentTurn} />
      </div>

      {interview.accepted === true ? (
        <p className="mt-3 rounded-md border border-positive/30 bg-positive/10 px-3 py-2 text-xs font-medium text-positive">
          Accepted — interview pending
        </p>
      ) : interview.accepted === false ? (
        <p className="mt-3 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs text-text-muted line-through decoration-text-muted/60">
          Declined
        </p>
      ) : expired ? (
        <p className="mt-3 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs text-text-muted">
          Request window closed
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onAccept(interview.id)}
            className="flex-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent/90"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => onDecline(interview.id)}
            className="flex-1 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:text-text"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

export function InterviewRequests({
  interviews,
  currentTurn,
  onAccept,
  onDecline,
}: {
  interviews: InterviewRequest[];
  currentTurn: number;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  return (
    <div>
      <SectionHeader title="Interview Requests" />
      {interviews.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel/40 p-6 text-center text-sm text-text-muted">
          No interview requests at this time.
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => (
            <InterviewCard
              key={interview.id}
              interview={interview}
              currentTurn={currentTurn}
              onAccept={onAccept}
              onDecline={onDecline}
            />
          ))}
        </div>
      )}
    </div>
  );
}
