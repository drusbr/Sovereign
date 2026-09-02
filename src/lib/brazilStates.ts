import brazil from "@svg-maps/brazil";

interface BrazilLocation {
  id: string;
  name: string;
  path: string;
}

const locations = brazil.locations as unknown as BrazilLocation[];

export type SecurityStatus = "stable" | "elevated" | "critical";

const INITIAL_OVERRIDES: Record<string, SecurityStatus> = {
  sp: "elevated",
  rj: "elevated",
  ce: "critical",
  am: "critical",
};

/** Initial per-state security status, keyed by @svg-maps/brazil state id. */
export const DEFAULT_STATE_SECURITY: Record<string, SecurityStatus> =
  Object.fromEntries(
    locations.map((loc) => [loc.id, INITIAL_OVERRIDES[loc.id] ?? "stable"])
  );

export const SECURITY_COLORS: Record<SecurityStatus, string> = {
  stable: "#10b981",
  elevated: "#f59e0b",
  critical: "#ef4444",
};

export const SECURITY_FILL_OPACITY: Record<SecurityStatus, number> = {
  stable: 0.8,
  elevated: 0.85,
  critical: 0.85,
};

export interface MapPin {
  id: string;
  label: string;
  x: number;
  y: number;
}

// Approximate centroids within the @svg-maps/brazil viewBox (0 0 613 639).
export const MAP_PINS: MapPin[] = [
  { id: "rj", label: "Rio de Janeiro", x: 487, y: 429 },
  { id: "sp", label: "São Paulo", x: 396, y: 442 },
  { id: "df", label: "Brasília", x: 409, y: 330 },
];

/** All valid Brazilian state/federal-district names, for prompting the AI. */
export const BRAZIL_STATE_NAMES: string[] = locations.map((loc) => loc.name);

/** id + display name for every state/federal district, for tabular display. */
export const BRAZIL_STATES: { id: string; name: string }[] = locations.map(
  (loc) => ({ id: loc.id, name: loc.name })
);

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(name: string): string {
  return name.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase().trim();
}

const STATE_NAME_TO_ID: Record<string, string> = {};
for (const loc of locations) {
  STATE_NAME_TO_ID[normalize(loc.name)] = loc.id;
  STATE_NAME_TO_ID[loc.id] = loc.id;
}

/** Resolves a Brazilian state name (or id) — however the AI phrased it — to its map id. */
export function resolveStateId(name: string): string | undefined {
  return STATE_NAME_TO_ID[normalize(name)];
}

export interface StateSecurityChangeInput {
  state: string;
  newStatus: SecurityStatus;
}

/** Applies the AI's absolute per-state security status changes for this turn. */
export function applyStateSecurityChanges(
  current: Record<string, SecurityStatus>,
  changes: StateSecurityChangeInput[]
): Record<string, SecurityStatus> {
  if (changes.length === 0) return current;
  const next = { ...current };
  for (const c of changes) {
    const id = resolveStateId(c.state);
    if (!id) continue;
    next[id] = c.newStatus;
  }
  return next;
}
