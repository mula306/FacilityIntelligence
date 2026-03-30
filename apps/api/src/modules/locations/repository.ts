import { prisma } from "@facility/db";

const activeWhere = {
  archivedAt: null
} as const;

export class LocationRepository {
  getSummary() {
    return Promise.all([
      prisma.facility.count({ where: activeWhere }),
      prisma.building.count({ where: activeWhere }),
      prisma.floor.count({ where: activeWhere }),
      prisma.zone.count({ where: activeWhere }),
      prisma.room.count({ where: activeWhere })
    ]).then(([facilities, buildings, floors, zones, rooms]) => ({
      facilities,
      buildings,
      floors,
      zones,
      rooms
    }));
  }

  listFacilities() {
    return prisma.facility.findMany({
      where: activeWhere,
      orderBy: { name: "asc" }
    });
  }

  getFacility(id: string) {
    return prisma.facility.findUnique({
      where: { id }
    });
  }

  createFacility(data: Parameters<typeof prisma.facility.create>[0]["data"]) {
    return prisma.facility.create({ data });
  }

  updateFacility(id: string, data: Parameters<typeof prisma.facility.update>[0]["data"]) {
    return prisma.facility.update({
      where: { id },
      data
    });
  }

  listBuildings(facilityId?: string) {
    return prisma.building.findMany({
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

  createBuilding(data: Parameters<typeof prisma.building.create>[0]["data"]) {
    return prisma.building.create({ data });
  }

  updateBuilding(id: string, data: Parameters<typeof prisma.building.update>[0]["data"]) {
    return prisma.building.update({
      where: { id },
      data
    });
  }

  listFloors(buildingId?: string) {
    return prisma.floor.findMany({
      where: {
        ...activeWhere,
        ...(buildingId ? { buildingId } : {})
      },
      orderBy: [{ buildingId: "asc" }, { floorNumber: "asc" }]
    });
  }

  getFloor(id: string) {
    return prisma.floor.findUnique({
      where: { id }
    });
  }

  createFloor(data: Parameters<typeof prisma.floor.create>[0]["data"]) {
    return prisma.floor.create({ data });
  }

  updateFloor(id: string, data: Parameters<typeof prisma.floor.update>[0]["data"]) {
    return prisma.floor.update({
      where: { id },
      data
    });
  }

  listZones(floorId?: string) {
    return prisma.zone.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { name: "asc" }]
    });
  }

  getZone(id: string) {
    return prisma.zone.findUnique({
      where: { id }
    });
  }

  createZone(data: Parameters<typeof prisma.zone.create>[0]["data"]) {
    return prisma.zone.create({ data });
  }

  updateZone(id: string, data: Parameters<typeof prisma.zone.update>[0]["data"]) {
    return prisma.zone.update({
      where: { id },
      data
    });
  }

  listRooms(floorId?: string) {
    return prisma.room.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { roomNumber: "asc" }, { name: "asc" }]
    });
  }

  getRoom(id: string) {
    return prisma.room.findUnique({
      where: { id }
    });
  }

  createRoom(data: Parameters<typeof prisma.room.create>[0]["data"]) {
    return prisma.room.create({ data });
  }

  updateRoom(id: string, data: Parameters<typeof prisma.room.update>[0]["data"]) {
    return prisma.room.update({
      where: { id },
      data
    });
  }

  getTree() {
    return prisma.facility.findMany({
      where: activeWhere,
      orderBy: { name: "asc" },
      include: {
        buildings: {
          where: activeWhere,
          orderBy: { name: "asc" },
          include: {
            floors: {
              where: activeWhere,
              orderBy: { floorNumber: "asc" },
              include: {
                zones: {
                  where: activeWhere,
                  orderBy: { name: "asc" }
                },
                rooms: {
                  where: activeWhere,
                  orderBy: [{ roomNumber: "asc" }, { name: "asc" }]
                }
              }
            }
          }
        }
      }
    });
  }
}
