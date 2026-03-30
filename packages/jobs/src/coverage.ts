import type {
  CoverageBand,
  PointCoordinate,
  RiskLevel,
  SpatialGeometry
} from "@facility/domain";

export type CoverageAssessmentScope = "facility" | "floor" | "zone" | "room";

export interface CoverageAggregationSample {
  id: string;
  wifiScanSessionId: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  roomId: string | null;
  rssi: number;
  sampledAt: string;
  coordinate: PointCoordinate | null;
  status?: string;
}

export interface CoverageLocationGeometry {
  geometry: SpatialGeometry | null;
}

export interface CoverageZoneContext extends CoverageLocationGeometry {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  name: string;
  code: string | null;
}

export interface CoverageRoomContext extends CoverageLocationGeometry {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  name: string;
  code: string | null;
  roomNumber: string | null;
}

export interface CoverageAggregationInput {
  facilityId: string;
  buildingId?: string | null;
  floorId?: string | null;
  wifiScanSessionId?: string | null;
  samples: CoverageAggregationSample[];
  zones?: CoverageZoneContext[];
  rooms?: CoverageRoomContext[];
  aggregatedAt?: string;
}

export interface CoverageAssessmentDraft {
  scope: CoverageAssessmentScope;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
  wifiScanSessionId: string | null;
  band: CoverageBand;
  sampleCount: number;
  averageRssi: number | null;
  strongestRssi: number | null;
  weakestRssi: number | null;
  coverageScore: number | null;
  confidenceScore: number | null;
  deadZoneSampleCount: number;
  poorSampleCount: number;
  scoreReason: string | null;
  aggregatedAt: string;
}

export interface CoverageHeatPoint {
  sampleId: string;
  wifiScanSessionId: string;
  floorId: string;
  zoneId: string | null;
  roomId: string | null;
  coordinate: PointCoordinate | null;
  rssi: number;
  band: CoverageBand;
  sampledAt: string;
}

export interface DeadZoneAnnotationDraft {
  title: string;
  floorId: string;
  zoneId: string | null;
  roomId: string | null;
  band: CoverageBand;
  severity: RiskLevel;
  geometry: SpatialGeometry;
  notes: string;
}

export interface CoverageAggregationResult {
  assessments: CoverageAssessmentDraft[];
  heatPoints: CoverageHeatPoint[];
  deadZoneAnnotations: DeadZoneAnnotationDraft[];
  summary: {
    samples: number;
    assessments: number;
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    deadZone: number;
    roomsAtRisk: number;
    zonesAtRisk: number;
  };
}

type GroupedLocation = {
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
};

const bandScoreMap: Record<CoverageBand, number> = {
  excellent: 95,
  good: 80,
  fair: 62,
  poor: 38,
  "dead-zone": 14
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function coverageBandFromRssi(rssi: number): CoverageBand {
  if (rssi >= -60) {
    return "excellent";
  }
  if (rssi >= -67) {
    return "good";
  }
  if (rssi >= -73) {
    return "fair";
  }
  if (rssi >= -80) {
    return "poor";
  }
  return "dead-zone";
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function confidenceScoreForGroup(samples: CoverageAggregationSample[]) {
  if (samples.length === 0) {
    return null;
  }

  const coordinateCoverage =
    samples.filter((sample) => sample.coordinate !== null).length / samples.length;
  const sampleDensity = Math.min(samples.length / 8, 1);
  return Number((0.35 + sampleDensity * 0.4 + coordinateCoverage * 0.25).toFixed(2));
}

function coverageScoreForGroup(
  averageRssi: number | null,
  sampleBands: CoverageBand[],
  poorSampleCount: number,
  deadZoneSampleCount: number
) {
  if (averageRssi === null || sampleBands.length === 0) {
    return null;
  }

  const averageBandScore =
    sampleBands.reduce((sum, band) => sum + bandScoreMap[band], 0) / sampleBands.length;
  const signalScore = clamp((averageRssi + 95) * 2.35, 0, 100);
  const penalty =
    (poorSampleCount / sampleBands.length) * 18 +
    (deadZoneSampleCount / sampleBands.length) * 24;

  return Number(clamp((averageBandScore * 0.55 + signalScore * 0.45) - penalty, 0, 100).toFixed(2));
}

function coverageBandForGroup(
  averageRssi: number | null,
  sampleBands: CoverageBand[],
  poorSampleCount: number,
  deadZoneSampleCount: number
): CoverageBand {
  if (averageRssi === null || sampleBands.length === 0) {
    return "dead-zone";
  }

  const deadZoneRatio = deadZoneSampleCount / sampleBands.length;
  const poorRatio = poorSampleCount / sampleBands.length;

  if (deadZoneRatio >= 0.35 || averageRssi < -80) {
    return "dead-zone";
  }
  if (poorRatio >= 0.4 || averageRssi < -74) {
    return "poor";
  }
  if (averageRssi < -68) {
    return "fair";
  }
  if (averageRssi < -62) {
    return "good";
  }
  return "excellent";
}

function scoreReasonForGroup(
  band: CoverageBand,
  averageRssi: number | null,
  poorSampleCount: number,
  deadZoneSampleCount: number,
  sampleCount: number
) {
  if (averageRssi === null || sampleCount === 0) {
    return "No active Wi-Fi samples were available for aggregation.";
  }

  const sampleSummary = `${sampleCount} sample${sampleCount === 1 ? "" : "s"}`;
  const averageSummary = `${averageRssi.toFixed(1)} dBm average`;

  if (band === "dead-zone") {
    return `${sampleSummary} produced ${averageSummary}; ${deadZoneSampleCount} dead-zone readings require remediation.`;
  }
  if (band === "poor") {
    return `${sampleSummary} produced ${averageSummary}; ${poorSampleCount} poor readings indicate unstable coverage.`;
  }
  if (band === "fair") {
    return `${sampleSummary} produced ${averageSummary}; coverage is usable but below enterprise target strength.`;
  }
  if (band === "good") {
    return `${sampleSummary} produced ${averageSummary}; coverage is stable with limited degradation.`;
  }
  return `${sampleSummary} produced ${averageSummary}; coverage is strong across observed readings.`;
}

function groupedLocationKey(scope: CoverageAssessmentScope, location: GroupedLocation): string {
  switch (scope) {
    case "facility":
      return `facility:${location.facilityId}`;
    case "floor":
      return `floor:${location.floorId ?? "none"}`;
    case "zone":
      return `zone:${location.zoneId ?? "none"}`;
    case "room":
      return `room:${location.roomId ?? "none"}`;
    default:
      return `scope:${location.facilityId}`;
  }
}

function geometryFromCoordinate(coordinate: PointCoordinate | null): SpatialGeometry | null {
  if (!coordinate) {
    return null;
  }

  return {
    type: "point",
    points: [coordinate]
  };
}

function centroid(points: PointCoordinate[]) {
  if (points.length === 0) {
    return null;
  }

  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length
  };
}

function deadZoneGeometryForGroup(
  samples: CoverageAggregationSample[],
  room: CoverageRoomContext | undefined,
  zone: CoverageZoneContext | undefined
) {
  if (room?.geometry) {
    return room.geometry;
  }
  if (zone?.geometry) {
    return zone.geometry;
  }

  const points = samples
    .map((sample) => sample.coordinate)
    .filter((coordinate): coordinate is PointCoordinate => coordinate !== null);
  const anchor = centroid(points);
  return geometryFromCoordinate(anchor);
}

function createAssessmentDraft(
  scope: CoverageAssessmentScope,
  samples: CoverageAggregationSample[],
  location: GroupedLocation,
  aggregatedAt: string,
  wifiScanSessionId: string | null
): CoverageAssessmentDraft | null {
  if (samples.length === 0) {
    return null;
  }

  const rssis = samples.map((sample) => sample.rssi);
  const sampleBands = samples.map((sample) => coverageBandFromRssi(sample.rssi));
  const averageRssi = average(rssis);
  const strongestRssi = rssis.length > 0 ? Math.max(...rssis) : null;
  const weakestRssi = rssis.length > 0 ? Math.min(...rssis) : null;
  const deadZoneSampleCount = sampleBands.filter((band) => band === "dead-zone").length;
  const poorSampleCount = sampleBands.filter((band) => band === "poor").length;
  const band = coverageBandForGroup(averageRssi, sampleBands, poorSampleCount, deadZoneSampleCount);

  return {
    scope,
    facilityId: location.facilityId,
    buildingId: location.buildingId,
    floorId: location.floorId,
    zoneId: location.zoneId,
    roomId: location.roomId,
    wifiScanSessionId,
    band,
    sampleCount: samples.length,
    averageRssi: averageRssi === null ? null : Number(averageRssi.toFixed(2)),
    strongestRssi,
    weakestRssi,
    coverageScore: coverageScoreForGroup(averageRssi, sampleBands, poorSampleCount, deadZoneSampleCount),
    confidenceScore: confidenceScoreForGroup(samples),
    deadZoneSampleCount,
    poorSampleCount,
    scoreReason: scoreReasonForGroup(band, averageRssi, poorSampleCount, deadZoneSampleCount, samples.length),
    aggregatedAt
  };
}

function normalizeScopedSamples(input: CoverageAggregationInput) {
  return input.samples.filter((sample) => {
    if (sample.status === "archived") {
      return false;
    }
    if (sample.facilityId !== input.facilityId) {
      return false;
    }
    if (input.buildingId && sample.buildingId !== input.buildingId) {
      return false;
    }
    if (input.floorId && sample.floorId !== input.floorId) {
      return false;
    }
    if (input.wifiScanSessionId && sample.wifiScanSessionId !== input.wifiScanSessionId) {
      return false;
    }
    return true;
  });
}

function groupSamplesByScope(
  scope: CoverageAssessmentScope,
  samples: CoverageAggregationSample[]
) {
  const groups = new Map<string, CoverageAggregationSample[]>();

  for (const sample of samples) {
    const location: GroupedLocation = {
      facilityId: sample.facilityId,
      buildingId: sample.buildingId,
      floorId: sample.floorId,
      zoneId: sample.zoneId,
      roomId: sample.roomId
    };
    const key = groupedLocationKey(scope, location);

    if ((scope === "zone" && !sample.zoneId) || (scope === "room" && !sample.roomId)) {
      continue;
    }

    const bucket = groups.get(key) ?? [];
    bucket.push(sample);
    groups.set(key, bucket);
  }

  return groups;
}

export function aggregateCoverage(input: CoverageAggregationInput): CoverageAggregationResult {
  const scopedSamples = normalizeScopedSamples(input);
  const aggregatedAt = input.aggregatedAt ?? new Date().toISOString();
  const wifiScanSessionId = input.wifiScanSessionId ?? null;

  const assessments: CoverageAssessmentDraft[] = [];
  const facilityAssessment = createAssessmentDraft(
    "facility",
    scopedSamples,
    {
      facilityId: input.facilityId,
      buildingId: input.buildingId ?? null,
      floorId: input.floorId ?? null,
      zoneId: null,
      roomId: null
    },
    aggregatedAt,
    wifiScanSessionId
  );
  if (facilityAssessment) {
    assessments.push(facilityAssessment);
  }

  const floorGroups = groupSamplesByScope("floor", scopedSamples);
  for (const groupedSamples of floorGroups.values()) {
    const first = groupedSamples[0];
    if (!first) {
      continue;
    }
    const assessment = createAssessmentDraft(
      "floor",
      groupedSamples,
      {
        facilityId: first.facilityId,
        buildingId: first.buildingId,
        floorId: first.floorId,
        zoneId: null,
        roomId: null
      },
      aggregatedAt,
      wifiScanSessionId
    );
    if (assessment) {
      assessments.push(assessment);
    }
  }

  const zoneGroups = groupSamplesByScope("zone", scopedSamples);
  for (const groupedSamples of zoneGroups.values()) {
    const first = groupedSamples[0];
    if (!first) {
      continue;
    }
    const assessment = createAssessmentDraft(
      "zone",
      groupedSamples,
      {
        facilityId: first.facilityId,
        buildingId: first.buildingId,
        floorId: first.floorId,
        zoneId: first.zoneId,
        roomId: null
      },
      aggregatedAt,
      wifiScanSessionId
    );
    if (assessment) {
      assessments.push(assessment);
    }
  }

  const roomGroups = groupSamplesByScope("room", scopedSamples);
  for (const groupedSamples of roomGroups.values()) {
    const first = groupedSamples[0];
    if (!first) {
      continue;
    }
    const assessment = createAssessmentDraft(
      "room",
      groupedSamples,
      {
        facilityId: first.facilityId,
        buildingId: first.buildingId,
        floorId: first.floorId,
        zoneId: first.zoneId,
        roomId: first.roomId
      },
      aggregatedAt,
      wifiScanSessionId
    );
    if (assessment) {
      assessments.push(assessment);
    }
  }

  const roomLookup = new Map((input.rooms ?? []).map((room) => [room.id, room]));
  const zoneLookup = new Map((input.zones ?? []).map((zone) => [zone.id, zone]));

  const heatPoints = scopedSamples.map<CoverageHeatPoint>((sample) => ({
    sampleId: sample.id,
    wifiScanSessionId: sample.wifiScanSessionId,
    floorId: sample.floorId,
    zoneId: sample.zoneId,
    roomId: sample.roomId,
    coordinate: sample.coordinate,
    rssi: sample.rssi,
    band: coverageBandFromRssi(sample.rssi),
    sampledAt: sample.sampledAt
  }));

  const deadZoneAnnotations = assessments
    .filter((assessment) => assessment.scope === "room" || assessment.scope === "zone")
    .filter((assessment) => assessment.band === "poor" || assessment.band === "dead-zone")
    .map((assessment) => {
      const groupedSamples = assessment.scope === "room"
        ? roomGroups.get(groupedLocationKey("room", assessment))
        : zoneGroups.get(groupedLocationKey("zone", assessment));
      const room = assessment.roomId ? roomLookup.get(assessment.roomId) : undefined;
      const zone = assessment.zoneId ? zoneLookup.get(assessment.zoneId) : undefined;
      const geometry = deadZoneGeometryForGroup(groupedSamples ?? [], room, zone);

      if (!geometry || !assessment.floorId) {
        return null;
      }

      const label =
        assessment.scope === "room"
          ? room?.roomNumber ?? room?.name ?? "Room coverage gap"
          : zone?.name ?? "Zone coverage gap";

      return {
        title: `${label} coverage gap`,
        floorId: assessment.floorId,
        zoneId: assessment.zoneId,
        roomId: assessment.roomId,
        band: assessment.band,
        severity: assessment.band === "dead-zone" ? "critical" : "high",
        geometry,
        notes: assessment.scoreReason ?? "Coverage assessment detected poor or dead-zone signal quality."
      } as DeadZoneAnnotationDraft;
    })
    .filter((record): record is DeadZoneAnnotationDraft => record !== null);

  const bandCounts = heatPoints.reduce<Record<CoverageBand, number>>(
    (counts, point) => ({
      ...counts,
      [point.band]: counts[point.band] + 1
    }),
    {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      "dead-zone": 0
    }
  );

  return {
    assessments,
    heatPoints,
    deadZoneAnnotations,
    summary: {
      samples: scopedSamples.length,
      assessments: assessments.length,
      excellent: bandCounts.excellent,
      good: bandCounts.good,
      fair: bandCounts.fair,
      poor: bandCounts.poor,
      deadZone: bandCounts["dead-zone"],
      roomsAtRisk: assessments.filter((assessment) => assessment.scope === "room" && (assessment.band === "poor" || assessment.band === "dead-zone")).length,
      zonesAtRisk: assessments.filter((assessment) => assessment.scope === "zone" && (assessment.band === "poor" || assessment.band === "dead-zone")).length
    }
  };
}
