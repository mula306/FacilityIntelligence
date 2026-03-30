import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NetworkRepositoryLike } from "./repository.js";
import { NetworkService } from "./service.js";

vi.mock("./repository.js", () => ({
  NetworkRepository: class MockNetworkRepository {}
}));

vi.mock("../../lib/audit.js", () => ({
  writeAuditEntry: vi.fn().mockResolvedValue(undefined)
}));

function buildRepository(overrides: Partial<NetworkRepositoryLike> = {}): NetworkRepositoryLike {
  return {
    getSummary: vi.fn(async () => ({
      facilities: 1,
      networkCircuits: 1,
      networkProfiles: 1,
      accessPoints: 1,
      connectivityMeasurements: 1
    })),
    listFacilities: vi.fn(async () => [{ id: "11111111-1111-1111-1111-111111111111", name: "North Campus", code: "NC" }]),
    getFacility: vi.fn(async (id: string) => (id === "11111111-1111-1111-1111-111111111111" ? { id, name: "North Campus", code: "NC" } : null)),
    listBuildings: vi.fn(async () => [{ id: "22222222-2222-2222-2222-222222222222", facilityId: "11111111-1111-1111-1111-111111111111", name: "Main Tower", code: "MT" }]),
    getBuilding: vi.fn(async (id: string) => (id === "22222222-2222-2222-2222-222222222222" ? { id, facilityId: "11111111-1111-1111-1111-111111111111", name: "Main Tower", code: "MT" } : null)),
    listFloors: vi.fn(async () => []),
    getFloor: vi.fn(async () => null),
    listZones: vi.fn(async () => []),
    getZone: vi.fn(async () => null),
    listRooms: vi.fn(async () => []),
    getRoom: vi.fn(async () => null),
    listCircuits: vi.fn(async () => [
      {
        id: "circuit-a",
        facilityId: "11111111-1111-1111-1111-111111111111",
        name: "Primary WAN",
        code: "WAN-1",
        providerName: "Carrier One",
        circuitIdentifier: "CID-123",
        bandwidthDownMbps: "1000",
        bandwidthUpMbps: "500",
        serviceLevel: "Gold",
        status: "active",
        notes: null,
        facility: { id: "11111111-1111-1111-1111-111111111111", name: "North Campus", code: "NC" },
        _count: { measurements: 3 }
      }
    ]),
    getCircuit: vi.fn(async () => null),
    createCircuit: vi.fn(async (data: any) => ({ id: "circuit-a", ...data })),
    updateCircuit: vi.fn(async (id: string, data: any) => ({ id, ...data })),
    listProfiles: vi.fn(async () => [
      {
        id: "profile-a",
        facilityId: "11111111-1111-1111-1111-111111111111",
        name: "Clinical Wi-Fi",
        code: "CLIN",
        networkType: "wireless",
        vlanName: "VLAN-20",
        subnetCidr: "10.20.0.0/24",
        status: "active",
        notes: null,
        facility: { id: "11111111-1111-1111-1111-111111111111", name: "North Campus", code: "NC" },
        _count: { accessPoints: 2 }
      }
    ]),
    getProfile: vi.fn(async () => null),
    createProfile: vi.fn(async (data: any) => ({ id: "profile-a", ...data })),
    updateProfile: vi.fn(async (id: string, data: any) => ({ id, ...data })),
    listAccessPoints: vi.fn(async () => []),
    getAccessPoint: vi.fn(async () => null),
    createAccessPoint: vi.fn(async (data: any) => ({ id: "ap-a", ...data })),
    updateAccessPoint: vi.fn(async (id: string, data: any) => ({ id, ...data })),
    listMeasurements: vi.fn(async () => [
      {
        id: "measurement-a",
        facilityId: "11111111-1111-1111-1111-111111111111",
        source: "manual",
        measuredAt: new Date("2026-03-29T12:00:00.000Z"),
        downloadMbps: "950",
        uploadMbps: "480",
        latencyMs: "12",
        packetLossPct: "0.1",
        notes: null,
        status: "active",
        facility: { id: "11111111-1111-1111-1111-111111111111", name: "North Campus", code: "NC" },
        networkCircuit: { id: "33333333-3333-3333-3333-333333333333", name: "Primary WAN", code: "WAN-1" },
        accessPoint: null
      }
    ]),
    getMeasurement: vi.fn(async () => null),
    createMeasurement: vi.fn(async (data: any) => ({ id: "measurement-a", ...data })),
    updateMeasurement: vi.fn(async (id: string, data: any) => ({ id, ...data })),
    listLocationOptions: vi.fn(async () => ({
      buildings: [{ id: "22222222-2222-2222-2222-222222222222", facilityId: "11111111-1111-1111-1111-111111111111", name: "Main Tower", code: "MT" }],
      floors: [{ id: "44444444-4444-4444-4444-444444444444", facilityId: "11111111-1111-1111-1111-111111111111", buildingId: "22222222-2222-2222-2222-222222222222", name: "Level 1", code: "L1", floorNumber: 1 }],
      zones: [{ id: "55555555-5555-5555-5555-555555555555", facilityId: "11111111-1111-1111-1111-111111111111", buildingId: "22222222-2222-2222-2222-222222222222", floorId: "44444444-4444-4444-4444-444444444444", name: "Radiology", code: "RAD" }],
      rooms: [{ id: "66666666-6666-6666-6666-666666666666", facilityId: "11111111-1111-1111-1111-111111111111", buildingId: "22222222-2222-2222-2222-222222222222", floorId: "44444444-4444-4444-4444-444444444444", zoneId: "55555555-5555-5555-5555-555555555555", name: "Consult 101", code: "RM101", roomNumber: "101" }]
    })),
    ...overrides
  } as NetworkRepositoryLike;
}

describe("NetworkService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a bootstrap payload with useful summaries and lists", async () => {
    const service = new NetworkService(buildRepository());

    const result = await service.getBootstrap("11111111-1111-1111-1111-111111111111");

    expect(result.summary).toEqual({
      facilities: 1,
      networkCircuits: 1,
      networkProfiles: 1,
      accessPoints: 1,
      connectivityMeasurements: 1
    });
    expect(result.lists.circuits).toHaveLength(1);
    expect(result.lists.circuits[0]?.name).toBe("Primary WAN");
    expect(result.locations.buildings).toHaveLength(1);
    expect(result.locations.rooms[0]?.roomNumber).toBe("101");
  });

  it("rejects an access point when the building is outside the selected facility", async () => {
    const repository = buildRepository({
      getBuilding: vi.fn(async (id: string) =>
        id === "77777777-7777-7777-7777-777777777777"
          ? { id, facilityId: "88888888-8888-8888-8888-888888888888", name: "Remote Tower", code: "RT" }
          : null
      )
    });
    const service = new NetworkService(repository);

    await expect(
      service.createAccessPoint(
        {
          facilityId: "11111111-1111-1111-1111-111111111111",
          buildingId: "77777777-7777-7777-7777-777777777777",
          name: "AP-101",
          code: "AP101",
          model: "Wi-Fi 6",
          macAddress: "AA:BB:CC:DD:EE:FF",
          status: "active"
        },
        "user-1"
      )
    ).rejects.toMatchObject({
      message: "Building does not belong to the selected facility.",
      statusCode: 409
    });
  });

  it("rejects an access point when the selected profile belongs to another facility", async () => {
    const repository = buildRepository({
      getProfile: vi.fn(async (id: string) =>
        id === "99999999-9999-4999-8999-999999999999"
          ? {
              id,
              facilityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              name: "Remote Wi-Fi",
              code: "REMOTE"
            }
          : null
      )
    });
    const service = new NetworkService(repository);

    await expect(
      service.createAccessPoint(
        {
          facilityId: "11111111-1111-1111-1111-111111111111",
          networkProfileId: "99999999-9999-4999-8999-999999999999",
          name: "AP-201",
          code: "AP201",
          model: "Wi-Fi 6E",
          macAddress: "AA:BB:CC:DD:EE:11",
          status: "active"
        },
        "user-1"
      )
    ).rejects.toMatchObject({
      message: "Network profile does not belong to the selected facility.",
      statusCode: 409
    });
  });

  it("accepts an empty archive payload for circuit archive requests", async () => {
    const repository = buildRepository({
      getCircuit: vi.fn(async (id: string) => ({
        id,
        facilityId: "11111111-1111-1111-1111-111111111111",
        name: "Primary WAN",
        code: "WAN-1",
        providerName: "Carrier One",
        circuitIdentifier: "CID-123",
        bandwidthDownMbps: "1000",
        bandwidthUpMbps: "500",
        serviceLevel: "Gold",
        status: "active",
        notes: null,
        archivedAt: null,
        archivedBy: null,
        facility: { id: "11111111-1111-1111-1111-111111111111", name: "North Campus", code: "NC" },
        _count: { measurements: 3 }
      })),
      updateCircuit: vi.fn(async (id: string, data: any) => ({
        id,
        facilityId: "11111111-1111-1111-1111-111111111111",
        name: "Primary WAN",
        code: "WAN-1",
        providerName: "Carrier One",
        circuitIdentifier: "CID-123",
        bandwidthDownMbps: "1000",
        bandwidthUpMbps: "500",
        serviceLevel: "Gold",
        status: data.status,
        notes: null,
        archivedAt: data.archivedAt,
        archivedBy: data.archivedBy,
        facility: { id: "11111111-1111-1111-1111-111111111111", name: "North Campus", code: "NC" },
        _count: { measurements: 3 }
      }))
    });
    const service = new NetworkService(repository);

    const result = await service.archiveCircuit("33333333-3333-4333-8333-333333333333", undefined, "user-1");

    expect(result.status).toBe("archived");
    expect(result.archivedAt).not.toBeNull();
    expect(repository.updateCircuit).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
      expect.objectContaining({
        status: "archived",
        archivedBy: "user-1"
      })
    );
  });
});
