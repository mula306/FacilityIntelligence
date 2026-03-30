export type JobName =
  | "coverage.aggregate-floor"
  | "coverage.aggregate-facility"
  | "wifi.import-csv"
  | "risk.recalculate-readiness";

export interface CoverageAggregationJob {
  name: "coverage.aggregate-floor" | "coverage.aggregate-facility";
  payload: {
    facilityId: string;
    buildingId?: string;
    floorId?: string;
    wifiScanSessionId?: string;
    requestedBy: string | null;
  };
}

export interface WifiImportJob {
  name: "wifi.import-csv";
  payload: {
    facilityId: string;
    buildingId: string;
    floorId: string;
    sourceFileName: string;
    requestedBy: string | null;
  };
}

export interface ReadinessRecalculationJob {
  name: "risk.recalculate-readiness";
  payload: {
    facilityId: string;
    triggeredBy: string | null;
  };
}

export type FacilityJob = CoverageAggregationJob | WifiImportJob | ReadinessRecalculationJob;

export function createJobId(name: JobName): string {
  return `${name}:${crypto.randomUUID()}`;
}

export * from "./coverage.js";
export * from "./readiness.js";
