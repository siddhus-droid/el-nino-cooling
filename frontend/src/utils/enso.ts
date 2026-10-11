import type { DatasetProfileName } from "../api/types";

/** Shown wherever ONI / ENSO values appear. Deliberately makes no causal claim. */
export const ONI_EXPLANATION =
  "ONI (Oceanic Niño Index) is NOAA's Niño 3.4 sea-surface-temperature anomaly. " +
  "Positive values indicate warmer Niño 3.4 conditions; negative values indicate cooler conditions. " +
  "ENSO phase is based on the supplied ONI classification. The clustering models identify " +
  "patterns and associations in the supplied data — they do not show that El Niño caused " +
  "changes in electricity consumption.";

export const CLIMACOOL_DATASET_META = {
  name: "ClimaCool_AI_Real_Combined_2017_2019",
  cities: "Mumbai, Chennai, Delhi, Bangalore, Lucknow",
  period: "2017–2019",
  dataType: "Real source data",
  ensoSource: "NOAA ONI",
  note: "Electricity data is state-level.",
} as const;

export function isClimacool(profile: DatasetProfileName | undefined | null): boolean {
  return profile === "climacool_real";
}
