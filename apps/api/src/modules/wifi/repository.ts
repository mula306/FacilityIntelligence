import { Prisma, prisma } from "@facility/db";

const activeWhere = {
  archivedAt: null
} as const;

type DbClient = Prisma.TransactionClient | typeof prisma;

function useDb(db?: DbClient) {
  return db ?? prisma;
}

const sessionInclude = {
  facility: {
    select: {
      id: true,
      name: true,
      code: true
    }
  },
  building: {
    select: {
      id: true,
      name: true,
      code: true
    }
  },
  floor: {
    select: {
      id: true,
      name: true,
      code: true,
      floorNumber: true,
      planImageUrl: true,
      canvasWidth: true,
      canvasHeight: true,
      status: true,
      facilityId: true,
      buildingId: true
    }
  },
  zone: {
    select: {
      id: true,
      name: true,
      code: true,
      floorId: true,
      facilityId: true,
      buildingId: true
    }
  },
  room: {
    select: {
      id: true,
      name: true,
      code: true,
      roomNumber: true,
      zoneId: true,
      floorId: true,
      facilityId: true,
      buildingId: true
    }
  },
  collector: {
    select: {
      id: true,
      displayName: true,
      email: true,
      firstName: true,
      lastName: true
    }
  },
  _count: {
    select: {
      samples: true
    }
  }
} as const;

const sampleInclude = {
  session: {
    select: {
      id: true,
      name: true,
      code: true
    }
  },
  facility: {
    select: {
      id: true,
      name: true,
      code: true
    }
  },
  building: {
    select: {
      id: true,
      name: true,
      code: true
    }
  },
  floor: {
    select: {
      id: true,
      name: true,
      code: true,
      floorNumber: true,
      facilityId: true,
      buildingId: true,
      planImageUrl: true,
      canvasWidth: true,
      canvasHeight: true
    }
  },
  zone: {
    select: {
      id: true,
      name: true,
      code: true,
      floorId: true,
      facilityId: true,
      buildingId: true
    }
  },
  room: {
    select: {
      id: true,
      name: true,
      code: true,
      roomNumber: true,
      zoneId: true,
      floorId: true,
      facilityId: true,
      buildingId: true
    }
  },
  accessPoint: {
    select: {
      id: true,
      name: true,
      code: true,
      facilityId: true,
      buildingId: true,
      floorId: true,
      zoneId: true,
      roomId: true,
      model: true,
      macAddress: true
    }
  }
} as const;

const accessPointInclude = {
  facility: {
    select: {
      id: true,
      name: true,
      code: true
    }
  },
  building: {
    select: {
      id: true,
      name: true,
      code: true
    }
  },
  room: {
    select: {
      id: true,
      name: true,
      roomNumber: true
    }
  },
  _count: {
    select: {
      wifiSamples: true
    }
  }
} as const;

export interface WifiRepositoryLike {
  withTransaction<T>(callback: (db: DbClient) => Promise<T>): Promise<T>;
  getSummary(floorId?: string, db?: DbClient): Promise<WifiSummary>;
  listFacilities(db?: DbClient): Promise<Array<{ id: string; name: string; code: string | null }>>;
  listBuildings(facilityId?: string, db?: DbClient): Promise<Array<{ id: string; facilityId: string; name: string; code: string | null }>>;
  listFloors(facilityId?: string, db?: DbClient): Promise<Array<{
    id: string;
    facilityId: string;
    buildingId: string;
    name: string;
    code: string | null;
    floorNumber: number;
    planImageUrl: string | null;
    canvasWidth: number | null;
    canvasHeight: number | null;
    status: string;
  }>>;
  listZones(floorId?: string, db?: DbClient): Promise<Array<{ id: string; facilityId: string; buildingId: string; floorId: string; name: string; code: string | null; status: string }>>;
  listRooms(floorId?: string, db?: DbClient): Promise<Array<{ id: string; facilityId: string; buildingId: string; floorId: string; zoneId: string | null; name: string; code: string | null; roomNumber: string | null; status: string }>>;
  listAccessPoints(floorId?: string, db?: DbClient): Promise<any[]>;
  listSessions(floorId?: string, db?: DbClient): Promise<any[]>;
  listSamples(floorId?: string, sessionId?: string, db?: DbClient): Promise<any[]>;
  getFacility(id: string, db?: DbClient): Promise<{ id: string; name: string; code: string | null } | null>;
  getBuilding(id: string, db?: DbClient): Promise<{ id: string; facilityId: string; name: string; code: string | null } | null>;
  getFloor(id: string, db?: DbClient): Promise<{
    id: string;
    facilityId: string;
    buildingId: string;
    name: string;
    code: string | null;
    floorNumber: number;
    planImageUrl: string | null;
    canvasWidth: number | null;
    canvasHeight: number | null;
    status: string;
  } | null>;
  getZone(id: string, db?: DbClient): Promise<{ id: string; facilityId: string; buildingId: string; floorId: string; name: string; code: string | null; status: string } | null>;
  getRoom(id: string, db?: DbClient): Promise<{ id: string; facilityId: string; buildingId: string; floorId: string; zoneId: string | null; name: string; code: string | null; roomNumber: string | null; status: string } | null>;
  getAccessPoint(id: string, db?: DbClient): Promise<any | null>;
  getSession(id: string, db?: DbClient): Promise<any | null>;
  getSample(id: string, db?: DbClient): Promise<any | null>;
  createSession(data: Prisma.WifiScanSessionUncheckedCreateInput, db?: DbClient): Promise<any>;
  updateSession(id: string, data: Prisma.WifiScanSessionUncheckedUpdateInput, db?: DbClient): Promise<any>;
  createSample(data: Prisma.WifiScanSampleUncheckedCreateInput, db?: DbClient): Promise<any>;
  updateSample(id: string, data: Prisma.WifiScanSampleUncheckedUpdateInput, db?: DbClient): Promise<any>;
}

export interface WifiSummary {
  facilities: number;
  sessions: number;
  samples: number;
  accessPoints: number;
}

export class WifiRepository implements WifiRepositoryLike {
  withTransaction<T>(callback: (db: DbClient) => Promise<T>) {
    return prisma.$transaction((db: Prisma.TransactionClient) => callback(db));
  }

  getSummary(floorId?: string, db?: DbClient) {
    const scope = floorId ? { floorId, archivedAt: null } : activeWhere;

    return Promise.all([
      prisma.facility.count({ where: activeWhere }),
      useDb(db).wifiScanSession.count({ where: scope }),
      useDb(db).wifiScanSample.count({ where: scope }),
      useDb(db).accessPoint.count({ where: scope })
    ]).then(([facilities, sessions, samples, accessPoints]) => ({
      facilities,
      sessions,
      samples,
      accessPoints
    }));
  }

  listFacilities(db?: DbClient) {
    return useDb(db).facility.findMany({
      where: activeWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true
      }
    });
  }

  listBuildings(facilityId?: string, db?: DbClient) {
    return useDb(db).building.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        facilityId: true,
        name: true,
        code: true
      }
    });
  }

  listFloors(facilityId?: string, db?: DbClient) {
    return useDb(db).floor.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { buildingId: "asc" }, { floorNumber: "asc" }],
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        name: true,
        code: true,
        floorNumber: true,
        planImageUrl: true,
        canvasWidth: true,
        canvasHeight: true,
        status: true
      }
    });
  }

  listZones(floorId?: string, db?: DbClient) {
    return useDb(db).zone.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        name: true,
        code: true,
        status: true
      }
    });
  }

  listRooms(floorId?: string, db?: DbClient) {
    return useDb(db).room.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { roomNumber: "asc" }, { name: "asc" }],
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        zoneId: true,
        name: true,
        code: true,
        roomNumber: true,
        status: true
      }
    });
  }

  listAccessPoints(floorId?: string, db?: DbClient) {
    return useDb(db).accessPoint.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { name: "asc" }],
      include: accessPointInclude
    });
  }

  listSessions(floorId?: string, db?: DbClient) {
    return useDb(db).wifiScanSession.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
      include: sessionInclude
    });
  }

  listSamples(floorId?: string, sessionId?: string, db?: DbClient) {
    return useDb(db).wifiScanSample.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {}),
        ...(sessionId ? { wifiScanSessionId: sessionId } : {})
      },
      orderBy: [{ sampledAt: "desc" }, { createdAt: "desc" }],
      include: sampleInclude
    });
  }

  getFacility(id: string, db?: DbClient) {
    return useDb(db).facility.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        name: true,
        code: true
      }
    });
  }

  getBuilding(id: string, db?: DbClient) {
    return useDb(db).building.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        facilityId: true,
        name: true,
        code: true
      }
    });
  }

  getFloor(id: string, db?: DbClient) {
    return useDb(db).floor.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        name: true,
        code: true,
        floorNumber: true,
        planImageUrl: true,
        canvasWidth: true,
        canvasHeight: true,
        status: true
      }
    });
  }

  getZone(id: string, db?: DbClient) {
    return useDb(db).zone.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        name: true,
        code: true,
        status: true
      }
    });
  }

  getRoom(id: string, db?: DbClient) {
    return useDb(db).room.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        zoneId: true,
        name: true,
        code: true,
        roomNumber: true,
        status: true
      }
    });
  }

  getAccessPoint(id: string, db?: DbClient) {
    return useDb(db).accessPoint.findFirst({
      where: { id, archivedAt: null },
      include: accessPointInclude
    });
  }

  getSession(id: string, db?: DbClient) {
    return useDb(db).wifiScanSession.findFirst({
      where: { id, archivedAt: null },
      include: sessionInclude
    });
  }

  getSample(id: string, db?: DbClient) {
    return useDb(db).wifiScanSample.findFirst({
      where: { id, archivedAt: null },
      include: sampleInclude
    });
  }

  createSession(data: Prisma.WifiScanSessionUncheckedCreateInput, db?: DbClient) {
    return useDb(db).wifiScanSession.create({
      data,
      include: sessionInclude
    });
  }

  updateSession(id: string, data: Prisma.WifiScanSessionUncheckedUpdateInput, db?: DbClient) {
    return useDb(db).wifiScanSession.update({
      where: { id },
      data,
      include: sessionInclude
    });
  }

  createSample(data: Prisma.WifiScanSampleUncheckedCreateInput, db?: DbClient) {
    return useDb(db).wifiScanSample.create({
      data,
      include: sampleInclude
    });
  }

  updateSample(id: string, data: Prisma.WifiScanSampleUncheckedUpdateInput, db?: DbClient) {
    return useDb(db).wifiScanSample.update({
      where: { id },
      data,
      include: sampleInclude
    });
  }
}

export type { DbClient };
