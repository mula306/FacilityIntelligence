import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "../../lib/domain-error.js";
import type { MappingRepositoryLike } from "./repository.js";
import { MappingService } from "./service.js";

vi.mock("./repository.js", () => ({
  MappingRepository: class MockMappingRepository {}
}));

vi.mock("../../lib/audit.js", () => ({
  writeAuditEntry: vi.fn().mockResolvedValue(undefined)
}));

function buildRecordSet() {
  const facility = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "North Campus",
    code: "NC",
    shortName: null,
    facilityType: null,
    campusName: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    countryCode: null,
    timezone: null,
    notes: null,
    status: "active",
    createdAt: new Date("2026-03-29T10:00:00.000Z"),
    updatedAt: new Date("2026-03-29T10:00:00.000Z"),
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
    buildingType: null,
    notes: null,
    status: "active",
    createdAt: new Date("2026-03-29T10:00:00.000Z"),
    updatedAt: new Date("2026-03-29T10:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const floorA = {
    id: "33333333-3333-4333-8333-333333333333",
    facilityId: facility.id,
    buildingId: building.id,
    name: "Level 1",
    code: "L1",
    floorNumber: 1,
    planImageUrl: "https://cdn.example.com/floor-a.png",
    canvasWidth: 1000,
    canvasHeight: 800,
    notes: null,
    status: "active",
    createdAt: new Date("2026-03-29T10:00:00.000Z"),
    updatedAt: new Date("2026-03-29T10:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const floorB = {
    id: "44444444-4444-4444-8444-444444444444",
    facilityId: facility.id,
    buildingId: building.id,
    name: "Level 2",
    code: "L2",
    floorNumber: 2,
    planImageUrl: null,
    canvasWidth: null,
    canvasHeight: null,
    notes: null,
    status: "active",
    createdAt: new Date("2026-03-29T10:00:00.000Z"),
    updatedAt: new Date("2026-03-29T10:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const zone = {
    id: "55555555-5555-4555-8555-555555555555",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floorA.id,
    name: "Radiology",
    code: "RAD",
    zoneType: null,
    geometryJson: null,
    notes: null,
    status: "active",
    createdAt: new Date("2026-03-29T10:00:00.000Z"),
    updatedAt: new Date("2026-03-29T10:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const room = {
    id: "66666666-6666-4666-8666-666666666666",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floorA.id,
    zoneId: zone.id,
    name: "Consult 101",
    code: "RM101",
    roomNumber: "101",
    roomType: null,
    clinicalCriticality: null,
    geometryJson: null,
    notes: null,
    status: "active",
    createdAt: new Date("2026-03-29T10:00:00.000Z"),
    updatedAt: new Date("2026-03-29T10:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null
  };

  const currentVersion = {
    id: "77777777-7777-4777-8777-777777777777",
    floorId: floorA.id,
    name: "Base plan",
    versionLabel: "v1",
    assetUrl: "https://cdn.example.com/floor-a-v1.png",
    canvasWidth: 1000,
    canvasHeight: 800,
    source: "manual-canvas",
    isCurrent: true,
    status: "active",
    notes: null,
    createdAt: new Date("2026-03-29T10:00:00.000Z"),
    updatedAt: new Date("2026-03-29T10:05:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    floor: { id: floorA.id, name: floorA.name, code: floorA.code }
  };

  const candidateVersion = {
    id: "88888888-8888-4888-8888-888888888888",
    floorId: floorA.id,
    name: "Updated plan",
    versionLabel: "v2",
    assetUrl: "https://cdn.example.com/floor-a-v2.png",
    canvasWidth: 1400,
    canvasHeight: 900,
    source: "manual-canvas",
    isCurrent: false,
    status: "active",
    notes: null,
    createdAt: new Date("2026-03-29T10:10:00.000Z"),
    updatedAt: new Date("2026-03-29T10:20:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    floor: { id: floorA.id, name: floorA.name, code: floorA.code }
  };

  const annotationOnFloorA = {
    id: "99999999-9999-4999-8999-999999999999",
    floorId: floorA.id,
    floorPlanVersionId: currentVersion.id,
    zoneId: zone.id,
    roomId: room.id,
    title: "Dead spot",
    annotationType: "note",
    severity: "medium",
    geometryJson: JSON.stringify({ type: "Point", coordinates: [10, 20] }),
    notes: null,
    status: "active",
    createdAt: new Date("2026-03-29T10:10:00.000Z"),
    updatedAt: new Date("2026-03-29T10:10:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    floor: { id: floorA.id, name: floorA.name, code: floorA.code },
    floorPlanVersion: { id: currentVersion.id, name: currentVersion.name, versionLabel: currentVersion.versionLabel },
    zone: { id: zone.id, name: zone.name },
    room: { id: room.id, name: room.name, roomNumber: room.roomNumber }
  };

  return {
    facility,
    building,
    floorA,
    floorB,
    zone,
    room,
    currentVersion,
    candidateVersion,
    annotationOnFloorA
  };
}

function buildRepository(overrides: Partial<MappingRepositoryLike> = {}): MappingRepositoryLike {
  const records = buildRecordSet();

  return {
    withTransaction: vi.fn(async (callback: (db: never) => Promise<unknown>) => callback({} as never)),
    listFacilities: vi.fn(async () => [records.facility]),
    listBuildings: vi.fn(async () => [records.building]),
    listFloors: vi.fn(async () => [records.floorA, records.floorB]),
    listZones: vi.fn(async (floorId?: string) => (floorId === records.floorA.id ? [records.zone] : [])),
    listRooms: vi.fn(async (floorId?: string) => (floorId === records.floorA.id ? [records.room] : [])),
    getFacility: vi.fn(async (id: string) => (id === records.facility.id ? records.facility : null)),
    getBuilding: vi.fn(async (id: string) => (id === records.building.id ? records.building : null)),
    getFloor: vi.fn(async (id: string) => {
      if (id === records.floorA.id) {
        return records.floorA;
      }
      if (id === records.floorB.id) {
        return records.floorB;
      }
      return null;
    }),
    getZone: vi.fn(async (id: string) => (id === records.zone.id ? records.zone : null)),
    getRoom: vi.fn(async (id: string) => (id === records.room.id ? records.room : null)),
    updateFloor: vi.fn(async (_id: string, data: Record<string, unknown>) => ({
      ...records.floorA,
      ...records.floorB,
      ...data,
      id: records.floorA.id,
      floorNumber: 1,
      facilityId: records.floorA.facilityId,
      buildingId: records.floorA.buildingId,
      name: records.floorA.name,
      code: records.floorA.code,
      createdAt: records.floorA.createdAt,
      updatedAt: new Date("2026-03-29T10:30:00.000Z"),
      archivedAt: null,
      archivedBy: null
    })),
    updateZone: vi.fn(async (_id: string, data: Record<string, unknown>) => ({
      ...records.zone,
      ...data,
      updatedAt: new Date("2026-03-29T10:30:00.000Z")
    })),
    updateRoom: vi.fn(async (_id: string, data: Record<string, unknown>) => ({
      ...records.room,
      ...data,
      updatedAt: new Date("2026-03-29T10:30:00.000Z")
    })),
    listFloorPlanVersions: vi.fn(async () => [records.candidateVersion]),
    getFloorPlanVersion: vi.fn(async (id: string) => {
      if (id === records.currentVersion.id) {
        return records.currentVersion;
      }
      if (id === records.candidateVersion.id) {
        return records.candidateVersion;
      }
      return null;
    }),
    createFloorPlanVersion: vi.fn(async (data: Record<string, unknown>) => ({
      id: "new-version",
      ...data,
      createdAt: new Date("2026-03-29T10:15:00.000Z"),
      updatedAt: new Date("2026-03-29T10:15:00.000Z"),
      archivedAt: null,
      archivedBy: null,
      floor: { id: records.floorA.id, name: records.floorA.name, code: records.floorA.code }
    })),
    updateFloorPlanVersion: vi.fn(async (id: string, data: Record<string, unknown>) => {
      if (id === records.currentVersion.id) {
        return {
          ...records.currentVersion,
          ...data,
          status: (data.status as string | undefined) ?? records.currentVersion.status,
          isCurrent: (data.isCurrent as boolean | undefined) ?? records.currentVersion.isCurrent,
          archivedAt: (data.archivedAt as Date | undefined) ?? records.currentVersion.archivedAt,
          archivedBy: (data.archivedBy as string | null | undefined) ?? records.currentVersion.archivedBy,
          updatedAt: new Date("2026-03-29T10:30:00.000Z")
        };
      }

      if (id === records.candidateVersion.id) {
        return {
          ...records.candidateVersion,
          ...data,
          status: (data.status as string | undefined) ?? records.candidateVersion.status,
          isCurrent: (data.isCurrent as boolean | undefined) ?? records.candidateVersion.isCurrent,
          updatedAt: new Date("2026-03-29T10:30:00.000Z")
        };
      }

      return null;
    }),
    clearFloorPlanVersionCurrentFlags: vi.fn(async () => undefined),
    listAnnotations: vi.fn(async () => [records.annotationOnFloorA]),
    getAnnotation: vi.fn(async (id: string) => (id === records.annotationOnFloorA.id ? records.annotationOnFloorA : null)),
    createAnnotation: vi.fn(async (data: Record<string, unknown>) => ({
      id: "annotation-new",
      ...data,
      createdAt: new Date("2026-03-29T10:15:00.000Z"),
      updatedAt: new Date("2026-03-29T10:15:00.000Z"),
      archivedAt: null,
      archivedBy: null,
      floor: { id: records.floorA.id, name: records.floorA.name, code: records.floorA.code },
      floorPlanVersion: { id: records.currentVersion.id, name: records.currentVersion.name, versionLabel: records.currentVersion.versionLabel },
      zone: { id: records.zone.id, name: records.zone.name },
      room: { id: records.room.id, name: records.room.name, roomNumber: records.room.roomNumber }
    })),
    updateAnnotation: vi.fn(async (id: string, data: Record<string, unknown>) => ({
      ...records.annotationOnFloorA,
      id,
      ...data,
      updatedAt: new Date("2026-03-29T10:30:00.000Z")
    })),
    ...overrides
  } as MappingRepositoryLike;
}

describe("MappingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("promotes the most recently updated remaining floor plan version and syncs the floor canvas on archive", async () => {
    const records = buildRecordSet();
    const repository = buildRepository({
      listFloorPlanVersions: vi.fn(async () => [records.candidateVersion]),
      updateFloorPlanVersion: vi.fn(async (id: string, data: Record<string, unknown>) => {
        if (id === records.currentVersion.id) {
          return {
            ...records.currentVersion,
            ...data,
            status: "archived",
            isCurrent: false,
            archivedAt: new Date("2026-03-29T10:40:00.000Z"),
            archivedBy: "user-1",
            updatedAt: new Date("2026-03-29T10:40:00.000Z")
          };
        }

        if (id === records.candidateVersion.id) {
          return {
            ...records.candidateVersion,
            ...data,
            isCurrent: true,
            updatedAt: new Date("2026-03-29T10:40:00.000Z")
          };
        }

        throw new Error("Unexpected version update");
      }),
      updateFloor: vi.fn(async (_id: string, data: Record<string, unknown>) => ({
        ...records.floorA,
        ...data,
        updatedAt: new Date("2026-03-29T10:40:00.000Z")
      }))
    });
    const auditWriter = vi.fn().mockResolvedValue(undefined);
    const service = new MappingService(repository as never, { auditWriter });

    const result = await service.archiveFloorPlanVersion(records.currentVersion.id, {}, "user-1");

    expect(result.status).toBe("archived");
    expect(repository.updateFloorPlanVersion).toHaveBeenCalledWith(
      records.candidateVersion.id,
      expect.objectContaining({ isCurrent: true, updatedBy: "user-1" }),
      expect.anything()
    );
    expect(repository.updateFloor).toHaveBeenCalledWith(
      records.floorA.id,
      expect.objectContaining({
        planImageUrl: records.candidateVersion.assetUrl,
        canvasWidth: records.candidateVersion.canvasWidth,
        canvasHeight: records.candidateVersion.canvasHeight,
        updatedBy: "user-1"
      }),
      expect.anything()
    );
    expect(auditWriter).toHaveBeenCalledWith(expect.objectContaining({ action: "floor-plan-version.archive" }));
  });

  it("rejects annotations that point to a floor plan version from another floor", async () => {
    const repository = buildRepository({
      getFloorPlanVersion: vi.fn(async (id: string) => {
        if (id === "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb") {
          return {
            id,
            floorId: "44444444-4444-4444-8444-444444444444",
            name: "Remote plan",
            versionLabel: "v9",
            assetUrl: null,
            canvasWidth: null,
            canvasHeight: null,
            source: "manual-canvas",
            isCurrent: false,
            status: "active",
            notes: null,
            createdAt: new Date("2026-03-29T10:00:00.000Z"),
            updatedAt: new Date("2026-03-29T10:00:00.000Z"),
            createdBy: null,
            updatedBy: null,
            archivedAt: null,
            archivedBy: null,
            floor: { id: "44444444-4444-4444-8444-444444444444", name: "Level 2", code: "L2" }
          };
        }

        return null;
      })
    });
    const service = new MappingService(repository as never, { auditWriter: vi.fn().mockResolvedValue(undefined) });

    await expect(
      service.createAnnotation({
        floorId: "33333333-3333-4333-8333-333333333333",
        floorPlanVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        title: "Coverage gap",
        annotationType: "note",
        severity: "moderate",
        geometry: { type: "point", points: [{ x: 10, y: 20 }] },
        status: "active"
      })
    ).rejects.toMatchObject({
      message: "Floor plan version does not belong to the selected floor.",
      statusCode: 409
    });
  });

  it("rejects archived status outside the archive workflow", async () => {
    const repository = buildRepository();
    const service = new MappingService(repository as never, { auditWriter: vi.fn().mockResolvedValue(undefined) });

    await expect(
      service.createFloorPlanVersion({
        floorId: "33333333-3333-4333-8333-333333333333",
        name: "Archive me",
        source: "manual-canvas",
        isCurrent: false,
        status: "archived"
      } as never)
    ).rejects.toMatchObject({
      message: "Archived status can only be set through the archive workflow.",
      statusCode: 400
    });
  });
});
