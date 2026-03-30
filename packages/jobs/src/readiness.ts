import type {
  CoverageBand,
  CoverageAssessmentScope,
  RiskLevel
} from "@facility/domain";

export interface ReadinessRoomInput {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  name: string;
  code: string | null;
  roomNumber: string | null;
  clinicalCriticality: RiskLevel | null;
}

export interface ReadinessDeviceInput {
  id: string;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
}

export interface ReadinessNetworkCircuitInput {
  id: string;
  facilityId: string;
  bandwidthDownMbps: number | null;
  bandwidthUpMbps: number | null;
}

export interface ReadinessConnectivityMeasurementInput {
  id: string;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  latencyMs: number | null;
  packetLossPct: number | null;
  measuredAt: string;
}

export interface ReadinessCoverageAssessmentInput {
  id: string;
  scope: CoverageAssessmentScope;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
  band: CoverageBand;
  coverageScore: number | null;
  confidenceScore: number | null;
  scoreReason: string | null;
  aggregatedAt: string;
  status?: string;
}

export interface ReadinessIncidentInput {
  id: string;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
  severity: RiskLevel;
  status: string;
}

export interface ReadinessManualRiskItemInput {
  id: string;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
  severity: RiskLevel;
  score: number | null;
  status: string;
  isSystemGenerated: boolean;
}

export interface ReadinessCalculationInput {
  facilityId: string;
  buildingId?: string | null;
  floorId?: string | null;
  rooms: ReadinessRoomInput[];
  devices: ReadinessDeviceInput[];
  networkCircuits: ReadinessNetworkCircuitInput[];
  connectivityMeasurements: ReadinessConnectivityMeasurementInput[];
  coverageAssessments: ReadinessCoverageAssessmentInput[];
  incidents: ReadinessIncidentInput[];
  manualRiskItems: ReadinessManualRiskItemInput[];
  calculatedAt?: string;
}

export interface DerivedRiskItemDraft {
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
  name: string;
  code: string | null;
  category: string;
  severity: RiskLevel;
  score: number | null;
  scoreReason: string | null;
  sourceType: string;
  sourceReferenceId: string | null;
}

export interface ReadinessScoreDraft {
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  overallScore: number;
  infrastructureScore: number;
  coverageScore: number;
  supportScore: number;
  calculationVersion: string;
  scoreDetails: Record<string, unknown>;
  coverageAssessmentCount: number;
  activeIncidentCount: number;
  activeRiskItemCount: number;
  calculatedAt: string;
}

export interface ReadinessCalculationResult {
  derivedRiskItems: DerivedRiskItemDraft[];
  readinessScores: ReadinessScoreDraft[];
  summary: {
    overallScore: number;
    facilityScore: number;
    floorScores: number;
    derivedRiskItems: number;
    criticalRiskItems: number;
    activeIncidents: number;
  };
}

const calculationVersion = "t10-v1";

const bandScoreMap: Record<CoverageBand, number> = {
  excellent: 95,
  good: 82,
  fair: 64,
  poor: 38,
  "dead-zone": 12
};

const severityPenaltyMap: Record<RiskLevel, number> = {
  low: 4,
  moderate: 8,
  high: 14,
  critical: 22
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function matchesScope(
  input: {
    buildingId: string | null | undefined;
    floorId: string | null | undefined;
  },
  record: {
    buildingId: string | null | undefined;
    floorId: string | null | undefined;
  }
) {
  if (input.buildingId && record.buildingId !== input.buildingId) {
    return false;
  }

  if (input.floorId && record.floorId !== input.floorId) {
    return false;
  }

  return true;
}

function locationLabel(room: ReadinessRoomInput) {
  return room.roomNumber ? `${room.name} (${room.roomNumber})` : room.name;
}

function latestMeasurementForScope(
  measurements: ReadinessConnectivityMeasurementInput[],
  buildingId: string | null,
  floorId: string | null
) {
  const filtered = measurements
    .filter((measurement) => matchesScope({ buildingId, floorId }, measurement))
    .sort((left, right) => right.measuredAt.localeCompare(left.measuredAt));

  return filtered[0] ?? null;
}

function expectedBandwidth(circuits: ReadinessNetworkCircuitInput[]) {
  return circuits.reduce(
    (current, circuit) => ({
      down: Math.max(current.down, circuit.bandwidthDownMbps ?? 0),
      up: Math.max(current.up, circuit.bandwidthUpMbps ?? 0)
    }),
    { down: 0, up: 0 }
  );
}

function connectivityScore(
  measurements: ReadinessConnectivityMeasurementInput[],
  circuits: ReadinessNetworkCircuitInput[],
  buildingId: string | null,
  floorId: string | null
) {
  const measurement = latestMeasurementForScope(measurements, buildingId, floorId);
  if (!measurement) {
    return {
      score: 55,
      details: {
        reason: "No recent connectivity measurement was available for this scope."
      }
    };
  }

  const expected = expectedBandwidth(circuits);
  const downloadRatio =
    measurement.downloadMbps === null
      ? 0.5
      : expected.down > 0
        ? clamp(measurement.downloadMbps / expected.down, 0, 1)
        : clamp(measurement.downloadMbps / 100, 0, 1);
  const uploadRatio =
    measurement.uploadMbps === null
      ? 0.5
      : expected.up > 0
        ? clamp(measurement.uploadMbps / expected.up, 0, 1)
        : clamp(measurement.uploadMbps / 50, 0, 1);
  const latencyPenalty = Math.max((measurement.latencyMs ?? 20) - 20, 0) * 0.6;
  const packetLossPenalty = (measurement.packetLossPct ?? 0) * 7;
  const score = clamp(downloadRatio * 65 + uploadRatio * 15 + 20 - latencyPenalty - packetLossPenalty, 0, 100);

  return {
    score,
    details: {
      measurementId: measurement.id,
      measuredAt: measurement.measuredAt,
      downloadMbps: measurement.downloadMbps,
      uploadMbps: measurement.uploadMbps,
      latencyMs: measurement.latencyMs,
      packetLossPct: measurement.packetLossPct,
      expectedDownMbps: expected.down || null,
      expectedUpMbps: expected.up || null,
      downloadRatio: Number(downloadRatio.toFixed(2)),
      uploadRatio: Number(uploadRatio.toFixed(2))
    }
  };
}

function inventoryScore(
  rooms: ReadinessRoomInput[],
  devices: ReadinessDeviceInput[],
  buildingId: string | null,
  floorId: string | null
) {
  const scopedRooms = rooms.filter((room) => matchesScope({ buildingId, floorId }, room));
  if (scopedRooms.length === 0) {
    return {
      score: 60,
      details: {
        reason: "No rooms were available in scope for inventory scoring."
      }
    };
  }

  const deviceRoomIds = new Set(
    devices
      .filter((device) => matchesScope({ buildingId, floorId }, device))
      .map((device) => device.roomId)
      .filter((roomId): roomId is string => roomId !== null)
  );
  const roomsWithDevices = scopedRooms.filter((room) => deviceRoomIds.has(room.id));
  const criticalRoomsWithoutDevices = scopedRooms.filter(
    (room) =>
      (room.clinicalCriticality === "high" || room.clinicalCriticality === "critical") &&
      !deviceRoomIds.has(room.id)
  );

  const coveragePercent = (roomsWithDevices.length / scopedRooms.length) * 100;
  const score = clamp(coveragePercent - criticalRoomsWithoutDevices.length * 8, 0, 100);

  return {
    score,
    details: {
      roomCount: scopedRooms.length,
      roomsWithDevices: roomsWithDevices.length,
      criticalRoomsWithoutDevices: criticalRoomsWithoutDevices.length
    }
  };
}

function coverageScore(
  assessments: ReadinessCoverageAssessmentInput[],
  buildingId: string | null,
  floorId: string | null
) {
  const scopedAssessments = assessments.filter((assessment) => {
    if (assessment.status === "archived") {
      return false;
    }
    if (!matchesScope({ buildingId, floorId }, assessment)) {
      return false;
    }
    return assessment.scope === "room" || assessment.scope === "zone" || assessment.scope === "floor";
  });

  if (scopedAssessments.length === 0) {
    return {
      score: 45,
      details: {
        reason: "No active coverage assessments were available for this scope."
      }
    };
  }

  const scoreValues = scopedAssessments.map((assessment) => assessment.coverageScore ?? bandScoreMap[assessment.band]);
  const score = average(scoreValues);

  return {
    score,
    details: {
      assessmentCount: scopedAssessments.length,
      deadZoneCount: scopedAssessments.filter((assessment) => assessment.band === "dead-zone").length,
      poorCount: scopedAssessments.filter((assessment) => assessment.band === "poor").length
    }
  };
}

function supportScore(
  incidents: ReadinessIncidentInput[],
  manualRiskItems: ReadinessManualRiskItemInput[],
  buildingId: string | null,
  floorId: string | null
) {
  const scopedIncidents = incidents.filter(
    (incident) => incident.status !== "archived" && matchesScope({ buildingId, floorId }, incident)
  );
  const scopedManualRiskItems = manualRiskItems.filter(
    (riskItem) =>
      riskItem.status !== "archived" &&
      !riskItem.isSystemGenerated &&
      matchesScope({ buildingId, floorId }, riskItem)
  );

  const incidentPenalty = scopedIncidents.reduce((sum, incident) => sum + severityPenaltyMap[incident.severity], 0);
  const riskPenalty = scopedManualRiskItems.reduce((sum, riskItem) => sum + severityPenaltyMap[riskItem.severity] * 0.75, 0);
  const score = clamp(100 - incidentPenalty - riskPenalty, 0, 100);

  return {
    score,
    details: {
      activeIncidents: scopedIncidents.length,
      manualRiskItems: scopedManualRiskItems.length
    }
  };
}

function createCoverageRiskItems(
  assessments: ReadinessCoverageAssessmentInput[],
  buildingId: string | null,
  floorId: string | null
) {
  return assessments
    .filter((assessment) => assessment.status !== "archived")
    .filter((assessment) => assessment.scope !== "facility")
    .filter((assessment) => matchesScope({ buildingId, floorId }, assessment))
    .filter((assessment) => assessment.band === "poor" || assessment.band === "dead-zone")
    .map<DerivedRiskItemDraft>((assessment) => {
      const severity: RiskLevel = assessment.band === "dead-zone" ? "critical" : "high";
      const score = clamp(100 - (assessment.coverageScore ?? bandScoreMap[assessment.band]), 0, 100);

      return {
        facilityId: assessment.facilityId,
        buildingId: assessment.buildingId,
        floorId: assessment.floorId,
        zoneId: assessment.zoneId,
        roomId: assessment.roomId,
        name:
          assessment.scope === "room"
            ? "Room coverage gap"
            : assessment.scope === "zone"
              ? "Zone coverage gap"
              : "Floor coverage gap",
        code: null,
        category: "coverage-gap",
        severity,
        score,
        scoreReason: assessment.scoreReason ?? "Coverage assessment reported poor or dead-zone signal quality.",
        sourceType: "coverage-assessment",
        sourceReferenceId: assessment.id
      };
    });
}

function createConnectivityRiskItem(
  facilityId: string,
  buildingId: string | null,
  floorId: string | null,
  measurements: ReadinessConnectivityMeasurementInput[],
  circuits: ReadinessNetworkCircuitInput[]
) {
  const latest = latestMeasurementForScope(measurements, buildingId, floorId);
  if (!latest) {
    return null;
  }

  const expected = expectedBandwidth(circuits);
  const downloadRatio =
    latest.downloadMbps === null || expected.down === 0 ? 1 : latest.downloadMbps / expected.down;
  const degraded =
    downloadRatio < 0.75 ||
    (latest.latencyMs ?? 0) > 45 ||
    (latest.packetLossPct ?? 0) > 2;

  if (!degraded) {
    return null;
  }

  const severity: RiskLevel =
    downloadRatio < 0.45 || (latest.latencyMs ?? 0) > 100 || (latest.packetLossPct ?? 0) > 5
      ? "critical"
      : downloadRatio < 0.6 || (latest.latencyMs ?? 0) > 70
        ? "high"
        : "moderate";

  return {
    facilityId,
    buildingId,
    floorId,
    zoneId: null,
    roomId: null,
    name: floorId ? "Floor connectivity degradation" : "Facility connectivity degradation",
    code: null,
    category: "connectivity-performance",
    severity,
    score: clamp(100 - downloadRatio * 100, 0, 100),
    scoreReason: `Latest measured performance was ${latest.downloadMbps ?? "unknown"} Mbps down with ${latest.latencyMs ?? "unknown"} ms latency and ${latest.packetLossPct ?? 0}% packet loss.`,
    sourceType: "connectivity-measurement",
    sourceReferenceId: latest.id
  } satisfies DerivedRiskItemDraft;
}

function createInventoryGapRiskItems(
  rooms: ReadinessRoomInput[],
  devices: ReadinessDeviceInput[],
  buildingId: string | null,
  floorId: string | null
) {
  const scopedRooms = rooms.filter((room) => matchesScope({ buildingId, floorId }, room));
  const deviceRoomIds = new Set(
    devices
      .filter((device) => matchesScope({ buildingId, floorId }, device))
      .map((device) => device.roomId)
      .filter((roomId): roomId is string => roomId !== null)
  );

  return scopedRooms
    .filter(
      (room) =>
        (room.clinicalCriticality === "high" || room.clinicalCriticality === "critical") &&
        !deviceRoomIds.has(room.id)
    )
    .map<DerivedRiskItemDraft>((room) => ({
      facilityId: room.facilityId,
      buildingId: room.buildingId,
      floorId: room.floorId,
      zoneId: room.zoneId,
      roomId: room.id,
      name: `${locationLabel(room)} inventory gap`,
      code: null,
      category: "device-inventory-gap",
      severity: room.clinicalCriticality === "critical" ? "critical" : "high",
      score: room.clinicalCriticality === "critical" ? 88 : 76,
      scoreReason: `No active device inventory was found for ${locationLabel(room)}.`,
      sourceType: "device-inventory",
      sourceReferenceId: room.id
    }));
}

function createCoverageObservabilityRiskItems(
  rooms: ReadinessRoomInput[],
  assessments: ReadinessCoverageAssessmentInput[],
  buildingId: string | null,
  floorId: string | null
) {
  const scopedRooms = rooms.filter((room) => matchesScope({ buildingId, floorId }, room));
  const coveredRoomIds = new Set(
    assessments
      .filter(
        (assessment) =>
          assessment.status !== "archived" &&
          assessment.scope === "room" &&
          matchesScope({ buildingId, floorId }, assessment)
      )
      .map((assessment) => assessment.roomId)
      .filter((roomId): roomId is string => roomId !== null)
  );

  return scopedRooms
    .filter(
      (room) =>
        (room.clinicalCriticality === "high" || room.clinicalCriticality === "critical") &&
        !coveredRoomIds.has(room.id)
    )
    .map<DerivedRiskItemDraft>((room) => ({
      facilityId: room.facilityId,
      buildingId: room.buildingId,
      floorId: room.floorId,
      zoneId: room.zoneId,
      roomId: room.id,
      name: `${locationLabel(room)} lacks coverage assessment`,
      code: null,
      category: "coverage-observability-gap",
      severity: room.clinicalCriticality === "critical" ? "critical" : "high",
      score: room.clinicalCriticality === "critical" ? 85 : 72,
      scoreReason: `No room-level Wi-Fi coverage assessment exists for ${locationLabel(room)}.`,
      sourceType: "readiness-rule",
      sourceReferenceId: room.id
    }));
}

function buildScore(
  facilityId: string,
  buildingId: string | null,
  floorId: string | null,
  rooms: ReadinessRoomInput[],
  devices: ReadinessDeviceInput[],
  circuits: ReadinessNetworkCircuitInput[],
  measurements: ReadinessConnectivityMeasurementInput[],
  assessments: ReadinessCoverageAssessmentInput[],
  incidents: ReadinessIncidentInput[],
  manualRiskItems: ReadinessManualRiskItemInput[],
  derivedRiskItems: DerivedRiskItemDraft[],
  calculatedAt: string
) {
  const infrastructure = average([
    connectivityScore(measurements, circuits, buildingId, floorId).score,
    inventoryScore(rooms, devices, buildingId, floorId).score
  ]);
  const coverage = coverageScore(assessments, buildingId, floorId).score;
  const support = supportScore(incidents, manualRiskItems, buildingId, floorId).score;
  const overallScore = Number((infrastructure * 0.4 + coverage * 0.4 + support * 0.2).toFixed(2));

  const activeAssessmentCount = assessments.filter(
    (assessment) =>
      assessment.status !== "archived" &&
      matchesScope({ buildingId, floorId }, assessment)
  ).length;
  const activeIncidentCount = incidents.filter(
    (incident) => incident.status !== "archived" && matchesScope({ buildingId, floorId }, incident)
  ).length;
  const activeRiskItemCount =
    manualRiskItems.filter(
      (riskItem) =>
        riskItem.status !== "archived" &&
        matchesScope({ buildingId, floorId }, riskItem)
    ).length +
    derivedRiskItems.filter((riskItem) => matchesScope({ buildingId, floorId }, riskItem)).length;

  return {
    facilityId,
    buildingId,
    floorId,
    overallScore,
    infrastructureScore: Number(infrastructure.toFixed(2)),
    coverageScore: Number(coverage.toFixed(2)),
    supportScore: Number(support.toFixed(2)),
    calculationVersion,
    scoreDetails: {
      connectivity: connectivityScore(measurements, circuits, buildingId, floorId).details,
      inventory: inventoryScore(rooms, devices, buildingId, floorId).details,
      coverage: coverageScore(assessments, buildingId, floorId).details,
      support: supportScore(incidents, manualRiskItems, buildingId, floorId).details
    },
    coverageAssessmentCount: activeAssessmentCount,
    activeIncidentCount,
    activeRiskItemCount,
    calculatedAt
  } satisfies ReadinessScoreDraft;
}

export function calculateReadiness(input: ReadinessCalculationInput): ReadinessCalculationResult {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();
  const rooms = input.rooms.filter((room) => {
    if (room.facilityId !== input.facilityId) {
      return false;
    }
    if (input.buildingId && room.buildingId !== input.buildingId) {
      return false;
    }
    if (input.floorId && room.floorId !== input.floorId) {
      return false;
    }
    return true;
  });
  const devices = input.devices.filter((device) => {
    if (device.facilityId !== input.facilityId) {
      return false;
    }
    if (input.buildingId && device.buildingId !== input.buildingId) {
      return false;
    }
    if (input.floorId && device.floorId !== input.floorId) {
      return false;
    }
    return true;
  });
  const circuits = input.networkCircuits.filter((circuit) => circuit.facilityId === input.facilityId);
  const measurements = input.connectivityMeasurements.filter((measurement) => {
    if (measurement.facilityId !== input.facilityId) {
      return false;
    }
    if (input.buildingId && measurement.buildingId !== input.buildingId) {
      return false;
    }
    if (input.floorId && measurement.floorId !== input.floorId) {
      return false;
    }
    return true;
  });
  const assessments = input.coverageAssessments.filter((assessment) => {
    if (assessment.facilityId !== input.facilityId) {
      return false;
    }
    if (input.buildingId && assessment.buildingId !== input.buildingId) {
      return false;
    }
    if (input.floorId && assessment.floorId !== input.floorId) {
      return false;
    }
    return true;
  });
  const incidents = input.incidents.filter((incident) => {
    if (incident.facilityId !== input.facilityId) {
      return false;
    }
    if (input.buildingId && incident.buildingId !== input.buildingId) {
      return false;
    }
    if (input.floorId && incident.floorId !== input.floorId) {
      return false;
    }
    return true;
  });
  const manualRiskItems = input.manualRiskItems.filter((riskItem) => {
    if (riskItem.facilityId !== input.facilityId) {
      return false;
    }
    if (input.buildingId && riskItem.buildingId !== input.buildingId) {
      return false;
    }
    if (input.floorId && riskItem.floorId !== input.floorId) {
      return false;
    }
    return true;
  });

  const derivedRiskItems = [
    ...createCoverageRiskItems(assessments, input.buildingId ?? null, input.floorId ?? null),
    ...createInventoryGapRiskItems(rooms, devices, input.buildingId ?? null, input.floorId ?? null),
    ...createCoverageObservabilityRiskItems(rooms, assessments, input.buildingId ?? null, input.floorId ?? null)
  ];
  const connectivityRiskItem = createConnectivityRiskItem(
    input.facilityId,
    input.buildingId ?? null,
    input.floorId ?? null,
    measurements,
    circuits
  );
  if (connectivityRiskItem) {
    derivedRiskItems.push(connectivityRiskItem);
  }

  const floorIds = Array.from(
    new Set(
      rooms
        .map((room) => room.floorId)
        .filter((floorId) => (input.floorId ? floorId === input.floorId : true))
    )
  );

  const readinessScores: ReadinessScoreDraft[] = [
    buildScore(
      input.facilityId,
      input.buildingId ?? null,
      null,
      rooms,
      devices,
      circuits,
      measurements,
      assessments,
      incidents,
      manualRiskItems,
      derivedRiskItems,
      calculatedAt
    ),
    ...floorIds.map((floorId) => {
      const representativeRoom = rooms.find((room) => room.floorId === floorId);
      return buildScore(
        input.facilityId,
        representativeRoom?.buildingId ?? input.buildingId ?? null,
        floorId,
        rooms,
        devices,
        circuits,
        measurements,
        assessments,
        incidents,
        manualRiskItems,
        derivedRiskItems,
        calculatedAt
      );
    })
  ];

  return {
    derivedRiskItems,
    readinessScores,
    summary: {
      overallScore: readinessScores[0]?.overallScore ?? 0,
      facilityScore: readinessScores[0]?.overallScore ?? 0,
      floorScores: readinessScores.filter((score) => score.floorId !== null).length,
      derivedRiskItems: derivedRiskItems.length,
      criticalRiskItems: derivedRiskItems.filter((riskItem) => riskItem.severity === "critical").length,
      activeIncidents: incidents.filter((incident) => incident.status !== "archived").length
    }
  };
}
