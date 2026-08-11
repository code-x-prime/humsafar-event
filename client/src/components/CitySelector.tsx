"use client";

import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useCity } from "@/context/CityContext";

export function CitySelector({ onOpen }: { onOpen?: () => void } = {}) {
  const { citiesByRegion, selectedCity, setSelectedCity, loading } = useCity();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <span className="text-sm text-(--ink-500)">Loading cities...</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) onOpen?.();
            return next;
          });
        }}
        className="flex items-center gap-1.5 rounded-(--radius-btn,12px) border border-(--ink-300) px-3 py-1.5 font-heading text-sm text-foreground hover:border-(--blue-600)"
      >
        <MapPin className="h-4 w-4 text-(--orange-600)" />
        {selectedCity ? selectedCity.name : "Select city"}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 max-h-80 w-64 overflow-y-auto rounded-(--radius-card,16px) border border-(--ink-100) bg-background p-3 shadow-lg">
          {Object.entries(citiesByRegion).map(([region, cities]) => (
            <div key={region} className="mb-3 last:mb-0">
              <p className="font-heading text-xs font-semibold uppercase tracking-wide text-(--ink-500)">
                {region}
              </p>
              <div className="mt-1 flex flex-col">
                {cities.map((city) => (
                  <button
                    key={city.id}
                    disabled={!city.isServiceable}
                    onClick={() => {
                      setSelectedCity(city);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-(--surface-alt,#F7F9FC) disabled:cursor-not-allowed disabled:text-(--ink-300)"
                  >
                    {city.name}
                    {!city.isServiceable && <span className="text-xs">Coming soon</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
