import { Prisma, prisma } from "@facility/db";

const activeWhere = {
  archivedAt: null
} as const;

const floorPlanVersionInclude = {
  floor: true
} as const;

const annotationInclude = {
  floor: true,
  floorPlanVersion: true,
  zone: true,
  room: true
} as const;

type DbClient = Prisma.TransactionClient | typeof prisma;

function useDb(db?: DbClient) {
  return db ?? prisma;
}

export interface MappingRepositoryLike {
  withTransaction<T>(callback: (db: DbClient) => Promise<T>): Promise<T>;
  listFacilities(db?: DbClient): Promise<any[]>;
  listBuildings(facilityId?: string, db?: DbClient): Promise<any[]>;
  listFloors(buildingId?: string, db?: DbClient): Promise<any[]>;
  listZones(floorId?: string, db?: DbClient): Promise<any[]>;
  listRooms(floorId?: string, db?: DbClient): Promise<any[]>;
  getFacility(id: string, db?: DbClient): Promise<any | null>;
  getBuilding(id: string, db?: DbClient): Promise<any | null>;
  getFloor(id: string, db?: DbClient): Promise<any | null>;
  getZone(id: string, db?: DbClient): Promise<any | null>;
  getRoom(id: string, db?: DbClient): Promise<any | null>;
  updateFloor(id: string, data: Prisma.FloorUncheckedUpdateInput, db?: DbClient): Promise<any>;
  updateZone(id: string, data: Prisma.ZoneUncheckedUpdateInput, db?: DbClient): Promise<any>;
  updateRoom(id: string, data: Prisma.RoomUncheckedUpdateInput, db?: DbClient): Promise<any>;
  listFloorPlanVersions(floorId?: string, db?: DbClient): Promise<any[]>;
  getFloorPlanVersion(id: string, db?: DbClient): Promise<any | null>;
  createFloorPlanVersion(data: Prisma.FloorPlanVersionUncheckedCreateInput, db?: DbClient): Promise<any>;
  updateFloorPlanVersion(id: string, data: Prisma.FloorPlanVersionUncheckedUpdateInput, db?: DbClient): Promise<any>;
  clearFloorPlanVersionCurrentFlags(floorId: string, excludeId: string, db?: DbClient): Promise<void>;
  listAnnotations(floorId?: string, db?: DbClient): Promise<any[]>;
  getAnnotation(id: string, db?: DbClient): Promise<any | null>;
  createAnnotation(data: Prisma.MapAnnotationUncheckedCreateInput, db?: DbClient): Promise<any>;
  updateAnnotation(id: string, data: Prisma.MapAnnotationUncheckedUpdateInput, db?: DbClient): Promise<any>;
}

export class MappingRepository implements MappingRepositoryLike {
  withTransaction<T>(callback: (db: DbClient) => Promise<T>) {
    return prisma.$transaction((db: Prisma.TransactionClient) => callback(db));
  }

  listFacilities(db?: DbClient) {
    return useDb(db).facility.findMany({
      where: activeWhere,
      orderBy: { name: "asc" }
    });
  }

  listBuildings(facilityId?: string, db?: DbClient) {
    return useDb(db).building.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }]
    });
  }

  listFloors(buildingId?: string, db?: DbClient) {
    return useDb(db).floor.findMany({
      where: {
        ...activeWhere,
        ...(buildingId ? { buildingId } : {})
      },
      orderBy: [{ buildingId: "asc" }, { floorNumber: "asc" }, { name: "asc" }]
    });
  }

  listZones(floorId?: string, db?: DbClient) {
    return useDb(db).zone.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { name: "asc" }]
    });
  }

  listRooms(floorId?: string, db?: DbClient) {
    return useDb(db).room.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { roomNumber: "asc" }, { name: "asc" }]
    });
  }

  getFacility(id: string, db?: DbClient) {
    return useDb(db).facility.findFirst({
      where: { id, archivedAt: null }
    });
  }

  getBuilding(id: string, db?: DbClient) {
    return useDb(db).building.findFirst({
      where: { id, archivedAt: null }
    });
  }

  getFloor(id: string, db?: DbClient) {
    return useDb(db).floor.findFirst({
      where: { id, archivedAt: null }
    });
  }

  getZone(id: string, db?: DbClient) {
    return useDb(db).zone.findFirst({
      where: { id, archivedAt: null }
    });
  }

  getRoom(id: string, db?: DbClient) {
    return useDb(db).room.findFirst({
      where: { id, archivedAt: null }
    });
  }

  updateFloor(id: string, data: Prisma.FloorUncheckedUpdateInput, db?: DbClient) {
    return useDb(db).floor.update({
      where: { id },
      data
    });
  }

  updateZone(id: string, data: Prisma.ZoneUncheckedUpdateInput, db?: DbClient) {
    return useDb(db).zone.update({
      where: { id },
      data
    });
  }

  updateRoom(id: string, data: Prisma.RoomUncheckedUpdateInput, db?: DbClient) {
    return useDb(db).room.update({
      where: { id },
      data
    });
  }

  listFloorPlanVersions(floorId?: string, db?: DbClient) {
    return useDb(db).floorPlanVersion.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ isCurrent: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      include: floorPlanVersionInclude
    });
  }

  getFloorPlanVersion(id: string, db?: DbClient) {
    return useDb(db).floorPlanVersion.findFirst({
      where: { id, archivedAt: null },
      include: floorPlanVersionInclude
    });
  }

  createFloorPlanVersion(data: Prisma.FloorPlanVersionUncheckedCreateInput, db?: DbClient) {
    return useDb(db).floorPlanVersion.create({
      data,
      include: floorPlanVersionInclude
    });
  }

  updateFloorPlanVersion(id: string, data: Prisma.FloorPlanVersionUncheckedUpdateInput, db?: DbClient) {
    return useDb(db).floorPlanVersion.update({
      where: { id },
      data,
      include: floorPlanVersionInclude
    });
  }

  clearFloorPlanVersionCurrentFlags(floorId: string, excludeId: string, db?: DbClient) {
    return useDb(db).floorPlanVersion.updateMany({
      where: {
        floorId,
        archivedAt: null,
        id: { not: excludeId },
        isCurrent: true
      },
      data: {
        isCurrent: false
      }
    }).then(() => undefined);
  }

  listAnnotations(floorId?: string, db?: DbClient) {
    return useDb(db).mapAnnotation.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: annotationInclude
    });
  }

  getAnnotation(id: string, db?: DbClient) {
    return useDb(db).mapAnnotation.findFirst({
      where: { id, archivedAt: null },
      include: annotationInclude
    });
  }

  createAnnotation(data: Prisma.MapAnnotationUncheckedCreateInput, db?: DbClient) {
    return useDb(db).mapAnnotation.create({
      data,
      include: annotationInclude
    });
  }

  updateAnnotation(id: string, data: Prisma.MapAnnotationUncheckedUpdateInput, db?: DbClient) {
    return useDb(db).mapAnnotation.update({
      where: { id },
      data,
      include: annotationInclude
    });
  }
}

export type { DbClient };
