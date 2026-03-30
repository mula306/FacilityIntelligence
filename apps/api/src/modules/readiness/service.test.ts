import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadinessRepositoryLike } from "./repository.js";
import { ReadinessService } from "./service.js";

vi.mock("./repository.js", () => ({
  ReadinessRepository: class MockReadinessRepository {}
}));

vi.mock("@facility/db", () => ({
  Prisma: {
    Decimal: class DecimalMock {
      constructor(private readonly value: number) {}

      toString() {
        return String(this.value);
      }
    }
  }
}));

vi.mock("../../lib/audit.js", () => ({
  writeAuditEntry: vi.fn().mockResolvedValue(undefined)
}));

function buildFixture() {
  const facility = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "North Campus",
    code: "NC",
    shortName: "North",
    facilityType: "Hospital",
    campusName: "Main Campus",
    status: "active",
    createdAt: new Date("2026-03-29T12:00:00.000Z"),
    updatedAt: new Date("2026-03-29T12:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const building = {
    id: "22222222-2222-4222-8222-222222222222",
    facilityId: facility.id,
    name: "Main Tower",
    code: "MT",
    buildingType: "Tower",
    status: "active",
    createdAt: new Date("2026-03-29T12:00:00.000Z"),
    updatedAt: new Date("2026-03-29T12:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const floor = {
    id: "33333333-3333-4333-8333-333333333333",
    facilityId: facility.id,
    buildingId: building.id,
    name: "Level 1",
    code: "L1",
    floorNumber: 1,
    planImageUrl: "https://example.com/floor.png",
    canvasWidth: 1200,
    canvasHeight: 800,
    status: "active",
    createdAt: new Date("2026-03-29T12:00:00.000Z"),
    updatedAt: new Date("2026-03-29T12:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const zone = {
    id: "44444444-4444-4444-8444-444444444444",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    name: "Emergency",
    code: "ED",
    zoneType: "ward",
    status: "active",
    createdAt: new Date("2026-03-29T12:00:00.000Z"),
    updatedAt: new Date("2026-03-29T12:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const room = {
    id: "55555555-5555-4555-8555-555555555555",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    name: "Room 101",
    code: "RM101",
    roomNumber: "101",
    roomType: "patient-room",
    clinicalCriticality: "high",
    status: "active",
    createdAt: new Date("2026-03-29T12:00:00.000Z"),
    updatedAt: new Date("2026-03-29T12:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const device = {
    id: "66666666-6666-4666-8666-666666666666",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    roomId: room.id,
    deviceTypeId: "device-type-1",
    name: "Workstation 101",
    code: "WS101",
    lifecycleState: "in-use",
    status: "active"
  };

  const circuit = {
    id: "77777777-7777-4777-8777-777777777777",
    facilityId: facility.id,
    name: "Primary WAN",
    code: "WAN-1",
    providerName: "MetroNet",
    circuitIdentifier: "A-100",
    bandwidthDownMbps: { toString: () => "80" },
    bandwidthUpMbps: { toString: () => "20" },
    serviceLevel: "Gold",
    status: "active",
    createdAt: new Date("2026-03-29T12:00:00.000Z"),
    updatedAt: new Date("2026-03-29T12:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const measurement = {
    id: "88888888-8888-4888-8888-888888888888",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    networkCircuitId: circuit.id,
    accessPointId: null,
    source: "manual",
    measuredAt: new Date("2026-03-29T12:10:00.000Z"),
    downloadMbps: { toString: () => "24" },
    uploadMbps: { toString: () => "8" },
    latencyMs: { toString: () => "72" },
    packetLossPct: { toString: () => "2.5" },
    notes: null,
    status: "active",
    createdAt: new Date("2026-03-29T12:10:00.000Z"),
    updatedAt: new Date("2026-03-29T12:10:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const coverageAssessment = {
    id: "99999999-9999-4999-8999-999999999999",
    scope: "room",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    roomId: room.id,
    band: "poor",
    sampleCount: 1,
    averageRssi: { toString: () => "-78" },
    strongestRssi: -78,
    weakestRssi: -78,
    coverageScore: { toString: () => "34" },
    confidenceScore: { toString: () => "0.82" },
    deadZoneSampleCount: 0,
    poorSampleCount: 1,
    scoreReason: "Signal is weak near the bed space.",
    aggregatedAt: new Date("2026-03-29T12:12:00.000Z"),
    status: "active"
  };

  const incident = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    roomId: room.id,
    name: "Network outage",
    code: "INC-1",
    incidentType: "outage",
    severity: "high",
    reportedAt: new Date("2026-03-29T12:05:00.000Z"),
    resolvedAt: null,
    resolutionSummary: null,
    status: "active",
    notes: "Router is down",
    createdAt: new Date("2026-03-29T12:05:00.000Z"),
    updatedAt: new Date("2026-03-29T12:05:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    facility,
    building,
    floor,
    zone,
    room
  };

  const manualRiskItem = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    roomId: room.id,
    name: "Battery backup gap",
    code: "RISK-1",
    category: "manual",
    severity: "moderate",
    score: { toString: () => "45" },
    scoreReason: "Batteries need replacement.",
    sourceType: "manual",
    sourceReferenceId: null,
    isSystemGenerated: false,
    status: "active",
    notes: null,
    createdAt: new Date("2026-03-29T12:00:00.000Z"),
    updatedAt: new Date("2026-03-29T12:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    facility,
    building,
    floor,
    zone,
    room
  };

  const systemRiskItem = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    roomId: room.id,
    name: "Existing system risk",
    code: null,
    category: "connectivity-performance",
    severity: "high",
    score: { toString: () => "68" },
    scoreReason: "Existing derived item",
    sourceType: "connectivity-measurement",
    sourceReferenceId: measurement.id,
    isSystemGenerated: true,
    status: "active",
    notes: null,
    createdAt: new Date("2026-03-29T12:00:00.000Z"),
    updatedAt: new Date("2026-03-29T12:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    facility,
    building,
    floor,
    zone,
    room
  };

  return {
    facility,
    building,
    floor,
    zone,
    room,
    device,
    circuit,
    measurement,
    coverageAssessment,
    incident,
    manualRiskItem,
    systemRiskItem
  };
}

function buildRepository(overrides: Partial<ReadinessRepositoryLike> = {}) {
  const fixture = buildFixture();

  return {
    withTransaction: vi.fn(async (callback: (db: never) => Promise<unknown>) => callback({} as never)),
    listFacilities: vi.fn(async () => [fixture.facility]),
    listBuildings: vi.fn(async () => [fixture.building]),
    listFloors: vi.fn(async () => [fixture.floor]),
    listZones: vi.fn(async () => [fixture.zone]),
    listRooms: vi.fn(async () => [fixture.room]),
    listDevices: vi.fn(async () => [fixture.device]),
    listNetworkCircuits: vi.fn(async () => [fixture.circuit]),
    listConnectivityMeasurements: vi.fn(async () => [fixture.measurement]),
    listCoverageAssessments: vi.fn(async () => [fixture.coverageAssessment]),
    listIncidents: vi.fn(async () => [fixture.incident]),
    listRiskItems: vi.fn(async () => [fixture.manualRiskItem, fixture.systemRiskItem]),
    listReadinessScores: vi.fn(async () => []),
    getFacility: vi.fn(async (id: string) => (id === fixture.facility.id ? fixture.facility : null)),
    getBuilding: vi.fn(async (id: string) => (id === fixture.building.id ? fixture.building : null)),
    getFloor: vi.fn(async (id: string) => (id === fixture.floor.id ? fixture.floor : null)),
    getZone: vi.fn(async (id: string) => (id === fixture.zone.id ? fixture.zone : null)),
    getRoom: vi.fn(async (id: string) => (id === fixture.room.id ? fixture.room : null)),
    getIncident: vi.fn(async (id: string) => (id === fixture.incident.id ? fixture.incident : null)),
    getRiskItem: vi.fn(async (id: string) =>
      id === fixture.manualRiskItem.id ? fixture.manualRiskItem : id === fixture.systemRiskItem.id ? fixture.systemRiskItem : null
    ),
    getReadinessScore: vi.fn(async () => null),
    createIncident: vi.fn(async (data: any) => ({
      ...fixture.incident,
      ...data,
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    })),
    updateIncident: vi.fn(async (id: string, data: any) => ({
      ...fixture.incident,
      ...data,
      id
    })),
    createRiskItem: vi.fn(async (data: any) => ({
      ...fixture.manualRiskItem,
      ...data,
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
    })),
    updateRiskItem: vi.fn(async (id: string, data: any) => ({
      ...fixture.manualRiskItem,
      ...data,
      id
    })),
    archiveRiskItemsByScope: vi.fn(async () => undefined),
    archiveReadinessScoresByScope: vi.fn(async () => undefined),
    createReadinessScores: vi.fn(async () => undefined),
    createRiskItems: vi.fn(async () => undefined),
    ...overrides
  } as ReadinessRepositoryLike;
}

describe("ReadinessService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recalculates readiness scores and refreshes system-generated risk items without touching manual items", async () => {
    const repository = buildRepository();
    const auditWriter = vi.fn().mockResolvedValue(undefined);
    const service = new ReadinessService(repository as never, { auditWriter });

    const result = await service.recalculateReadiness(
      {
        facilityId: "11111111-1111-4111-8111-111111111111",
        floorId: "33333333-3333-4333-8333-333333333333",
        archiveExistingSystemRiskItems: true
      },
      "user-1"
    );

    expect(repository.archiveReadinessScoresByScope).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      "user-1",
      expect.anything()
    );
    expect(repository.archiveRiskItemsByScope).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      "user-1",
      expect.anything()
    );
    expect(repository.createReadinessScores).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          facilityId: "11111111-1111-4111-8111-111111111111",
          floorId: null
        }),
        expect.objectContaining({
          floorId: "33333333-3333-4333-8333-333333333333"
        })
      ]),
      expect.anything()
    );
    expect(repository.createRiskItems).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          isSystemGenerated: true
        })
      ]),
      expect.anything()
    );
    expect(result.summary.derivedRiskItems).toBeGreaterThan(0);
    expect(result.readinessScores[0]!.scoreDetails).toEqual(
      expect.objectContaining({
        connectivity: expect.objectContaining({
          measurementId: "88888888-8888-4888-8888-888888888888"
        }),
        support: expect.objectContaining({
          manualRiskItems: 1
        })
      })
    );
    expect(auditWriter).toHaveBeenCalledWith(expect.objectContaining({ action: "readiness.recalculate" }));
  });

  it("creates manual risk items and blocks archive of system-generated ones", async () => {
    const repository = buildRepository();
    const auditWriter = vi.fn().mockResolvedValue(undefined);
    const service = new ReadinessService(repository as never, { auditWriter });

    const created = await service.createRiskItem(
      {
        name: "Manual follow-up",
        code: "RISK-2",
        facilityId: "11111111-1111-4111-8111-111111111111",
        buildingId: "22222222-2222-4222-8222-222222222222",
        floorId: "33333333-3333-4333-8333-333333333333",
        zoneId: "44444444-4444-4444-8444-444444444444",
        roomId: "55555555-5555-4555-8555-555555555555",
        category: "manual",
        severity: "moderate",
        score: 52,
        scoreReason: "Needs review",
        sourceType: "manual",
        isSystemGenerated: false
      },
      "user-2"
    );

    expect(repository.createRiskItem).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "manual",
        isSystemGenerated: false
      })
    );
    expect(created.name).toBe("Manual follow-up");

    await expect(service.archiveRiskItem("cccccccc-cccc-4ccc-8ccc-cccccccccccc", {}, "user-3")).rejects.toMatchObject({
      message: "System-generated risk items are managed through recalculation.",
      statusCode: 409
    });
  });
});
