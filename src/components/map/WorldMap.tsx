"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { CountryLayer } from "@/components/map/CountryLayer";
import { MapControls } from "@/components/map/MapControls";
import {
  WORLD_COUNTRIES,
  WORLD_COUNTRY_FEATURES,
  type MapCountry,
} from "@/lib/map/countries";

export interface CountrySelection {
  id: string;
  name: string;
  isoA3: string | null;
}

interface WorldMapProps {
  selectedCountryId?: string | null;
  onCountrySelect?: (country: CountrySelection) => void;
  className?: string;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export function WorldMap({
  selectedCountryId,
  onCountrySelect,
  className = "",
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const [size, setSize] = useState({ width: 960, height: 540 });
  const [internalSelection, setInternalSelection] = useState<string | null>(null);
  const [hovered, setHovered] = useState<MapCountry | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const activeSelection = selectedCountryId ?? internalSelection;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pathFor = useMemo(() => {
    const projection = geoEqualEarth().fitExtent(
      [[12, 12], [Math.max(13, size.width - 12), Math.max(13, size.height - 12)]],
      WORLD_COUNTRY_FEATURES
    );
    const generator = geoPath(projection);
    return (country: MapCountry) => generator(country.feature) ?? "";
  }, [size]);

  const updateZoom = useCallback((factor: number, anchorX = size.width / 2, anchorY = size.height / 2) => {
    setView((current) => {
      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.scale * factor));
      const ratio = nextScale / current.scale;
      return {
        scale: nextScale,
        x: nextScale === MIN_ZOOM ? 0 : anchorX - (anchorX - current.x) * ratio,
        y: nextScale === MIN_ZOOM ? 0 : anchorY - (anchorY - current.y) * ratio,
      };
    });
  }, [size]);

  const selectCountry = (country: MapCountry) => {
    setInternalSelection(country.id);
    onCountrySelect?.({ id: country.id, name: country.name, isoA3: country.isoA3 });
  };

  return (
    <div
      ref={containerRef}
      className={`relative min-h-[420px] w-full touch-none overflow-hidden bg-[#0b1220] ${className}`}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
        drag.x = event.clientX;
        drag.y = event.clientY;
        setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragRef.current = null;
      }}
      onPointerCancel={() => { dragRef.current = null; }}
      onWheel={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        updateZoom(event.deltaY < 0 ? 1.18 : 1 / 1.18, event.clientX - rect.left, event.clientY - rect.top);
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="application"
        aria-label="Interactive world map. Use mouse wheel to zoom and drag to pan."
        className="block h-full w-full"
      >
        <rect width={size.width} height={size.height} fill="#0b1220" />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <CountryLayer
            countries={WORLD_COUNTRIES}
            pathFor={pathFor}
            hoveredId={hovered?.id ?? null}
            selectedId={activeSelection}
            onHover={setHovered}
            onSelect={selectCountry}
          />
        </g>
      </svg>

      <MapControls
        onZoomIn={() => updateZoom(1.35)}
        onZoomOut={() => updateZoom(1 / 1.35)}
        onReset={() => setView({ x: 0, y: 0, scale: 1 })}
      />

      {hovered && (
        <div
          className="pointer-events-none absolute z-20 rounded border border-border bg-panel/95 px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: Math.min(pointer.x + 12, size.width - 180), top: Math.max(8, pointer.y - 38) }}
        >
          <span className="font-medium text-text">{hovered.name}</span>
          <span className="ml-2 font-mono text-text-muted">{hovered.id}</span>
        </div>
      )}
    </div>
  );
}

