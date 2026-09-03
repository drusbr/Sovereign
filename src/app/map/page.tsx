"use client";

import { useState } from "react";
import { WorldMap, type CountrySelection } from "@/components/map/WorldMap";

export default function MapDevelopmentPage() {
  const [selected, setSelected] = useState<CountrySelection | null>(null);

  return (
    <main className="min-h-screen bg-background p-4 text-text md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Map foundation</p>
            <h1 className="mt-1 text-2xl font-semibold">Interactive World Map</h1>
            <p className="mt-1 text-sm text-text-muted">Natural Earth 1:110m · Equal Earth projection · 177 country features</p>
          </div>
          <div className="min-w-64 rounded-md border border-border bg-panel px-4 py-3 text-sm">
            <span className="block text-[10px] uppercase tracking-widest text-text-muted">Selected country</span>
            {selected ? (
              <span className="mt-1 block text-text">
                {selected.name} <span className="font-mono text-accent">{selected.id}</span>
              </span>
            ) : (
              <span className="mt-1 block text-text-muted">Click a country to inspect it</span>
            )}
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-border bg-panel/50">
          <WorldMap className="h-[min(72vh,800px)]" onCountrySelect={setSelected} />
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border px-4 py-3 text-xs text-text-muted">
            <span>Wheel or controls: zoom</span>
            <span>Drag: pan</span>
            <span>Click: select country</span>
            <span className="sm:ml-auto">Geographic ID: Natural Earth ADM0_A3</span>
          </div>
        </section>
      </div>
    </main>
  );
}
