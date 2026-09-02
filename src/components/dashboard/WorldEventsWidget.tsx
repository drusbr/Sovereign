import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { WorldEvent } from "@/lib/gameState";
import { Panel } from "@/components/dashboard/Panel";

export function WorldEventsWidget({ events }: { events: WorldEvent[] }) {
  const urgent = events.filter(
    (e) => e.requiresResponse && e.status === "active"
  );

  return (
    <Panel
      title="World Events"
      className={`lg:col-span-3 ${
        urgent.length > 0 ? "border-l-2 border-l-danger" : ""
      }`}
      action={
        <Link
          href="/events"
          className="text-xs font-semibold text-accent hover:underline"
        >
          View All →
        </Link>
      }
    >
      {urgent.length === 0 ? (
        <p className="text-sm text-text-muted">
          No events currently require a presidential response.
        </p>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-danger" />
            <span className="text-xs font-semibold text-danger">
              {urgent.length} event{urgent.length === 1 ? "" : "s"} requiring
              attention
            </span>
          </div>
          <ul className="space-y-1.5">
            {urgent.slice(0, 2).map((event) => (
              <li key={event.id} className="text-sm text-text">
                {event.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
