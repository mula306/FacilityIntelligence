import { Prisma, prisma } from "@facility/db";

const activeWhere = {
  archivedAt: null
} as const;

const facilitySelect = {
  id: true,
  name: true,
  code: true,
  shortName: true,
  facilityType: true,
  campusName: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  archivedAt: true,
  archivedBy: true
} as const;

const buildingSelect = {
  id: true,
  facilityId: true,
  name: true,
  code: true,
  buildingType: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  archivedAt: true,
  archivedBy: true
} as const;

const floorSelect = {
  id: true,
  facilityId: true,
  buildingId: true,
  name: true,
  code: true,
  floorNumber: true,
  planImageUrl: true,
  canvasWidth: true,
  canvasHeight: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  archivedAt: true,
  archivedBy: true
} as const;

const zoneSelect = {
  id: true,
  facilityId: true,
  buildingId: true,
  floorId: true,
  name: true,
  code: true,
  zoneType: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  archivedAt: true,
  archivedBy: true
} as const;

const roomSelect = {
  id: true,
  facilityId: true,
  buildingId: true,
  floorId: true,
  zoneId: true,
  name: true,
  code: true,
  roomNumber: true,
  roomType: true,
  clinicalCriticality: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  archivedAt: true,
  archivedBy: true
} as const;

const incidentSelect = {
  id: true,
  facilityId: true,
  buildingId: true,
  floorId: true,
  zoneId: true,
  roomId: true,
  name: true,
  code: true,
  incidentType: true,
  severity: true,
  reportedAt: true,
  resolvedAt: true,
  resolutionSummary: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  archivedAt: true,
  archivedBy: true
} as const;

const riskItemSelect = {
  id: true,
  facilityId: true,
  buildingId: true,
  floorId: true,
  zoneId: true,
  roomId: true,
  name: true,
  code: true,
  category: true,
  severity: true,
  score: true,
  scoreReason: true,
  sourceType: true,
  sourceReferenceId: true,
  isSystemGenerated: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  archivedAt: true,
  archivedBy: true
} as const;

const readinessScoreSelect = {
  id: true,
  facilityId: true,
  buildingId: true,
  floorId: true,
  calculatedAt: true,
  overallScore: true,
  infrastructureScore: true,
  coverageScore: true,
  supportScore: true,
  calculationVersion: true,
  scoreDetailsJson: true,
  coverageAssessmentCount: true,
  activeIncidentCount: true,
  activeRiskItemCount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  archivedAt: true,
  archivedBy: true
} as const;

type DbClient = Prisma.TransactionClient | typeof prisma;

function useDb(db?: DbClient) {
  return db ?? prisma;
}

export interface ReadinessRepositoryLike {
  withTransaction<T>(callback: (db: DbClient) => Promise<T>): Promise<T>;
  listFacilities(db?: DbClient): Promise<any[]>;
  listBuildings(facilityId?: string, db?: DbClient): Promise<any[]>;
  listFloors(facilityId?: string, buildingId?: string, db?: DbClient): Promise<any[]>;
  listZones(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient): Promise<any[]>;
  listRooms(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient): Promise<any[]>;
  listDevices(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient): Promise<any[]>;
  listNetworkCircuits(facilityId?: string, db?: DbClient): Promise<any[]>;
  listConnectivityMeasurements(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient): Promise<any[]>;
  listCoverageAssessments(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient): Promise<any[]>;
  listIncidents(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient): Promise<any[]>;
  listRiskItems(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient): Promise<any[]>;
  listReadinessScores(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient): Promise<any[]>;
  getFacility(id: string, db?: DbClient): Promise<any | null>;
  getBuilding(id: string, db?: DbClient): Promise<any | null>;
  getFloor(id: string, db?: DbClient): Promise<any | null>;
  getZone(id: string, db?: DbClient): Promise<any | null>;
  getRoom(id: string, db?: DbClient): Promise<any | null>;
  getIncident(id: string, db?: DbClient): Promise<any | null>;
  getRiskItem(id: string, db?: DbClient): Promise<any | null>;
  getReadinessScore(id: string, db?: DbClient): Promise<any | null>;
  createIncident(data: Prisma.IncidentUncheckedCreateInput, db?: DbClient): Promise<any>;
  updateIncident(id: string, data: Prisma.IncidentUncheckedUpdateInput, db?: DbClient): Promise<any>;
  createRiskItem(data: Prisma.RiskItemUncheckedCreateInput, db?: DbClient): Promise<any>;
  updateRiskItem(id: string, data: Prisma.RiskItemUncheckedUpdateInput, db?: DbClient): Promise<any>;
  archiveRiskItemsByScope(
    facilityId: string,
    buildingId: string | null,
    floorId: string | null,
    actorUserId: string | null,
    db?: DbClient
  ): Promise<void>;
  archiveReadinessScoresByScope(
    facilityId: string,
    buildingId: string | null,
    floorId: string | null,
    actorUserId: string | null,
    db?: DbClient
  ): Promise<void>;
  createReadinessScores(data: Prisma.ReadinessScoreUncheckedCreateInput[], db?: DbClient): Promise<void>;
  createRiskItems(data: Prisma.RiskItemUncheckedCreateInput[], db?: DbClient): Promise<void>;
}

export class ReadinessRepository implements ReadinessRepositoryLike {
  withTransaction<T>(callback: (db: DbClient) => Promise<T>) {
    return prisma.$transaction((db: Prisma.TransactionClient) => callback(db));
  }

  listFacilities(db?: DbClient) {
    return useDb(db).facility.findMany({
      where: activeWhere,
      orderBy: { name: "asc" },
      select: facilitySelect
    });
  }

  listBuildings(facilityId?: string, db?: DbClient) {
    return useDb(db).building.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }],
      select: buildingSelect
    });
  }

  listFloors(facilityId?: string, buildingId?: string, db?: DbClient) {
    return useDb(db).floor.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {}),
        ...(buildingId ? { buildingId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { buildingId: "asc" }, { floorNumber: "asc" }],
      select: floorSelect
    });
  }

  listZones(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient) {
    return useDb(db).zone.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { name: "asc" }],
      select: zoneSelect
    });
  }

  listRooms(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient) {
    return useDb(db).room.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { roomNumber: "asc" }, { name: "asc" }],
      select: roomSelect
    });
  }

  listDevices(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient) {
    return useDb(db).device.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        zoneId: true,
        roomId: true,
        deviceTypeId: true,
        name: true,
        code: true,
        lifecycleState: true,
        status: true
      }
    });
  }

  listNetworkCircuits(facilityId?: string, db?: DbClient) {
    return useDb(db).networkCircuit.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        facilityId: true,
        name: true,
        code: true,
        providerName: true,
        circuitIdentifier: true,
        bandwidthDownMbps: true,
        bandwidthUpMbps: true,
        serviceLevel: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        archivedAt: true,
        archivedBy: true
      }
    });
  }

  listConnectivityMeasurements(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient) {
    return useDb(db).connectivityMeasurement.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        networkCircuitId: true,
        accessPointId: true,
        source: true,
        measuredAt: true,
        downloadMbps: true,
        uploadMbps: true,
        latencyMs: true,
        packetLossPct: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        archivedAt: true,
        archivedBy: true
      }
    });
  }

  listCoverageAssessments(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient) {
    return useDb(db).coverageAssessment.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ aggregatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        scope: true,
        facilityId: true,
        buildingId: true,
        floorId: true,
        zoneId: true,
        roomId: true,
        wifiScanSessionId: true,
        band: true,
        sampleCount: true,
        averageRssi: true,
        strongestRssi: true,
        weakestRssi: true,
        coverageScore: true,
        confidenceScore: true,
        deadZoneSampleCount: true,
        poorSampleCount: true,
        scoreReason: true,
        aggregatedAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        archivedAt: true,
        archivedBy: true
      }
    });
  }

  listIncidents(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient) {
    return useDb(db).incident.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
      select: incidentSelect
    });
  }

  listRiskItems(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient) {
    return useDb(db).riskItem.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      select: riskItemSelect
    });
  }

  listReadinessScores(facilityId?: string, buildingId?: string, floorId?: string, db?: DbClient) {
    return useDb(db).readinessScore.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ calculatedAt: "desc" }, { createdAt: "desc" }],
      select: readinessScoreSelect
    });
  }

  getFacility(id: string, db?: DbClient) {
    return useDb(db).facility.findFirst({
      where: { id, archivedAt: null },
      select: facilitySelect
    });
  }

  getBuilding(id: string, db?: DbClient) {
    return useDb(db).building.findFirst({
      where: { id, archivedAt: null },
      select: buildingSelect
    });
  }

  getFloor(id: string, db?: DbClient) {
    return useDb(db).floor.findFirst({
      where: { id, archivedAt: null },
      select: floorSelect
    });
  }

  getZone(id: string, db?: DbClient) {
    return useDb(db).zone.findFirst({
      where: { id, archivedAt: null },
      select: zoneSelect
    });
  }

  getRoom(id: string, db?: DbClient) {
    return useDb(db).room.findFirst({
      where: { id, archivedAt: null },
      select: roomSelect
    });
  }

  getIncident(id: string, db?: DbClient) {
    return useDb(db).incident.findFirst({
      where: { id, archivedAt: null },
      select: incidentSelect
    });
  }

  getRiskItem(id: string, db?: DbClient) {
    return useDb(db).riskItem.findFirst({
      where: { id, archivedAt: null },
      select: riskItemSelect
    });
  }

  getReadinessScore(id: string, db?: DbClient) {
    return useDb(db).readinessScore.findFirst({
      where: { id, archivedAt: null },
      select: readinessScoreSelect
    });
  }

  createIncident(data: Prisma.IncidentUncheckedCreateInput, db?: DbClient) {
    return useDb(db).incident.create({ data, select: incidentSelect });
  }

  updateIncident(id: string, data: Prisma.IncidentUncheckedUpdateInput, db?: DbClient) {
    return useDb(db).incident.update({ where: { id }, data, select: incidentSelect });
  }

  createRiskItem(data: Prisma.RiskItemUncheckedCreateInput, db?: DbClient) {
    return useDb(db).riskItem.create({ data, select: riskItemSelect });
  }

  updateRiskItem(id: string, data: Prisma.RiskItemUncheckedUpdateInput, db?: DbClient) {
    return useDb(db).riskItem.update({ where: { id }, data, select: riskItemSelect });
  }

  archiveRiskItemsByScope(
    facilityId: string,
    buildingId: string | null,
    floorId: string | null,
    actorUserId: string | null,
    db?: DbClient
  ) {
    return useDb(db)
      .riskItem.updateMany({
        where: {
          ...activeWhere,
          facilityId,
          isSystemGenerated: true,
          ...(buildingId ? { buildingId } : {}),
          ...(floorId
            ? {
                OR: [{ floorId }, { floorId: null }]
              }
            : {})
        },
        data: {
          status: "archived",
          archivedAt: new Date(),
          archivedBy: actorUserId,
          updatedBy: actorUserId
        }
      })
      .then(() => undefined);
  }

  archiveReadinessScoresByScope(
    facilityId: string,
    buildingId: string | null,
    floorId: string | null,
    actorUserId: string | null,
    db?: DbClient
  ) {
    return useDb(db)
      .readinessScore.updateMany({
        where: {
          ...activeWhere,
          facilityId,
          ...(buildingId ? { buildingId } : {}),
          ...(floorId
            ? {
                OR: [{ floorId }, { floorId: null }]
              }
            : {})
        },
        data: {
          status: "archived",
          archivedAt: new Date(),
          archivedBy: actorUserId,
          updatedBy: actorUserId
        }
      })
      .then(() => undefined);
  }

  createReadinessScores(data: Prisma.ReadinessScoreUncheckedCreateInput[], db?: DbClient) {
    if (data.length === 0) {
      return Promise.resolve();
    }

    return useDb(db)
      .readinessScore.createMany({
        data
      })
      .then(() => undefined);
  }

  createRiskItems(data: Prisma.RiskItemUncheckedCreateInput[], db?: DbClient) {
    if (data.length === 0) {
      return Promise.resolve();
    }

    return useDb(db)
      .riskItem.createMany({
        data
      })
      .then(() => undefined);
  }
}

export type { DbClient };
