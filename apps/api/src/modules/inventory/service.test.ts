import { describe, expect, it, vi } from "vitest";
import { DomainError } from "../../lib/domain-error.js";
import { InventoryService } from "./service.js";

vi.mock("../../lib/audit.js", () => ({
  writeAuditEntry: vi.fn()
}));

function buildRepository(overrides: Record<string, unknown> = {}) {
  return {
    listDeviceTypes: vi.fn(),
    getDeviceType: vi.fn(),
    countDevicesByType: vi.fn(),
    listDevices: vi.fn(),
    getDevice: vi.fn(),
    createDeviceType: vi.fn(),
    updateDeviceType: vi.fn(),
    createDevice: vi.fn(),
    updateDevice: vi.fn(),
    listFacilities: vi.fn(),
    getFacility: vi.fn(),
    listBuildings: vi.fn(),
    getBuilding: vi.fn(),
    listFloors: vi.fn(),
    getFloor: vi.fn(),
    listZones: vi.fn(),
    getZone: vi.fn(),
    listRooms: vi.fn(),
    getRoom: vi.fn(),
    getContact: vi.fn(),
    ...overrides
  };
}

describe("InventoryService", () => {
  it("rejects device placement when the room zone does not match", async () => {
    const repository = buildRepository({
      getDeviceType: vi.fn().mockResolvedValue({
        id: "55555555-5555-5555-5555-555555555555",
        name: "Workstation",
        code: null,
        notes: null,
        manufacturer: null,
        status: "active",
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
        updatedAt: new Date("2026-03-29T00:00:00.000Z"),
        archivedAt: null,
        devices: []
      }),
      getRoom: vi.fn().mockResolvedValue({
        id: "44444444-4444-4444-4444-444444444444",
        facilityId: "11111111-1111-1111-1111-111111111111",
        buildingId: "22222222-2222-2222-2222-222222222222",
        floorId: "33333333-3333-3333-3333-333333333333",
        zoneId: "77777777-7777-7777-7777-777777777777",
        name: "Room 204",
        code: null,
        roomNumber: null,
        roomType: null,
        status: "active",
        archivedAt: null
      })
    });

    const service = new InventoryService(repository as never, { auditWriter: vi.fn() });

    await expect(
      service.createDevice(
        {
          name: "Nursing Station 1",
          facilityId: "11111111-1111-1111-1111-111111111111",
          buildingId: "22222222-2222-2222-2222-222222222222",
          floorId: "33333333-3333-3333-3333-333333333333",
          zoneId: "66666666-6666-6666-6666-666666666666",
          roomId: "44444444-4444-4444-4444-444444444444",
          deviceTypeId: "55555555-5555-5555-5555-555555555555",
          status: "active"
        },
        "user-1"
      )
    ).rejects.toMatchObject({
      message: "Room zone does not match the selected zone.",
      statusCode: 409
    });
  });

  it("blocks archiving a device type that still has assigned devices", async () => {
    const repository = buildRepository({
      getDeviceType: vi.fn().mockResolvedValue({
        id: "55555555-5555-5555-5555-555555555555",
        name: "Workstation",
        code: null,
        notes: null,
        manufacturer: null,
        status: "active",
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
        updatedAt: new Date("2026-03-29T00:00:00.000Z"),
        archivedAt: null,
        devices: []
      }),
      countDevicesByType: vi.fn().mockResolvedValue(1)
    });

    const service = new InventoryService(repository as never, { auditWriter: vi.fn() });

    await expect(service.archiveDeviceType("55555555-5555-5555-5555-555555555555", "user-1")).rejects.toMatchObject({
      name: "DomainError",
      message: "Archive or reassign devices before archiving this device type.",
      statusCode: 409
    });
  });

  it("returns the archived device type without reloading it through the active-only lookup", async () => {
    const repository = buildRepository({
      getDeviceType: vi.fn().mockResolvedValue({
        id: "55555555-5555-5555-5555-555555555555",
        name: "Workstation",
        code: null,
        notes: null,
        manufacturer: null,
        status: "active",
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
        updatedAt: new Date("2026-03-29T00:00:00.000Z"),
        archivedAt: null,
        archivedBy: null,
        devices: []
      }),
      countDevicesByType: vi.fn().mockResolvedValue(0),
      updateDeviceType: vi.fn().mockResolvedValue({
        id: "55555555-5555-5555-5555-555555555555",
        name: "Workstation",
        code: null,
        notes: null,
        manufacturer: null,
        status: "archived",
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
        updatedAt: new Date("2026-03-29T01:00:00.000Z"),
        archivedAt: new Date("2026-03-29T01:00:00.000Z"),
        archivedBy: "user-1",
        devices: []
      })
    });
    const service = new InventoryService(repository as never, { auditWriter: vi.fn() });

    const result = await service.archiveDeviceType("55555555-5555-5555-5555-555555555555", "user-1");

    expect(result.status).toBe("archived");
    expect(result.archivedAt).toBe("2026-03-29T01:00:00.000Z");
  });

  it("returns the archived device payload after archive", async () => {
    const repository = buildRepository({
      getDevice: vi.fn().mockResolvedValue({
        id: "99999999-9999-4999-8999-999999999999",
        name: "Nursing Station 1",
        code: "DEV-1",
        facilityId: "11111111-1111-1111-1111-111111111111",
        buildingId: null,
        floorId: null,
        zoneId: null,
        roomId: null,
        deviceTypeId: "55555555-5555-5555-5555-555555555555",
        hostname: null,
        serialNumber: null,
        assetTag: null,
        ipAddress: null,
        macAddress: null,
        lifecycleState: null,
        ownerContactId: null,
        notes: null,
        status: "active",
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
        updatedAt: new Date("2026-03-29T00:00:00.000Z"),
        archivedAt: null,
        archivedBy: null,
        facility: { id: "11111111-1111-1111-1111-111111111111", name: "North Campus", code: "NC" },
        building: null,
        room: null,
        deviceType: { id: "55555555-5555-5555-5555-555555555555", name: "Workstation" }
      }),
      updateDevice: vi.fn().mockResolvedValue({
        id: "99999999-9999-4999-8999-999999999999",
        name: "Nursing Station 1",
        code: "DEV-1",
        facilityId: "11111111-1111-1111-1111-111111111111",
        buildingId: null,
        floorId: null,
        zoneId: null,
        roomId: null,
        deviceTypeId: "55555555-5555-5555-5555-555555555555",
        hostname: null,
        serialNumber: null,
        assetTag: null,
        ipAddress: null,
        macAddress: null,
        lifecycleState: null,
        ownerContactId: null,
        notes: null,
        status: "archived",
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
        updatedAt: new Date("2026-03-29T01:00:00.000Z"),
        archivedAt: new Date("2026-03-29T01:00:00.000Z"),
        archivedBy: "user-1",
        facility: { id: "11111111-1111-1111-1111-111111111111", name: "North Campus", code: "NC" },
        building: null,
        room: null,
        deviceType: { id: "55555555-5555-5555-5555-555555555555", name: "Workstation" }
      }),
      listFacilities: vi.fn().mockResolvedValue([{ id: "11111111-1111-1111-1111-111111111111", name: "North Campus", code: "NC", status: "active", archivedAt: null }]),
      listBuildings: vi.fn().mockResolvedValue([]),
      listFloors: vi.fn().mockResolvedValue([]),
      listZones: vi.fn().mockResolvedValue([]),
      listRooms: vi.fn().mockResolvedValue([])
    });
    const service = new InventoryService(repository as never, { auditWriter: vi.fn() });

    const result = await service.archiveDevice("99999999-9999-4999-8999-999999999999", "user-1");

    expect(result.status).toBe("archived");
    expect(result.archivedAt).toBe("2026-03-29T01:00:00.000Z");
    expect(result.deviceTypeName).toBe("Workstation");
  });
});
