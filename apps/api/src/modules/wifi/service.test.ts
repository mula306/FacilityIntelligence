import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WifiRepositoryLike } from "./repository.js";
import { WifiService } from "./service.js";

vi.mock("./repository.js", () => ({
  WifiRepository: class MockWifiRepository {}
}));

vi.mock("../../lib/audit.js", () => ({
  writeAuditEntry: vi.fn().mockResolvedValue(undefined)
}));

function buildRecordSet() {
  const facility = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "North Campus",
    code: "NC"
  };

  const building = {
    id: "22222222-2222-4222-8222-222222222222",
    facilityId: facility.id,
    name: "Main Tower",
    code: "MT"
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
    status: "active"
  };

  const zone = {
    id: "44444444-4444-4444-8444-444444444444",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    name: "Emergency",
    code: "ED",
    status: "active"
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
    status: "active"
  };

  const accessPoint = {
    id: "66666666-6666-4666-8666-666666666666",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    roomId: room.id,
    name: "AP 01",
    code: "AP01",
    model: "Cisco 9120",
    macAddress: "AA:BB:CC:DD:EE:01",
    geometryJson: JSON.stringify({ type: "point", points: [{ x: 10, y: 20 }] }),
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
    room,
    _count: { wifiSamples: 0 }
  };

  const session = {
    id: "77777777-7777-4777-8777-777777777777",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    roomId: room.id,
    collectorUserId: null,
    collectorDeviceLabel: "Tablet",
    name: "Baseline walk",
    code: "SCAN-1",
    startedAt: new Date("2026-03-29T12:10:00.000Z"),
    endedAt: new Date("2026-03-29T12:20:00.000Z"),
    source: "MANUAL",
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
    room,
    collector: null,
    _count: { samples: 1 }
  };

  const sample = {
    id: "88888888-8888-4888-8888-888888888888",
    wifiScanSessionId: session.id,
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    roomId: room.id,
    accessPointId: accessPoint.id,
    ssid: "FacilitySecure",
    bssid: "AA:BB:CC:DD:EE:01",
    rssi: -62,
    frequencyMHz: 5180,
    channel: 36,
    band: "BAND_5GHZ",
    sampledAt: new Date("2026-03-29T12:11:00.000Z"),
    coordinateX: 100,
    coordinateY: 150,
    status: "active",
    createdAt: new Date("2026-03-29T12:11:00.000Z"),
    updatedAt: new Date("2026-03-29T12:11:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    session: { id: session.id, name: session.name, code: session.code },
    facility,
    building,
    floor,
    zone,
    room,
    accessPoint
  };

  return { facility, building, floor, zone, room, accessPoint, session, sample };
}

function buildRepository(overrides: Partial<WifiRepositoryLike> = {}) {
  const records = buildRecordSet();

  return {
    withTransaction: vi.fn(async (callback: (db: never) => Promise<unknown>) => callback({} as never)),
    getSummary: vi.fn(async () => ({ facilities: 1, sessions: 1, samples: 1, accessPoints: 1 })),
    listFacilities: vi.fn(async () => [records.facility]),
    listBuildings: vi.fn(async () => [records.building]),
    listFloors: vi.fn(async () => [records.floor]),
    listZones: vi.fn(async () => [records.zone]),
    listRooms: vi.fn(async () => [records.room]),
    listAccessPoints: vi.fn(async () => [records.accessPoint]),
    listSessions: vi.fn(async () => [records.session]),
    listSamples: vi.fn(async () => [records.sample]),
    getFacility: vi.fn(async (id: string) => (id === records.facility.id ? records.facility : null)),
    getBuilding: vi.fn(async (id: string) => (id === records.building.id ? records.building : null)),
    getFloor: vi.fn(async (id: string) => (id === records.floor.id ? records.floor : null)),
    getZone: vi.fn(async (id: string) => (id === records.zone.id ? records.zone : null)),
    getRoom: vi.fn(async (id: string) => (id === records.room.id ? records.room : null)),
    getAccessPoint: vi.fn(async (id: string) => (id === records.accessPoint.id ? records.accessPoint : null)),
    getSession: vi.fn(async (id: string) => (id === records.session.id ? records.session : null)),
    getSample: vi.fn(async (id: string) => (id === records.sample.id ? records.sample : null)),
    createSession: vi.fn(async (data: Record<string, unknown>) => ({
      ...records.session,
      ...data,
      source: data.source ?? records.session.source,
      createdAt: new Date("2026-03-29T12:30:00.000Z"),
      updatedAt: new Date("2026-03-29T12:30:00.000Z")
    })),
    updateSession: vi.fn(async (_id: string, data: Record<string, unknown>) => ({
      ...records.session,
      ...data,
      updatedAt: new Date("2026-03-29T12:30:00.000Z")
    })),
    createSample: vi.fn(async (data: Record<string, unknown>) => ({
      ...records.sample,
      ...data,
      createdAt: new Date("2026-03-29T12:30:00.000Z"),
      updatedAt: new Date("2026-03-29T12:30:00.000Z")
    })),
    updateSample: vi.fn(async (_id: string, data: Record<string, unknown>) => ({
      ...records.sample,
      ...data,
      updatedAt: new Date("2026-03-29T12:30:00.000Z")
    })),
    ...overrides
  } as WifiRepositoryLike;
}

describe("WifiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects archived session status outside the archive workflow", async () => {
    const service = new WifiService(buildRepository() as never, { auditWriter: vi.fn().mockResolvedValue(undefined) });

    await expect(
      service.createSession({
        facilityId: "11111111-1111-4111-8111-111111111111",
        buildingId: "22222222-2222-4222-8222-222222222222",
        floorId: "33333333-3333-4333-8333-333333333333",
        name: "Archive me",
        source: "manual",
        startedAt: "2026-03-29T12:10:00.000Z",
        status: "archived"
      })
    ).rejects.toMatchObject({
      message: "Archived status can only be set through the archive workflow.",
      statusCode: 400
    });
  });

  it("rejects a sample whose floor does not match the selected session", async () => {
    const records = buildRecordSet();
    const mismatchedFloor = {
      ...records.floor,
      id: "99999999-9999-4999-8999-999999999999",
      name: "Level 2"
    };

    const repository = buildRepository({
      getFloor: vi.fn(async (id: string) => {
        if (id === records.floor.id) {
          return records.floor;
        }
        if (id === mismatchedFloor.id) {
          return mismatchedFloor;
        }
        return null;
      })
    });

    const service = new WifiService(repository as never, { auditWriter: vi.fn().mockResolvedValue(undefined) });

    await expect(
      service.createSample({
        wifiScanSessionId: records.session.id,
        facilityId: records.facility.id,
        buildingId: records.building.id,
        floorId: mismatchedFloor.id,
        ssid: "FacilitySecure",
        bssid: "AA:BB:CC:DD:EE:02",
        rssi: -70,
        band: "5ghz",
        sampledAt: "2026-03-29T12:12:00.000Z",
        status: "active"
      })
    ).rejects.toMatchObject({
      message: "Sample scope does not match the selected session.",
      statusCode: 409
    });
  });

  it("imports structured sample rows for a valid session", async () => {
    const records = buildRecordSet();
    const repository = buildRepository();
    const auditWriter = vi.fn().mockResolvedValue(undefined);
    const service = new WifiService(repository as never, { auditWriter });

    const result = await service.importSamples(
      {
        wifiScanSessionId: records.session.id,
        rows: [
          {
            ssid: "FacilitySecure",
            bssid: "AA:BB:CC:DD:EE:03",
            rssi: -61,
            band: "5ghz",
            sampledAt: "2026-03-29T12:13:00.000Z",
            coordinate: { x: 100, y: 120 },
            status: "active"
          },
          {
            ssid: "FacilitySecure",
            bssid: "AA:BB:CC:DD:EE:04",
            rssi: -72,
            band: "2.4ghz",
            sampledAt: "2026-03-29T12:14:00.000Z",
            coordinate: { x: 180, y: 160 },
            status: "active"
          }
        ]
      },
      "user-1"
    );

    expect(result.importedCount).toBe(2);
    expect(repository.createSample).toHaveBeenCalledTimes(2);
    expect(repository.createSample).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        wifiScanSessionId: records.session.id,
        facilityId: records.facility.id,
        buildingId: records.building.id,
        floorId: records.floor.id,
        createdBy: "user-1",
        updatedBy: "user-1"
      }),
      expect.anything()
    );
    expect(auditWriter).toHaveBeenCalledWith(expect.objectContaining({ action: "wifi-sample.import" }));
  });
});
