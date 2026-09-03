import type { MapCountry } from "@/lib/map/countries";

interface CountryLayerProps {
  countries: readonly MapCountry[];
  pathFor: (country: MapCountry) => string;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (country: MapCountry | null) => void;
  onSelect: (country: MapCountry) => void;
}

export function CountryLayer({
  countries,
  pathFor,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: CountryLayerProps) {
  return (
    <g aria-label="Countries">
      {countries.map((country) => {
        const selected = country.id === selectedId;
        const hovered = country.id === hoveredId;

        return (
          <path
            key={country.id}
            d={pathFor(country)}
            data-country-id={country.id}
            fill={selected ? "#3b82f6" : hovered ? "#334155" : "#1a2332"}
            stroke={selected ? "#93c5fd" : "#475569"}
            strokeWidth={selected ? 1.25 : 0.55}
            vectorEffect="non-scaling-stroke"
            className="cursor-pointer outline-none transition-colors duration-150"
            role="button"
            tabIndex={0}
            aria-label={`${country.name} (${country.id})`}
            aria-pressed={selected}
            onPointerEnter={() => onHover(country)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(country)}
            onBlur={() => onHover(null)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(country);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(country);
              }
            }}
          >
            <title>{`${country.name} — ${country.id}`}</title>
          </path>
        );
      })}
    </g>
  );
}

