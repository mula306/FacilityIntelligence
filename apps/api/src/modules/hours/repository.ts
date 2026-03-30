import { prisma } from "@facility/db";

const activeWhere = {
  archivedAt: null
} as const;

export class HoursRepository {
  getSummary() {
    return Promise.all([
      prisma.serviceArea.count({ where: activeWhere }),
      prisma.hoursOfOperation.count({ where: activeWhere }),
      prisma.hoursOfOperation.count({
        where: {
          ...activeWhere,
          overnight: true
        }
      })
    ]).then(([serviceAreas, hours, overnightHours]) => ({
      serviceAreas,
      hours,
      overnightHours
    }));
  }

  listServiceAreas(facilityId?: string) {
    return prisma.serviceArea.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }]
    });
  }

  getBuilding(id: string) {
    return prisma.building.findUnique({
      where: { id }
    });
  }

  getFloor(id: string) {
    return prisma.floor.findUnique({
      where: { id }
    });
  }

  getServiceArea(id: string) {
    return prisma.serviceArea.findUnique({
      where: { id }
    });
  }

  createServiceArea(data: Parameters<typeof prisma.serviceArea.create>[0]["data"]) {
    return prisma.serviceArea.create({ data });
  }

  updateServiceArea(id: string, data: Parameters<typeof prisma.serviceArea.update>[0]["data"]) {
    return prisma.serviceArea.update({
      where: { id },
      data
    });
  }

  listHours(serviceAreaId?: string, facilityId?: string) {
    return prisma.hoursOfOperation.findMany({
      where: {
        ...activeWhere,
        ...(serviceAreaId ? { serviceAreaId } : {}),
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { serviceAreaId: "asc" }, { dayOfWeek: "asc" }, { opensAt: "asc" }]
    });
  }

  getHours(id: string) {
    return prisma.hoursOfOperation.findUnique({
      where: { id }
    });
  }

  createHours(data: Parameters<typeof prisma.hoursOfOperation.create>[0]["data"]) {
    return prisma.hoursOfOperation.create({ data });
  }

  updateHours(id: string, data: Parameters<typeof prisma.hoursOfOperation.update>[0]["data"]) {
    return prisma.hoursOfOperation.update({
      where: { id },
      data
    });
  }
}
