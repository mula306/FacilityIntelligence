import { describe, expect, it, vi } from "vitest";
import { DomainError } from "../../lib/domain-error.js";
import { HoursService } from "./service.js";

vi.mock("../../lib/audit.js", () => ({
  writeAuditEntry: vi.fn(async () => undefined)
}));

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getSummary: async () => ({ serviceAreas: 0, hours: 0, overnightHours: 0 }),
    listServiceAreas: async () => [],
    getBuilding: async () => null,
    getFloor: async () => null,
    getServiceArea: async () => null,
    createServiceArea: async (data: any) => ({
      id: "sa-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      createdBy: null,
      updatedBy: null,
      archivedBy: null,
      status: "active",
      notes: null,
      code: null,
      buildingId: null,
      floorId: null,
      ...data
    }),
    updateServiceArea: async (id: string, data: any) => ({
      id,
      facilityId: "11111111-1111-1111-1111-111111111111",
      name: "Updated",
      code: null,
      buildingId: null,
      floorId: null,
      status: "active",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      createdBy: null,
      updatedBy: null,
      archivedBy: null,
      ...data
    }),
    listHours: async () => [],
    getHours: async () => null,
    createHours: async (data: any) => ({
      id: "hr-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      createdBy: null,
      updatedBy: null,
      archivedBy: null,
      effectiveFrom: null,
      effectiveTo: null,
      ...data
    }),
    updateHours: async (id: string, data: any) => ({
      id,
      facilityId: "11111111-1111-1111-1111-111111111111",
      serviceAreaId: null,
      dayOfWeek: 1,
      opensAt: "08:00",
      closesAt: "17:00",
      overnight: false,
      status: "active",
      effectiveFrom: null,
      effectiveTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      createdBy: null,
      updatedBy: null,
      archivedBy: null,
      ...data
    }),
    ...overrides
  };
}

describe("HoursService", () => {
  it("rejects same-day schedules that close before they open", async () => {
    const service = new HoursService(createRepository() as never);

    await expect(
      service.createHours({
        facilityId: "11111111-1111-1111-1111-111111111111",
        dayOfWeek: 1,
        opensAt: "18:00",
        closesAt: "08:00",
        overnight: false,
        status: "active"
      })
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejects overlapping schedules in the same scope", async () => {
    const repository = createRepository({
      listHours: async () => [
        {
          id: "hr-existing",
          facilityId: "11111111-1111-1111-1111-111111111111",
          serviceAreaId: null,
          dayOfWeek: 1,
          opensAt: "08:00",
          closesAt: "12:00",
          overnight: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
          createdBy: null,
          updatedBy: null,
          archivedBy: null
        }
      ]
    });
    const service = new HoursService(repository as never);

    await expect(
      service.createHours({
        facilityId: "11111111-1111-1111-1111-111111111111",
        dayOfWeek: 1,
        opensAt: "11:00",
        closesAt: "13:00",
        overnight: false,
        status: "active"
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("accepts overnight schedules that wrap to the next day", async () => {
    const service = new HoursService(
      createRepository({
        listHours: async () => []
      }) as never
    );

    await expect(
      service.createHours({
        facilityId: "11111111-1111-1111-1111-111111111111",
        dayOfWeek: 1,
        opensAt: "22:00",
        closesAt: "02:00",
        overnight: true,
        status: "active"
      })
    ).resolves.toMatchObject({
      overnight: true,
      opensAt: "22:00",
      closesAt: "02:00"
    });
  });
});
