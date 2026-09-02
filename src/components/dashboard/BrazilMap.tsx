"use client";

import brazil from "@svg-maps/brazil";
import {
  SECURITY_COLORS,
  SECURITY_FILL_OPACITY,
  MAP_PINS,
  type SecurityStatus,
} from "@/lib/brazilStates";

interface BrazilLocation {
  id: string;
  name: string;
  path: string;
}

const locations = brazil.locations as unknown as BrazilLocation[];

export function BrazilMap({
  stateSecurity,
}: {
  stateSecurity: Record<string, SecurityStatus>;
}) {
  return (
    <svg
      viewBox={brazil.viewBox}
      className="h-full w-full"
      role="img"
      aria-label="Map of Brazil showing security status by state"
    >
      <g>
        {locations.map((location) => {
          const status: SecurityStatus =
            stateSecurity[location.id] ?? "stable";
          return (
            <path
              key={location.id}
              d={location.path}
              fill={SECURITY_COLORS[status]}
              fillOpacity={SECURITY_FILL_OPACITY[status]}
              stroke="#0a0f1e"
              strokeWidth={1}
              className="transition-[fill,fill-opacity] duration-500 hover:fill-opacity-100"
            >
              <title>{location.name}</title>
            </path>
          );
        })}
      </g>
      <g>
        {MAP_PINS.map((pin) => (
          <g key={pin.id}>
            <circle
              cx={pin.x}
              cy={pin.y}
              r={9}
              fill="#3b82f6"
              fillOpacity={0.35}
              className="animate-ping"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
            <circle
              cx={pin.x}
              cy={pin.y}
              r={4}
              fill="#3b82f6"
              stroke="#0a0f1e"
              strokeWidth={1.5}
            />
            <title>{pin.label}</title>
          </g>
        ))}
      </g>
    </svg>
  );
}
