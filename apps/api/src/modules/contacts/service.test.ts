import { describe, expect, it, vi } from "vitest";
import { DomainError } from "../../lib/domain-error.js";
import { ContactsService } from "./service.js";

vi.mock("@facility/db", () => ({
  prisma: {}
}));

function buildRepository() {
  const facility = { id: "11111111-1111-4111-8111-111111111111", name: "Central Hospital", archivedAt: null };
  const building = { id: "22222222-2222-4222-8222-222222222222", facilityId: facility.id, name: "Main", archivedAt: null };
  const floor = { id: "33333333-3333-4333-8333-333333333333", facilityId: facility.id, buildingId: building.id, name: "Level 1", archivedAt: null };
  const zone = { id: "44444444-4444-4444-8444-444444444444", facilityId: facility.id, buildingId: building.id, floorId: floor.id, name: "North Zone", archivedAt: null };
  const room = { id: "55555555-5555-4555-8555-555555555555", facilityId: facility.id, buildingId: building.id, floorId: floor.id, zoneId: zone.id, name: "ICU 101", archivedAt: null };
  const contact = { id: "66666666-6666-4666-8666-666666666666", name: "Jane Carter", archivedAt: null, assignments: [] };
  const role = { id: "77777777-7777-4777-8777-777777777777", name: "Escalation Lead", archivedAt: null, assignments: [] };
  const existingAssignment = {
    id: "assignment-1",
    facilityId: facility.id,
    buildingId: building.id,
    floorId: floor.id,
    zoneId: zone.id,
    roomId: room.id,
    contactId: contact.id,
    contactRoleId: role.id,
    escalationPriority: 1,
    isPrimary: true,
    status: "active",
    createdAt: new Date("2026-03-29T12:00:00.000Z"),
    updatedAt: new Date("2026-03-29T12:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    archivedBy: null,
    contact: { name: contact.name },
    contactRole: { name: role.name },
    facility: { name: facility.name }
  };

  const createdAssignments: any[] = [];

  return {
    listContacts: vi.fn().mockResolvedValue([]),
    listRoles: vi.fn().mockResolvedValue([]),
    listAssignments: vi.fn().mockResolvedValue([existingAssignment, ...createdAssignments]),
    listFacilities: vi.fn().mockResolvedValue([facility]),
    listBuildings: vi.fn().mockResolvedValue([building]),
    listFloors: vi.fn().mockResolvedValue([floor]),
    listZones: vi.fn().mockResolvedValue([zone]),
    listRooms: vi.fn().mockResolvedValue([room]),
    getFacility: vi.fn().mockImplementation(async (id: string) => (id === facility.id ? facility : null)),
    getBuilding: vi.fn().mockImplementation(async (id: string) => (id === building.id ? building : null)),
    getFloor: vi.fn().mockImplementation(async (id: string) => (id === floor.id ? floor : null)),
    getZone: vi.fn().mockImplementation(async (id: string) => (id === zone.id ? zone : null)),
    getRoom: vi.fn().mockImplementation(async (id: string) => (id === room.id ? room : null)),
    getContact: vi.fn().mockImplementation(async (id: string) => (id === contact.id ? { ...contact, assignments: [] } : null)),
    getRole: vi.fn().mockImplementation(async (id: string) => (id === role.id ? { ...role, assignments: [] } : null)),
    getAssignment: vi.fn().mockImplementation(async (id: string) => createdAssignments.find((assignment) => assignment.id === id) ?? (id === existingAssignment.id ? existingAssignment : null)),
    createAssignment: vi.fn().mockImplementation(async (input: any) => {
      const record = {
        id: "assignment-new",
        ...input,
        createdAt: new Date("2026-03-29T12:10:00.000Z"),
        updatedAt: new Date("2026-03-29T12:10:00.000Z"),
        archivedAt: null,
        archivedBy: null,
        contact: { name: contact.name },
        contactRole: { name: role.name },
        facility: { name: facility.name }
      };
      createdAssignments.push(record);
      return record;
    })
  };
}

describe("ContactsService", () => {
  it("auto assigns the next escalation priority and resolves location scope from a room", async () => {
    const repository = buildRepository();
    const auditWriter = vi.fn().mockResolvedValue(undefined);
    const service = new ContactsService(repository as never, { auditWriter });

    const result = await service.createAssignment({
      facilityId: "11111111-1111-4111-8111-111111111111",
      roomId: "55555555-5555-4555-8555-555555555555",
      contactId: "66666666-6666-4666-8666-666666666666",
      contactRoleId: "77777777-7777-4777-8777-777777777777",
      isPrimary: true,
      status: "active"
    });

    expect(repository.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "11111111-1111-4111-8111-111111111111",
        buildingId: "22222222-2222-4222-8222-222222222222",
        floorId: "33333333-3333-4333-8333-333333333333",
        zoneId: "44444444-4444-4444-8444-444444444444",
        roomId: "55555555-5555-4555-8555-555555555555",
        contactId: "66666666-6666-4666-8666-666666666666",
        contactRoleId: "77777777-7777-4777-8777-777777777777",
        escalationPriority: 2,
        isPrimary: true,
        status: "active"
      })
    );
    expect(result.escalationPriority).toBe(2);
    expect(result.roomName).toBe("ICU 101");
    expect(auditWriter).toHaveBeenCalledWith(expect.objectContaining({ action: "contact-assignment.create" }));
  });

  it("rejects location mismatches when a room conflicts with the provided floor", async () => {
    const repository = buildRepository();
    const service = new ContactsService(repository as never, { auditWriter: vi.fn().mockResolvedValue(undefined) });

    await expect(
      service.createAssignment({
        facilityId: "11111111-1111-4111-8111-111111111111",
        floorId: "88888888-8888-4888-8888-888888888888",
        roomId: "55555555-5555-4555-8555-555555555555",
        contactId: "66666666-6666-4666-8666-666666666666",
        contactRoleId: "77777777-7777-4777-8777-777777777777",
        status: "active"
      })
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("allows facility-level assignments when no deeper location scope is provided", async () => {
    const repository = buildRepository();
    const auditWriter = vi.fn().mockResolvedValue(undefined);
    const service = new ContactsService(repository as never, { auditWriter });

    const result = await service.createAssignment({
      facilityId: "11111111-1111-4111-8111-111111111111",
      contactId: "66666666-6666-4666-8666-666666666666",
      contactRoleId: "77777777-7777-4777-8777-777777777777",
      isPrimary: false,
      status: "active"
    });

    expect(repository.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "11111111-1111-4111-8111-111111111111",
        buildingId: null,
        floorId: null,
        zoneId: null,
        roomId: null,
        escalationPriority: 2
      })
    );
    expect(result.facilityName).toBe("Central Hospital");
    expect(result.buildingId).toBeNull();
    expect(result.roomId).toBeNull();
  });
});
