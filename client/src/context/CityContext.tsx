"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { getJson } from "@/lib/api";

interface City {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  isServiceable: boolean;
  comingSoon: boolean;
}

interface ServiceabilityResult {
  serviceable: boolean;
  city?: { id: string; name: string; slug: string };
  areaName?: string | null;
  deliveryCharge?: number;
  minOrderValue?: number;
  message: string;
  nearestCity?: { id: string; name: string; slug: string } | null;
  waitlistEnabled?: boolean;
}

interface CityContextValue {
  citiesByRegion: Record<string, City[]>;
  selectedCity: City | null;
  setSelectedCity: (city: City) => void;
  checkPincode: (code: string) => Promise<ServiceabilityResult>;
  loading: boolean;
}

const CityContext = createContext<CityContextValue | null>(null);

const STORAGE_KEY = "humsafar_selected_city";

export function CityProvider({ children }: { children: ReactNode }) {
  const [citiesByRegion, setCitiesByRegion] = useState<Record<string, City[]>>({});
  const [selectedCity, setSelectedCityState] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<Record<string, City[]>>("/cities")
      .then((data) => {
        setCitiesByRegion(data);

        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (stored) {
          try {
            setSelectedCityState(JSON.parse(stored));
            return;
          } catch {
            // fall through to default
          }
        }

        const firstServiceable = Object.values(data).flat().find((c) => c.isServiceable);
        if (firstServiceable) setSelectedCityState(firstServiceable);
      })
      .catch(() => {
        // City list failed to load — selector stays empty, rest of the app still renders.
      })
      .finally(() => setLoading(false));
  }, []);

  const setSelectedCity = useCallback((city: City) => {
    setSelectedCityState(city);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
      document.cookie = `city=${city.slug}; path=/; max-age=31536000`;
    }
  }, []);

  const checkPincode = useCallback(async (code: string) => {
    return getJson<ServiceabilityResult>(`/pincodes/check?code=${encodeURIComponent(code)}`);
  }, []);

  const value = useMemo(
    () => ({ citiesByRegion, selectedCity, setSelectedCity, checkPincode, loading }),
    [citiesByRegion, selectedCity, setSelectedCity, checkPincode, loading]
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
