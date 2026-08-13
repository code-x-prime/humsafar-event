"use client";

import { useEffect } from "react";
import { useCity } from "@/context/CityContext";

interface CityData {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  isServiceable: boolean;
  comingSoon: boolean;
}

// Landing on a /locations/[slug] page implies visitor intent for that city —
// pre-select it (only if serviceable) so the rest of the site reflects it
// without requiring a manual pick from the header dropdown.
export function SetCityOnVisit({ city }: { city: CityData }) {
  const { setSelectedCity } = useCity();

  useEffect(() => {
    if (city.isServiceable) {
      setSelectedCity({
        id: city.id,
        name: city.name,
        slug: city.slug,
        region: city.region,
        isServiceable: city.isServiceable,
        comingSoon: city.comingSoon,
      });
    }
  }, [city, setSelectedCity]);

  return null;
}
