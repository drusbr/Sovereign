import type { Feature, FeatureCollection, Geometry } from "geojson";
import countriesSource from "@/data/map/ne_110m_admin_0_countries.json";

export interface NaturalEarthCountryProperties {
  NAME: string;
  ADMIN: string;
  NAME_LONG: string;
  ADM0_A3: string;
  ISO_A3: string;
  SOV_A3: string;
  [key: string]: unknown;
}

export interface MapCountry {
  /** Stable Natural Earth administrative-unit identifier. */
  id: string;
  name: string;
  longName: string;
  isoA3: string | null;
  sovereignId: string;
  feature: Feature<Geometry, NaturalEarthCountryProperties>;
}

const featureCollection = countriesSource as unknown as FeatureCollection<
  Geometry,
  NaturalEarthCountryProperties
>;

export const WORLD_COUNTRIES: readonly MapCountry[] = featureCollection.features.map(
  (feature) => ({
    id: feature.properties.ADM0_A3,
    name: feature.properties.NAME,
    longName: feature.properties.NAME_LONG,
    isoA3:
      feature.properties.ISO_A3 && feature.properties.ISO_A3 !== "-99"
        ? feature.properties.ISO_A3
        : null,
    sovereignId: feature.properties.SOV_A3,
    feature,
  })
);

export const WORLD_COUNTRY_FEATURES = featureCollection;
