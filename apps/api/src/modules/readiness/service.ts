import {
  archiveCommandSchema,
  incidentInputSchema,
  readinessRecalculationCommandSchema,
  riskItemInputSchema
} from "@facility/contracts";
import { Prisma } from "@facility/db";
import {
  calculateReadiness,
  type DerivedRiskItemDraft,
  type ReadinessCalculationInput,
  type ReadinessScoreDraft
} from "@facility/jobs";
import { writeAuditEntry } from "../../lib/audit.js";
import { DomainError } from "../../lib/domain-error.js";
import { ReadinessRepository, type DbClient, type ReadinessRepositoryLike } from "./repository.js";

type AuditWriter = typeof writeAuditEntry;

type LocationRecord = {
  id: string;
  name: string;
  code: string | null;
};

type BuildingRecord = LocationRecord & {
  facilityId: string;
};

type FloorRecord = LocationRecord & {
  facilityId: string;
  buildingId: string;
  floorNumber: number;
  planImageUrl: string | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
};

type ZoneRecord = LocationRecord & {
  facilityId: string;
  buildingId: string;
  floorId: string;
};

type RoomRecord = LocationRecord & {
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  roomNumber: string | null;
  clinicalCriticality: string | null;
};

type LocationLookups = {
  facilities: Map<string, LocationRecord>;
  buildings: Map<string, BuildingRecord>;
  floors: Map<string, FloorRecord>;
  zones: Map<string, ZoneRecord>;
  rooms: Map<string, RoomRecord>;
};

type ResolvedScope = {
  facility: any;
  building: any | null;
  floor: any | null;
  zone: any | null;
  room: any | null;
};

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function decimalToNumber(value: { toString(): string } | string | number | null | undefined) {
  return value === null || value === undefined ? null : Number(value.toString());
}

function parseJson(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toDecimal(value: number | null | undefined) {
  return value === null || value === undefined ? null : new Prisma.Decimal(value);
}

function assertNotArchivedStatus(status: string | undefined) {
  if (status === "archived") {
    throw new DomainError("Archived status can only be set through the archive workflow.", 400);
  }
}

function mapFacilityRef(record: any) {
  return {
    id: record.id,
    name: record.name,
    code: record.code ?? null
  };
}

function mapBuildingRef(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    name: record.name,
    code: record.code ?? null
  };
}

function mapFloorRef(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    name: record.name,
    code: record.code ?? null,
    floorNumber: record.floorNumber,
    planImageUrl: record.planImageUrl ?? null,
    canvasWidth: record.canvasWidth ?? null,
    canvasHeight: record.canvasHeight ?? null
  };
}

function mapZoneRef(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorId: record.floorId,
    name: record.name,
    code: record.code ?? null
  };
}

function mapRoomRef(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorId: record.floorId,
    zoneId: record.zoneId ?? null,
    name: record.name,
    code: record.code ?? null,
    roomNumber: record.roomNumber ?? null,
    clinicalCriticality: record.clinicalCriticality ?? null
  };
}

function createLocationLookups(input: {
  facilities: any[];
  buildings: any[];
  floors: any[];
  zones: any[];
  rooms: any[];
}): LocationLookups {
  return {
    facilities: new Map(input.facilities.map((record) => [record.id, mapFacilityRef(record)])),
    buildings: new Map(input.buildings.map((record) => [record.id, mapBuildingRef(record)])),
    floors: new Map(input.floors.map((record) => [record.id, mapFloorRef(record)])),
    zones: new Map(input.zones.map((record) => [record.id, mapZoneRef(record)])),
    rooms: new Map(input.rooms.map((record) => [record.id, mapRoomRef(record)]))
  };
}

function mapIncident(record: any, lookups: LocationLookups) {
  const facility = lookups.facilities.get(record.facilityId);
  const building = record.buildingId ? lookups.buildings.get(record.buildingId) : null;
  const floor = record.floorId ? lookups.floors.get(record.floorId) : null;
  const zone = record.zoneId ? lookups.zones.get(record.zoneId) : null;
  const room = record.roomId ? lookups.rooms.get(record.roomId) : null;

  return {
    id: record.id,
    facilityId: record.facilityId,
    facilityName: facility?.name ?? null,
    facilityCode: facility?.code ?? null,
    buildingId: record.buildingId ?? null,
    buildingName: building?.name ?? null,
    buildingCode: building?.code ?? null,
    floorId: record.floorId ?? null,
    floorName: floor?.name ?? null,
    floorCode: floor?.code ?? null,
    zoneId: record.zoneId ?? null,
    zoneName: zone?.name ?? null,
    zoneCode: zone?.code ?? null,
    roomId: record.roomId ?? null,
    roomName: room?.name ?? null,
    roomNumber: room?.roomNumber ?? null,
    name: record.name,
    code: record.code ?? null,
    incidentType: record.incidentType ?? null,
    severity: record.severity,
    reportedAt: toIso(record.reportedAt),
    resolvedAt: toIso(record.resolvedAt),
    resolutionSummary: record.resolutionSummary ?? null,
    status: record.status,
    notes: record.notes ?? null,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
    archivedAt: toIso(record.archivedAt),
    archivedBy: record.archivedBy ?? null
  };
}

function mapRiskItem(record: any, lookups: LocationLookups) {
  const facility = lookups.facilities.get(record.facilityId);
  const building = record.buildingId ? lookups.buildings.get(record.buildingId) : null;
  const floor = record.floorId ? lookups.floors.get(record.floorId) : null;
  const zone = record.zoneId ? lookups.zones.get(record.zoneId) : null;
  const room = record.roomId ? lookups.rooms.get(record.roomId) : null;

  return {
    id: record.id,
    facilityId: record.facilityId,
    facilityName: facility?.name ?? null,
    facilityCode: facility?.code ?? null,
    buildingId: record.buildingId ?? null,
    buildingName: building?.name ?? null,
    buildingCode: building?.code ?? null,
    floorId: record.floorId ?? null,
    floorName: floor?.name ?? null,
    floorCode: floor?.code ?? null,
    zoneId: record.zoneId ?? null,
    zoneName: zone?.name ?? null,
    zoneCode: zone?.code ?? null,
    roomId: record.roomId ?? null,
    roomName: room?.name ?? null,
    roomNumber: room?.roomNumber ?? null,
    name: record.name,
    code: record.code ?? null,
    category: record.category,
    severity: record.severity,
    score: decimalToNumber(record.score),
    scoreReason: record.scoreReason ?? null,
    sourceType: record.sourceType ?? "manual",
    sourceReferenceId: record.sourceReferenceId ?? null,
    isSystemGenerated: record.isSystemGenerated,
    status: record.status,
    notes: record.notes ?? null,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
    archivedAt: toIso(record.archivedAt),
    archivedBy: record.archivedBy ?? null
  };
}

function mapReadinessScore(record: any, lookups: LocationLookups) {
  const facility = lookups.facilities.get(record.facilityId);
  const building = record.buildingId ? lookups.buildings.get(record.buildingId) : null;
  const floor = record.floorId ? lookups.floors.get(record.floorId) : null;
  const score = decimalToNumber(record.overallScore);
  const calculatedAt = toIso(record.calculatedAt);

  return {
    id: record.id,
    facilityId: record.facilityId,
    facilityName: facility?.name ?? null,
    facilityCode: facility?.code ?? null,
    buildingId: record.buildingId ?? null,
    buildingName: building?.name ?? null,
    buildingCode: building?.code ?? null,
    floorId: record.floorId ?? null,
    floorName: floor?.name ?? null,
    floorCode: floor?.code ?? null,
    calculatedAt,
    recalculatedAt: calculatedAt,
    score,
    overallScore: score,
    infrastructureScore: decimalToNumber(record.infrastructureScore),
    coverageScore: decimalToNumber(record.coverageScore),
    supportScore: decimalToNumber(record.supportScore),
    calculationVersion: record.calculationVersion ?? null,
    scoreDetails: parseJson(record.scoreDetailsJson),
    coverageAssessmentCount: record.coverageAssessmentCount,
    activeIncidentCount: record.activeIncidentCount,
    activeRiskItemCount: record.activeRiskItemCount,
    status: record.status,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
    archivedAt: toIso(record.archivedAt),
    archivedBy: record.archivedBy ?? null
  };
}

function buildReadinessScoreCreateInput(score: ReadinessScoreDraft, actorUserId?: string): Prisma.ReadinessScoreUncheckedCreateInput {
  return {
    facilityId: score.facilityId,
    buildingId: score.buildingId,
    floorId: score.floorId,
    calculatedAt: new Date(score.calculatedAt),
    overallScore: new Prisma.Decimal(score.overallScore),
    infrastructureScore: new Prisma.Decimal(score.infrastructureScore),
    coverageScore: new Prisma.Decimal(score.coverageScore),
    supportScore: new Prisma.Decimal(score.supportScore),
    calculationVersion: score.calculationVersion,
    scoreDetailsJson: JSON.stringify(score.scoreDetails),
    coverageAssessmentCount: score.coverageAssessmentCount,
    activeIncidentCount: score.activeIncidentCount,
    activeRiskItemCount: score.activeRiskItemCount,
    status: "active",
    createdBy: actorUserId ?? null,
    updatedBy: actorUserId ?? null
  };
}

function buildDerivedRiskItemCreateInput(riskItem: DerivedRiskItemDraft, actorUserId?: string): Prisma.RiskItemUncheckedCreateInput {
  return {
    facilityId: riskItem.facilityId,
    buildingId: riskItem.buildingId,
    floorId: riskItem.floorId,
    zoneId: riskItem.zoneId,
    roomId: riskItem.roomId,
    name: riskItem.name,
    code: riskItem.code,
    category: riskItem.category,
    severity: riskItem.severity,
    score: toDecimal(riskItem.score),
    scoreReason: riskItem.scoreReason,
    sourceType: riskItem.sourceType,
    sourceReferenceId: riskItem.sourceReferenceId,
    isSystemGenerated: true,
    status: "active",
    notes: null,
    createdBy: actorUserId ?? null,
    updatedBy: actorUserId ?? null
  };
}

function toCoverageScope(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "facility") {
    return "facility";
  }
  if (normalized === "floor") {
    return "floor";
  }
  if (normalized === "zone") {
    return "zone";
  }
  if (normalized === "room") {
    return "room";
  }
  throw new DomainError("Unsupported coverage assessment scope.", 500);
}

function toCoverageBand(value: string) {
  const normalized = value.toLowerCase().replaceAll("_", "-");
  if (normalized === "excellent" || normalized === "good" || normalized === "fair" || normalized === "poor" || normalized === "dead-zone") {
    return normalized;
  }
  throw new DomainError("Unsupported coverage assessment band.", 500);
}

export interface ReadinessServiceOptions {
  auditWriter?: AuditWriter;
}

export class ReadinessService {
  constructor(
    private readonly repository: ReadinessRepositoryLike = new ReadinessRepository(),
    private readonly options: ReadinessServiceOptions = {}
  ) {}

  private get auditWriter() {
    return this.options.auditWriter ?? writeAuditEntry;
  }

  async getBootstrap(facilityId?: string, buildingId?: string, floorId?: string) {
    const facilities = await this.repository.listFacilities();
    let selectedFacility = facilityId ? await this.requireFacility(facilityId) : facilities[0] ?? null;
    let selectedBuilding = buildingId ? await this.requireBuilding(buildingId) : null;
    let selectedFloor = floorId ? await this.requireFloor(floorId) : null;

    if (selectedFloor) {
      selectedFacility ??= await this.requireFacility(selectedFloor.facilityId);
      if (selectedFloor.facilityId !== selectedFacility.id) {
        throw new DomainError("Floor does not belong to the selected facility.", 409);
      }
      selectedBuilding ??= await this.requireBuilding(selectedFloor.buildingId);
      if (selectedBuilding.facilityId !== selectedFacility.id) {
        throw new DomainError("Building does not belong to the selected facility.", 409);
      }
      if (selectedFloor.buildingId !== selectedBuilding.id) {
        throw new DomainError("Floor does not belong to the selected building.", 409);
      }
    }

    if (selectedBuilding) {
      selectedFacility ??= await this.requireFacility(selectedBuilding.facilityId);
      if (selectedBuilding.facilityId !== selectedFacility.id) {
        throw new DomainError("Building does not belong to the selected facility.", 409);
      }
    }

    if (selectedFacility && !selectedBuilding) {
      const facilityBuildings = await this.repository.listBuildings(selectedFacility.id);
      selectedBuilding = facilityBuildings[0] ?? null;
    }

    if (selectedFacility && selectedBuilding && !selectedFloor) {
      const buildingFloors = await this.repository.listFloors(selectedFacility.id, selectedBuilding.id);
      selectedFloor = buildingFloors[0] ?? null;
    }

    const scopeFacilityId = selectedFacility?.id ?? null;
    const scopeBuildingId = selectedBuilding?.id ?? null;
    const scopeFloorId = selectedFloor?.id ?? null;

    const [buildings, floors, zones, rooms, incidents, riskItems, readinessScores] = scopeFacilityId
      ? await Promise.all([
          this.repository.listBuildings(scopeFacilityId),
          this.repository.listFloors(scopeFacilityId, scopeBuildingId ?? undefined),
          this.repository.listZones(scopeFacilityId, scopeBuildingId ?? undefined, scopeFloorId ?? undefined),
          this.repository.listRooms(scopeFacilityId, scopeBuildingId ?? undefined, scopeFloorId ?? undefined),
          this.repository.listIncidents(scopeFacilityId, scopeBuildingId ?? undefined, scopeFloorId ?? undefined),
          this.repository.listRiskItems(scopeFacilityId, scopeBuildingId ?? undefined, scopeFloorId ?? undefined),
          this.repository.listReadinessScores(scopeFacilityId, scopeBuildingId ?? undefined, scopeFloorId ?? undefined)
        ])
      : [[], [], [], [], [], [], []];

    const lookups = createLocationLookups({
      facilities,
      buildings,
      floors,
      zones,
      rooms
    });
    const mappedIncidents = incidents.map((record) => mapIncident(record, lookups));
    const mappedRiskItems = riskItems.map((record) => mapRiskItem(record, lookups));
    const mappedReadinessScores = readinessScores.map((record) => mapReadinessScore(record, lookups));
    const latestScore = mappedReadinessScores[0] ?? null;

    return {
      summary: {
        facilities: facilities.length,
        buildings: buildings.length,
        floors: floors.length,
        zones: zones.length,
        rooms: rooms.length,
        incidents: mappedIncidents.length,
        riskItems: mappedRiskItems.length,
        activeIncidents: mappedIncidents.filter((record) => record.status === "active").length,
        activeRiskItems: mappedRiskItems.filter((record) => record.status === "active").length,
        criticalRiskItems: mappedRiskItems.filter((record) => record.status === "active" && record.severity === "critical").length,
        manualRiskItems: mappedRiskItems.filter((record) => !record.isSystemGenerated && record.status !== "archived").length,
        systemRiskItems: mappedRiskItems.filter((record) => record.isSystemGenerated && record.status !== "archived").length,
        readinessScores: mappedReadinessScores.length,
        recalculations: mappedReadinessScores.length,
        latestOverallScore: latestScore?.score ?? null
      },
      selection: {
        facilityId: scopeFacilityId,
        buildingId: scopeBuildingId,
        floorId: scopeFloorId
      },
      currentFloorContext: selectedFloor
        ? {
            planImageUrl: selectedFloor.planImageUrl ?? null,
            canvasWidth: selectedFloor.canvasWidth ?? null,
            canvasHeight: selectedFloor.canvasHeight ?? null
          }
        : null,
      latestReadinessScore: latestScore,
      lists: {
        incidents: mappedIncidents,
        riskItems: mappedRiskItems,
        readinessScores: mappedReadinessScores
      }
    };
  }

  async listIncidents(facilityId?: string, buildingId?: string, floorId?: string) {
    const [records, lookups] = await Promise.all([
      this.repository.listIncidents(facilityId, buildingId, floorId),
      this.buildLocationLookups(facilityId, buildingId, floorId)
    ]);

    return records.map((record) => mapIncident(record, lookups));
  }

  async getIncident(id: string) {
    const record = await this.requireIncident(id);
    const lookups = await this.buildLocationLookups(record.facilityId, record.buildingId ?? undefined, record.floorId ?? undefined);
    return mapIncident(record, lookups);
  }

  async createIncident(payload: unknown, actorUserId?: string) {
    const input = incidentInputSchema.parse(payload);
    assertNotArchivedStatus(input.status);
    const scope = await this.resolveScope({
      facilityId: input.facilityId,
      buildingId: input.buildingId ?? null,
      floorId: input.floorId ?? null,
      zoneId: input.zoneId ?? null,
      roomId: input.roomId ?? null
    });

    const created = await this.repository.createIncident({
      facilityId: scope.facility.id,
      buildingId: scope.building?.id ?? null,
      floorId: scope.floor?.id ?? null,
      zoneId: scope.zone?.id ?? null,
      roomId: scope.room?.id ?? null,
      name: input.name,
      code: input.code ?? null,
      incidentType: input.incidentType ?? null,
      severity: input.severity,
      reportedAt: new Date(input.reportedAt),
      resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null,
      resolutionSummary: input.resolutionSummary ?? null,
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });
    const response = mapIncident(created, await this.buildLocationLookups(scope.facility.id, scope.building?.id ?? undefined, scope.floor?.id ?? undefined));

    await this.auditWriter({
      actorUserId,
      action: "incident.create",
      entityType: "incident",
      entityId: created.id,
      summary: `Created incident ${created.name}.`,
      afterState: response
    });

    return response;
  }

  async updateIncident(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireIncident(id);
    const existingResponse = await this.getIncident(id);
    const input = incidentInputSchema.partial().parse(payload);
    assertNotArchivedStatus(input.status);
    const scope = await this.resolveScope({
      facilityId: input.facilityId ?? existing.facilityId,
      buildingId: input.buildingId === undefined ? existing.buildingId : input.buildingId ?? null,
      floorId: input.floorId === undefined ? existing.floorId : input.floorId ?? null,
      zoneId: input.zoneId === undefined ? existing.zoneId : input.zoneId ?? null,
      roomId: input.roomId === undefined ? existing.roomId : input.roomId ?? null
    });

    await this.repository.updateIncident(id, {
      facilityId: scope.facility.id,
      buildingId: scope.building?.id ?? null,
      floorId: scope.floor?.id ?? null,
      zoneId: scope.zone?.id ?? null,
      roomId: scope.room?.id ?? null,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.incidentType !== undefined ? { incidentType: input.incidentType } : {}),
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.reportedAt !== undefined ? { reportedAt: new Date(input.reportedAt) } : {}),
      ...(input.resolvedAt !== undefined ? { resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null } : {}),
      ...(input.resolutionSummary !== undefined ? { resolutionSummary: input.resolutionSummary } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedBy: actorUserId ?? null
    });
    const response = await this.getIncident(id);

    await this.auditWriter({
      actorUserId,
      action: "incident.update",
      entityType: "incident",
      entityId: id,
      summary: `Updated incident ${response.name}.`,
      beforeState: existingResponse,
      afterState: response
    });

    return response;
  }

  async archiveIncident(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireIncident(id);
    const existingResponse = await this.getIncident(id);
    archiveCommandSchema.parse(payload ?? {});

    await this.repository.updateIncident(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });
    const response = await this.getIncident(id);

    await this.auditWriter({
      actorUserId,
      action: "incident.archive",
      entityType: "incident",
      entityId: id,
      summary: `Archived incident ${existing.name}.`,
      beforeState: existingResponse,
      afterState: response
    });

    return response;
  }

  async listRiskItems(facilityId?: string, buildingId?: string, floorId?: string) {
    const [records, lookups] = await Promise.all([
      this.repository.listRiskItems(facilityId, buildingId, floorId),
      this.buildLocationLookups(facilityId, buildingId, floorId)
    ]);

    return records.map((record) => mapRiskItem(record, lookups));
  }

  async getRiskItem(id: string) {
    const record = await this.requireRiskItem(id);
    const lookups = await this.buildLocationLookups(record.facilityId, record.buildingId ?? undefined, record.floorId ?? undefined);
    return mapRiskItem(record, lookups);
  }

  async createRiskItem(payload: unknown, actorUserId?: string) {
    const input = riskItemInputSchema.parse(payload);
    assertNotArchivedStatus(input.status);
    this.assertManualRiskItemCommand(input);
    const scope = await this.resolveScope({
      facilityId: input.facilityId,
      buildingId: input.buildingId ?? null,
      floorId: input.floorId ?? null,
      zoneId: input.zoneId ?? null,
      roomId: input.roomId ?? null
    });

    const created = await this.repository.createRiskItem({
      facilityId: scope.facility.id,
      buildingId: scope.building?.id ?? null,
      floorId: scope.floor?.id ?? null,
      zoneId: scope.zone?.id ?? null,
      roomId: scope.room?.id ?? null,
      name: input.name,
      code: input.code ?? null,
      category: input.category,
      severity: input.severity,
      score: toDecimal(input.score ?? null),
      scoreReason: input.scoreReason ?? null,
      sourceType: "manual",
      sourceReferenceId: input.sourceReferenceId ?? null,
      isSystemGenerated: false,
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });
    const response = mapRiskItem(created, await this.buildLocationLookups(scope.facility.id, scope.building?.id ?? undefined, scope.floor?.id ?? undefined));

    await this.auditWriter({
      actorUserId,
      action: "risk-item.create",
      entityType: "riskItem",
      entityId: created.id,
      summary: `Created risk item ${created.name}.`,
      afterState: response
    });

    return response;
  }

  async updateRiskItem(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireRiskItem(id);
    if (existing.isSystemGenerated) {
      throw new DomainError("System-generated risk items are managed through recalculation.", 409);
    }

    const existingResponse = await this.getRiskItem(id);
    const input = riskItemInputSchema.partial().parse(payload);
    assertNotArchivedStatus(input.status);
    this.assertManualRiskItemCommand({
      sourceType: input.sourceType ?? "manual",
      isSystemGenerated: input.isSystemGenerated ?? false
    });
    const scope = await this.resolveScope({
      facilityId: input.facilityId ?? existing.facilityId,
      buildingId: input.buildingId === undefined ? existing.buildingId : input.buildingId ?? null,
      floorId: input.floorId === undefined ? existing.floorId : input.floorId ?? null,
      zoneId: input.zoneId === undefined ? existing.zoneId : input.zoneId ?? null,
      roomId: input.roomId === undefined ? existing.roomId : input.roomId ?? null
    });

    await this.repository.updateRiskItem(id, {
      facilityId: scope.facility.id,
      buildingId: scope.building?.id ?? null,
      floorId: scope.floor?.id ?? null,
      zoneId: scope.zone?.id ?? null,
      roomId: scope.room?.id ?? null,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.score !== undefined ? { score: toDecimal(input.score) } : {}),
      ...(input.scoreReason !== undefined ? { scoreReason: input.scoreReason } : {}),
      sourceType: "manual",
      sourceReferenceId: input.sourceReferenceId !== undefined ? input.sourceReferenceId : existing.sourceReferenceId,
      isSystemGenerated: false,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedBy: actorUserId ?? null
    });
    const response = await this.getRiskItem(id);

    await this.auditWriter({
      actorUserId,
      action: "risk-item.update",
      entityType: "riskItem",
      entityId: id,
      summary: `Updated risk item ${response.name}.`,
      beforeState: existingResponse,
      afterState: response
    });

    return response;
  }

  async archiveRiskItem(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireRiskItem(id);
    if (existing.isSystemGenerated) {
      throw new DomainError("System-generated risk items are managed through recalculation.", 409);
    }

    const existingResponse = await this.getRiskItem(id);
    archiveCommandSchema.parse(payload ?? {});

    await this.repository.updateRiskItem(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });
    const response = await this.getRiskItem(id);

    await this.auditWriter({
      actorUserId,
      action: "risk-item.archive",
      entityType: "riskItem",
      entityId: id,
      summary: `Archived risk item ${existing.name}.`,
      beforeState: existingResponse,
      afterState: response
    });

    return response;
  }

  async listReadinessScores(facilityId?: string, buildingId?: string, floorId?: string) {
    const [records, lookups] = await Promise.all([
      this.repository.listReadinessScores(facilityId, buildingId, floorId),
      this.buildLocationLookups(facilityId, buildingId, floorId)
    ]);

    return records.map((record) => mapReadinessScore(record, lookups));
  }

  async getReadinessScore(id: string) {
    const record = await this.requireReadinessScore(id);
    const lookups = await this.buildLocationLookups(record.facilityId, record.buildingId ?? undefined, record.floorId ?? undefined);
    return mapReadinessScore(record, lookups);
  }

  async recalculateReadiness(payload: unknown, actorUserId?: string) {
    const input = readinessRecalculationCommandSchema.parse(payload);
    const scope = await this.resolveScope({
      facilityId: input.facilityId,
      buildingId: input.buildingId ?? null,
      floorId: input.floorId ?? null,
      zoneId: null,
      roomId: null
    });

    const [rooms, devices, networkCircuits, connectivityMeasurements, coverageAssessments, incidents, riskItems] = await Promise.all([
      this.repository.listRooms(scope.facility.id, scope.building?.id ?? undefined, scope.floor?.id ?? undefined),
      this.repository.listDevices(scope.facility.id, scope.building?.id ?? undefined, scope.floor?.id ?? undefined),
      this.repository.listNetworkCircuits(scope.facility.id),
      this.repository.listConnectivityMeasurements(scope.facility.id, scope.building?.id ?? undefined, scope.floor?.id ?? undefined),
      this.repository.listCoverageAssessments(scope.facility.id, scope.building?.id ?? undefined, scope.floor?.id ?? undefined),
      this.repository.listIncidents(scope.facility.id, scope.building?.id ?? undefined, scope.floor?.id ?? undefined),
      this.repository.listRiskItems(scope.facility.id, scope.building?.id ?? undefined, scope.floor?.id ?? undefined)
    ]);

    const calculationInput: ReadinessCalculationInput = {
      facilityId: scope.facility.id,
      buildingId: scope.building?.id ?? null,
      floorId: scope.floor?.id ?? null,
      rooms: rooms.map((record) => ({
        id: record.id,
        facilityId: record.facilityId,
        buildingId: record.buildingId,
        floorId: record.floorId,
        zoneId: record.zoneId ?? null,
        name: record.name,
        code: record.code ?? null,
        roomNumber: record.roomNumber ?? null,
        clinicalCriticality: record.clinicalCriticality ?? null
      })),
      devices: devices.map((record) => ({
        id: record.id,
        facilityId: record.facilityId,
        buildingId: record.buildingId ?? null,
        floorId: record.floorId ?? null,
        zoneId: record.zoneId ?? null,
        roomId: record.roomId ?? null
      })),
      networkCircuits: networkCircuits.map((record) => ({
        id: record.id,
        facilityId: record.facilityId,
        bandwidthDownMbps: decimalToNumber(record.bandwidthDownMbps),
        bandwidthUpMbps: decimalToNumber(record.bandwidthUpMbps)
      })),
      connectivityMeasurements: connectivityMeasurements.map((record) => ({
        id: record.id,
        facilityId: record.facilityId,
        buildingId: record.buildingId ?? null,
        floorId: record.floorId ?? null,
        downloadMbps: decimalToNumber(record.downloadMbps),
        uploadMbps: decimalToNumber(record.uploadMbps),
        latencyMs: decimalToNumber(record.latencyMs),
        packetLossPct: decimalToNumber(record.packetLossPct),
        measuredAt: toIso(record.measuredAt) ?? new Date().toISOString()
      })),
      coverageAssessments: coverageAssessments.map((record) => ({
        id: record.id,
        scope: toCoverageScope(String(record.scope)),
        facilityId: record.facilityId,
        buildingId: record.buildingId ?? null,
        floorId: record.floorId ?? null,
        zoneId: record.zoneId ?? null,
        roomId: record.roomId ?? null,
        band: toCoverageBand(String(record.band)),
        coverageScore: decimalToNumber(record.coverageScore),
        confidenceScore: decimalToNumber(record.confidenceScore),
        scoreReason: record.scoreReason ?? null,
        aggregatedAt: toIso(record.aggregatedAt) ?? new Date().toISOString(),
        status: record.status
      })),
      incidents: incidents.map((record) => ({
        id: record.id,
        facilityId: record.facilityId,
        buildingId: record.buildingId ?? null,
        floorId: record.floorId ?? null,
        zoneId: record.zoneId ?? null,
        roomId: record.roomId ?? null,
        severity: record.severity,
        status: record.status
      })),
      manualRiskItems: riskItems.map((record) => ({
        id: record.id,
        facilityId: record.facilityId,
        buildingId: record.buildingId ?? null,
        floorId: record.floorId ?? null,
        zoneId: record.zoneId ?? null,
        roomId: record.roomId ?? null,
        severity: record.severity,
        score: decimalToNumber(record.score),
        status: record.status,
        isSystemGenerated: record.isSystemGenerated
      })),
      calculatedAt: new Date().toISOString()
    };

    const result = calculateReadiness(calculationInput);

    await this.repository.withTransaction(async (db) => {
      await this.repository.archiveReadinessScoresByScope(
        scope.facility.id,
        scope.building?.id ?? null,
        scope.floor?.id ?? null,
        actorUserId ?? null,
        db
      );

      if (input.archiveExistingSystemRiskItems) {
        await this.repository.archiveRiskItemsByScope(
          scope.facility.id,
          scope.building?.id ?? null,
          scope.floor?.id ?? null,
          actorUserId ?? null,
          db
        );
      }

      await this.repository.createReadinessScores(
        result.readinessScores.map((score) => buildReadinessScoreCreateInput(score, actorUserId)),
        db
      );

      await this.repository.createRiskItems(
        result.derivedRiskItems.map((riskItem) => buildDerivedRiskItemCreateInput(riskItem, actorUserId)),
        db
      );
    });

    await this.auditWriter({
      actorUserId,
      action: "readiness.recalculate",
      entityType: "readinessScore",
      entityId: scope.floor?.id ?? scope.building?.id ?? scope.facility.id,
      summary: `Recalculated readiness for ${this.describeScope(scope)}.`,
      afterState: {
        scope: {
          facilityId: scope.facility.id,
          buildingId: scope.building?.id ?? null,
          floorId: scope.floor?.id ?? null
        },
        summary: result.summary,
        readinessScores: result.readinessScores.length,
        derivedRiskItems: result.derivedRiskItems.length
      }
    });

    return {
      scope: {
        facility: mapFacilityRef(scope.facility),
        building: scope.building ? mapBuildingRef(scope.building) : null,
        floor: scope.floor ? mapFloorRef(scope.floor) : null
      },
      summary: result.summary,
      readinessScores: result.readinessScores.map((score) => ({
        ...score,
        score: score.overallScore,
        recalculatedAt: score.calculatedAt
      })),
      derivedRiskItems: result.derivedRiskItems
    };
  }

  private async buildLocationLookups(facilityId?: string, buildingId?: string, floorId?: string) {
    const [facilities, buildings, floors, zones, rooms] = await Promise.all([
      this.repository.listFacilities(),
      this.repository.listBuildings(facilityId),
      this.repository.listFloors(facilityId, buildingId),
      this.repository.listZones(facilityId, buildingId, floorId),
      this.repository.listRooms(facilityId, buildingId, floorId)
    ]);

    return createLocationLookups({
      facilities,
      buildings,
      floors,
      zones,
      rooms
    });
  }

  private async resolveScope(
    input: {
      facilityId: string;
      buildingId: string | null;
      floorId: string | null;
      zoneId: string | null;
      roomId: string | null;
    },
    db?: DbClient
  ): Promise<ResolvedScope> {
    const facility = await this.requireFacility(input.facilityId, db);
    let building = input.buildingId ? await this.requireBuilding(input.buildingId, db) : null;
    let floor = input.floorId ? await this.requireFloor(input.floorId, db) : null;
    let zone = input.zoneId ? await this.requireZone(input.zoneId, db) : null;
    let room = input.roomId ? await this.requireRoom(input.roomId, db) : null;

    if (building && building.facilityId !== facility.id) {
      throw new DomainError("Building does not belong to the selected facility.", 409);
    }

    if (floor && floor.facilityId !== facility.id) {
      throw new DomainError("Floor does not belong to the selected facility.", 409);
    }

    if (zone && zone.facilityId !== facility.id) {
      throw new DomainError("Zone does not belong to the selected facility.", 409);
    }

    if (room && room.facilityId !== facility.id) {
      throw new DomainError("Room does not belong to the selected facility.", 409);
    }

    if (floor) {
      building ??= await this.requireBuilding(floor.buildingId, db);
    }

    if (zone) {
      building ??= await this.requireBuilding(zone.buildingId, db);
      floor ??= await this.requireFloor(zone.floorId, db);
      if (zone.buildingId !== building.id) {
        throw new DomainError("Zone does not belong to the selected building.", 409);
      }
      if (zone.floorId !== floor.id) {
        throw new DomainError("Zone does not belong to the selected floor.", 409);
      }
    }

    if (room) {
      building ??= await this.requireBuilding(room.buildingId, db);
      floor ??= await this.requireFloor(room.floorId, db);
      zone ??= room.zoneId ? await this.requireZone(room.zoneId, db) : null;
      if (room.buildingId !== building.id) {
        throw new DomainError("Room does not belong to the selected building.", 409);
      }
      if (room.floorId !== floor.id) {
        throw new DomainError("Room does not belong to the selected floor.", 409);
      }
      if (zone && room.zoneId !== zone.id) {
        throw new DomainError("Room does not belong to the selected zone.", 409);
      }
    }

    if (building && building.facilityId !== facility.id) {
      throw new DomainError("Building does not belong to the selected facility.", 409);
    }

    if (floor && floor.buildingId !== building?.id) {
      throw new DomainError("Floor does not belong to the selected building.", 409);
    }

    return { facility, building, floor, zone, room };
  }

  private async requireFacility(id: string, db?: DbClient) {
    const record = await this.repository.getFacility(id, db);
    if (!record) {
      throw new DomainError("Facility not found.", 404);
    }
    return record;
  }

  private async requireBuilding(id: string, db?: DbClient) {
    const record = await this.repository.getBuilding(id, db);
    if (!record) {
      throw new DomainError("Building not found.", 404);
    }
    return record;
  }

  private async requireFloor(id: string, db?: DbClient) {
    const record = await this.repository.getFloor(id, db);
    if (!record) {
      throw new DomainError("Floor not found.", 404);
    }
    return record;
  }

  private async requireZone(id: string, db?: DbClient) {
    const record = await this.repository.getZone(id, db);
    if (!record) {
      throw new DomainError("Zone not found.", 404);
    }
    return record;
  }

  private async requireRoom(id: string, db?: DbClient) {
    const record = await this.repository.getRoom(id, db);
    if (!record) {
      throw new DomainError("Room not found.", 404);
    }
    return record;
  }

  private async requireIncident(id: string, db?: DbClient) {
    const record = await this.repository.getIncident(id, db);
    if (!record || record.archivedAt) {
      throw new DomainError("Incident not found.", 404);
    }
    return record;
  }

  private async requireRiskItem(id: string, db?: DbClient) {
    const record = await this.repository.getRiskItem(id, db);
    if (!record || record.archivedAt) {
      throw new DomainError("Risk item not found.", 404);
    }
    return record;
  }

  private async requireReadinessScore(id: string, db?: DbClient) {
    const record = await this.repository.getReadinessScore(id, db);
    if (!record || record.archivedAt) {
      throw new DomainError("Readiness score not found.", 404);
    }
    return record;
  }

  private assertManualRiskItemCommand(input: { sourceType?: string; isSystemGenerated?: boolean }) {
    if ((input.sourceType ?? "manual") !== "manual" || (input.isSystemGenerated ?? false)) {
      throw new DomainError("Manual risk item endpoints only support manual records.", 400);
    }
  }

  private describeScope(scope: ResolvedScope) {
    if (scope.floor) {
      return `floor ${scope.floor.name}`;
    }
    if (scope.building) {
      return `building ${scope.building.name}`;
    }
    return `facility ${scope.facility.name}`;
  }
}
