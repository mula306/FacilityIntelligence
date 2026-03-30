import { prisma } from "@facility/db";

const activeWhere = {
  archivedAt: null
} as const;

const facilityInclude = {
  facility: true
} as const;

export interface NetworkRepositoryLike {
  getSummary(facilityId?: string): Promise<NetworkSummary>;
  listFacilities(): Promise<Array<{ id: string; name: string; code: string | null }>>;
  getFacility(id: string): Promise<{ id: string; name: string; code: string | null } | null>;
  listBuildings(facilityId?: string): Promise<Array<{ id: string; facilityId: string; name: string; code: string | null }>>;
  getBuilding(id: string): Promise<{ id: string; facilityId: string; name: string; code: string | null } | null>;
  listFloors(facilityId?: string): Promise<Array<{ id: string; facilityId: string; buildingId: string; name: string; code: string | null; floorNumber: number }>>;
  getFloor(id: string): Promise<{ id: string; facilityId: string; buildingId: string; name: string; code: string | null; floorNumber: number } | null>;
  listZones(floorId?: string): Promise<Array<{ id: string; facilityId: string; buildingId: string; floorId: string; name: string; code: string | null }>>;
  getZone(id: string): Promise<{ id: string; facilityId: string; buildingId: string; floorId: string; name: string; code: string | null } | null>;
  listRooms(floorId?: string): Promise<Array<{ id: string; facilityId: string; buildingId: string; floorId: string; zoneId: string | null; name: string; code: string | null; roomNumber: string | null }>>;
  getRoom(id: string): Promise<{ id: string; facilityId: string; buildingId: string; floorId: string; zoneId: string | null; name: string; code: string | null; roomNumber: string | null } | null>;
  listCircuits(facilityId?: string): Promise<any[]>;
  getCircuit(id: string): Promise<any | null>;
  createCircuit(data: any): Promise<any>;
  updateCircuit(id: string, data: any): Promise<any>;
  listProfiles(facilityId?: string): Promise<any[]>;
  getProfile(id: string): Promise<any | null>;
  createProfile(data: any): Promise<any>;
  updateProfile(id: string, data: any): Promise<any>;
  listAccessPoints(facilityId?: string): Promise<any[]>;
  getAccessPoint(id: string): Promise<any | null>;
  createAccessPoint(data: any): Promise<any>;
  updateAccessPoint(id: string, data: any): Promise<any>;
  listMeasurements(facilityId?: string): Promise<any[]>;
  getMeasurement(id: string): Promise<any | null>;
  createMeasurement(data: any): Promise<any>;
  updateMeasurement(id: string, data: any): Promise<any>;
  listLocationOptions(facilityId?: string): Promise<{
    buildings: Array<{ id: string; facilityId: string; name: string; code: string | null }>;
    floors: Array<{ id: string; facilityId: string; buildingId: string; name: string; code: string | null; floorNumber: number }>;
    zones: Array<{ id: string; facilityId: string; buildingId: string; floorId: string; name: string; code: string | null }>;
    rooms: Array<{ id: string; facilityId: string; buildingId: string; floorId: string; zoneId: string | null; name: string; code: string | null; roomNumber: string | null }>;
  }>;
}

export interface NetworkSummary {
  facilities: number;
  networkCircuits: number;
  networkProfiles: number;
  accessPoints: number;
  connectivityMeasurements: number;
}

export class NetworkRepository implements NetworkRepositoryLike {
  async getSummary(facilityId?: string) {
    const where = facilityId ? { facilityId, archivedAt: null } : activeWhere;

    const [facilities, networkCircuits, networkProfiles, accessPoints, connectivityMeasurements] = await Promise.all([
      prisma.facility.count({ where: activeWhere }),
      prisma.networkCircuit.count({ where }),
      prisma.networkProfile.count({ where }),
      prisma.accessPoint.count({ where }),
      prisma.connectivityMeasurement.count({ where })
    ]);

    return {
      facilities,
      networkCircuits,
      networkProfiles,
      accessPoints,
      connectivityMeasurements
    };
  }

  listFacilities() {
    return prisma.facility.findMany({
      where: activeWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true
      }
    });
  }

  getFacility(id: string) {
    return prisma.facility.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        name: true,
        code: true
      }
    });
  }

  listBuildings(facilityId?: string) {
    return prisma.building.findMany({
      where: {
        archivedAt: null,
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

  getBuilding(id: string) {
    return prisma.building.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        facilityId: true,
        name: true,
        code: true
      }
    });
  }

  listFloors(facilityId?: string) {
    return prisma.floor.findMany({
      where: {
        archivedAt: null,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { floorNumber: "asc" }],
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        name: true,
        code: true,
        floorNumber: true
      }
    });
  }

  getFloor(id: string) {
    return prisma.floor.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        name: true,
        code: true,
        floorNumber: true
      }
    });
  }

  listZones(floorId?: string) {
    return prisma.zone.findMany({
      where: {
        archivedAt: null,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        name: true,
        code: true
      }
    });
  }

  getZone(id: string) {
    return prisma.zone.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        name: true,
        code: true
      }
    });
  }

  listRooms(floorId?: string) {
    return prisma.room.findMany({
      where: {
        archivedAt: null,
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
        roomNumber: true
      }
    });
  }

  getRoom(id: string) {
    return prisma.room.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        zoneId: true,
        name: true,
        code: true,
        roomNumber: true
      }
    });
  }

  listCircuits(facilityId?: string) {
    return prisma.networkCircuit.findMany({
      where: {
        archivedAt: null,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }],
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            measurements: true
          }
        }
      }
    });
  }

  getCircuit(id: string) {
    return prisma.networkCircuit.findFirst({
      where: { id, archivedAt: null },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            measurements: true
          }
        }
      }
    });
  }

  createCircuit(data: any) {
    return prisma.networkCircuit.create({ data });
  }

  updateCircuit(id: string, data: any) {
    return prisma.networkCircuit.update({ where: { id }, data });
  }

  listProfiles(facilityId?: string) {
    return prisma.networkProfile.findMany({
      where: {
        archivedAt: null,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }],
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            accessPoints: true
          }
        }
      }
    });
  }

  getProfile(id: string) {
    return prisma.networkProfile.findFirst({
      where: { id, archivedAt: null },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            accessPoints: true
          }
        }
      }
    });
  }

  createProfile(data: any) {
    return prisma.networkProfile.create({ data });
  }

  updateProfile(id: string, data: any) {
    return prisma.networkProfile.update({ where: { id }, data });
  }

  listAccessPoints(facilityId?: string) {
    return prisma.accessPoint.findMany({
      where: {
        archivedAt: null,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }],
      include: {
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
            floorNumber: true
          }
        },
        zone: {
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
        networkProfile: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            measurements: true,
            wifiSamples: true
          }
        }
      }
    });
  }

  getAccessPoint(id: string) {
    return prisma.accessPoint.findFirst({
      where: { id, archivedAt: null },
      include: {
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
            floorNumber: true
          }
        },
        zone: {
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
        networkProfile: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            measurements: true,
            wifiSamples: true
          }
        }
      }
    });
  }

  createAccessPoint(data: any) {
    return prisma.accessPoint.create({ data });
  }

  updateAccessPoint(id: string, data: any) {
    return prisma.accessPoint.update({ where: { id }, data });
  }

  listMeasurements(facilityId?: string) {
    return prisma.connectivityMeasurement.findMany({
      where: {
        archivedAt: null,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }],
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        networkCircuit: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        accessPoint: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
  }

  getMeasurement(id: string) {
    return prisma.connectivityMeasurement.findFirst({
      where: { id, archivedAt: null },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        networkCircuit: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        accessPoint: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
  }

  createMeasurement(data: any) {
    return prisma.connectivityMeasurement.create({ data });
  }

  updateMeasurement(id: string, data: any) {
    return prisma.connectivityMeasurement.update({ where: { id }, data });
  }

  async listLocationOptions(facilityId?: string) {
    const [buildings, floors, zones, rooms] = await Promise.all([
      this.listBuildings(facilityId),
      this.listFloors(facilityId),
      prisma.zone.findMany({
        where: {
          archivedAt: null,
          ...(facilityId ? { facilityId } : {})
        },
        orderBy: [{ floorId: "asc" }, { name: "asc" }],
        select: {
          id: true,
          facilityId: true,
          buildingId: true,
          floorId: true,
          name: true,
          code: true
        }
      }),
      prisma.room.findMany({
        where: {
          archivedAt: null,
          ...(facilityId ? { facilityId } : {})
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
          roomNumber: true
        }
      })
    ]);

    return {
      buildings,
      floors,
      zones,
      rooms
    };
  }
}

export { facilityInclude };
