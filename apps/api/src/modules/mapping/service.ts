import {
  archiveCommandSchema,
  floorCanvasInputSchema,
  floorPlanVersionInputSchema,
  mapAnnotationInputSchema,
  spatialGeometryUpdateInputSchema
} from "@facility/contracts";
import { writeAuditEntry } from "../../lib/audit.js";
import { DomainError } from "../../lib/domain-error.js";
import { mapBuilding, mapFacility, mapFloor, mapRoom, mapZone } from "../../lib/mappers.js";
import { MappingRepository, type MappingRepositoryLike } from "./repository.js";

type AuditWriter = typeof writeAuditEntry;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function serializeGeometry(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return JSON.stringify(value);
}

function assertNonArchiveStatus(status: string | undefined) {
  if (status === "archived") {
    throw new DomainError("Archived status can only be set through the archive workflow.", 400);
  }
}

function mapFloorPlanVersion(record: any) {
  return {
    id: record.id,
    floorId: record.floorId,
    floorName: record.floor?.name ?? null,
    floorCode: record.floor?.code ?? null,
    name: record.name,
    versionLabel: record.versionLabel,
    assetUrl: record.assetUrl,
    canvasWidth: record.canvasWidth,
    canvasHeight: record.canvasHeight,
    source: record.source,
    isCurrent: record.isCurrent,
    status: record.status,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIso(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

function mapAnnotation(record: any) {
  return {
    id: record.id,
    floorId: record.floorId,
    floorName: record.floor?.name ?? null,
    floorCode: record.floor?.code ?? null,
    floorPlanVersionId: record.floorPlanVersionId,
    floorPlanVersionName: record.floorPlanVersion?.name ?? null,
    floorPlanVersionLabel: record.floorPlanVersion?.versionLabel ?? null,
    zoneId: record.zoneId,
    zoneName: record.zone?.name ?? null,
    roomId: record.roomId,
    roomName: record.room?.name ?? null,
    roomNumber: record.room?.roomNumber ?? null,
    title: record.title,
    annotationType: record.annotationType,
    severity: record.severity,
    geometry: parseJson(record.geometryJson),
    notes: record.notes,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIso(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

function buildFloorWorkspace(record: any, versions: any[], annotations: any[], zones: any[], rooms: any[]) {
  const currentPlanVersion = versions.find((version) => version.isCurrent) ?? null;

  return {
    ...mapFloor(record),
    currentPlanVersion: currentPlanVersion ? mapFloorPlanVersion(currentPlanVersion) : null,
    floorPlanVersions: versions.map((version) => mapFloorPlanVersion(version)),
    annotations: annotations.map((annotation) => mapAnnotation(annotation)),
    zones: zones.map((zone) => mapZone(zone)),
    rooms: rooms.map((room) => mapRoom(room))
  };
}

export interface MappingServiceOptions {
  auditWriter?: AuditWriter;
}

export class MappingService {
  constructor(
    private readonly repository: MappingRepositoryLike = new MappingRepository(),
    private readonly options: MappingServiceOptions = {}
  ) {}

  private get auditWriter() {
    return this.options.auditWriter ?? writeAuditEntry;
  }

  async getBootstrap(floorId?: string) {
    const [facilities, buildings, floors] = await Promise.all([
      this.repository.listFacilities(),
      this.repository.listBuildings(),
      this.repository.listFloors()
    ]);

    const selectedFloorId = floorId ?? floors[0]?.id ?? null;
    const selectedFloor = selectedFloorId ? await this.requireFloor(selectedFloorId) : null;

    const [zones, rooms, versions, annotations] = selectedFloorId
      ? await Promise.all([
          this.repository.listZones(selectedFloorId),
          this.repository.listRooms(selectedFloorId),
          this.repository.listFloorPlanVersions(selectedFloorId),
          this.repository.listAnnotations(selectedFloorId)
        ])
      : [[], [], [], []];

    return {
      summary: {
        facilities: facilities.length,
        buildings: buildings.length,
        floors: floors.length,
        zones: zones.length,
        rooms: rooms.length,
        floorPlanVersions: versions.length,
        annotations: annotations.length
      },
      selection: {
        floorId: selectedFloorId,
        facilityId: selectedFloor?.facilityId ?? null,
        buildingId: selectedFloor?.buildingId ?? null
      },
      lists: {
        facilities: facilities.map((record: any) => mapFacility(record)),
        buildings: buildings.map((record: any) => mapBuilding(record)),
        floors: floors.map((record: any) => mapFloor(record)),
        zones: zones.map((record: any) => mapZone(record)),
        rooms: rooms.map((record: any) => mapRoom(record)),
        floorPlanVersions: versions.map((record: any) => mapFloorPlanVersion(record)),
        annotations: annotations.map((record: any) => mapAnnotation(record))
      },
      floor: selectedFloor
        ? buildFloorWorkspace(selectedFloor, versions, annotations, zones, rooms)
        : null
    };
  }

  async updateFloorCanvas(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireFloor(id);
    const input = floorCanvasInputSchema.parse(payload);
    const updated = await this.repository.updateFloor(id, {
      ...(input.planImageUrl !== undefined ? { planImageUrl: input.planImageUrl } : {}),
      ...(input.canvasWidth !== undefined ? { canvasWidth: input.canvasWidth } : {}),
      ...(input.canvasHeight !== undefined ? { canvasHeight: input.canvasHeight } : {}),
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "floor.canvas.update",
      entityType: "floor",
      entityId: updated.id,
      summary: `Updated floor canvas for ${updated.name}.`,
      beforeState: mapFloor(existing),
      afterState: mapFloor(updated)
    });

    return mapFloor(updated);
  }

  async listFloorPlanVersions(floorId?: string) {
    const records = await this.repository.listFloorPlanVersions(floorId);
    return records.map((record: any) => mapFloorPlanVersion(record));
  }

  async getFloorPlanVersion(id: string) {
    const record = await this.requireFloorPlanVersion(id);
    return mapFloorPlanVersion(record);
  }

  async createFloorPlanVersion(payload: unknown, actorUserId?: string) {
    const input = floorPlanVersionInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const floor = await this.requireFloor(input.floorId);

    const created = await this.repository.withTransaction(async (db) => {
      const version = await this.repository.createFloorPlanVersion(
        {
          floorId: input.floorId,
          name: input.name,
          versionLabel: input.versionLabel ?? null,
          assetUrl: input.assetUrl ?? null,
          canvasWidth: input.canvasWidth ?? null,
          canvasHeight: input.canvasHeight ?? null,
          source: input.source,
          isCurrent: input.isCurrent,
          status: input.status,
          notes: input.notes ?? null,
          createdBy: actorUserId ?? null,
          updatedBy: actorUserId ?? null
        },
        db
      );

      if (version.isCurrent) {
        await this.repository.clearFloorPlanVersionCurrentFlags(input.floorId, version.id, db);
        await this.repository.updateFloor(
          input.floorId,
          {
            planImageUrl: version.assetUrl ?? null,
            canvasWidth: version.canvasWidth ?? null,
            canvasHeight: version.canvasHeight ?? null,
            updatedBy: actorUserId ?? null
          },
          db
        );
      }

      return version;
    });

    await this.auditWriter({
      actorUserId,
      action: "floor-plan-version.create",
      entityType: "floorPlanVersion",
      entityId: created.id,
      summary: `Created floor plan version ${created.name} for ${floor.name}.`,
      afterState: mapFloorPlanVersion(created)
    });

    return mapFloorPlanVersion(created);
  }

  async updateFloorPlanVersion(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireFloorPlanVersion(id);
    const input = floorPlanVersionInputSchema.partial().omit({ floorId: true }).parse(payload);
    assertNonArchiveStatus(input.status);

    const resultingIsCurrent = input.isCurrent === undefined ? existing.isCurrent : input.isCurrent;
    if (existing.isCurrent && input.isCurrent === false) {
      throw new DomainError("Promote another version or archive this version before clearing current.", 400);
    }

    const updated = await this.repository.withTransaction(async (db) => {
      const version = await this.repository.updateFloorPlanVersion(
        id,
        {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.versionLabel !== undefined ? { versionLabel: input.versionLabel } : {}),
          ...(input.assetUrl !== undefined ? { assetUrl: input.assetUrl } : {}),
          ...(input.canvasWidth !== undefined ? { canvasWidth: input.canvasWidth } : {}),
          ...(input.canvasHeight !== undefined ? { canvasHeight: input.canvasHeight } : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
          isCurrent: resultingIsCurrent,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedBy: actorUserId ?? null
        },
        db
      );

      if (resultingIsCurrent) {
        await this.repository.clearFloorPlanVersionCurrentFlags(version.floorId, version.id, db);
        await this.repository.updateFloor(
          version.floorId,
          {
            planImageUrl: version.assetUrl ?? null,
            canvasWidth: version.canvasWidth ?? null,
            canvasHeight: version.canvasHeight ?? null,
            updatedBy: actorUserId ?? null
          },
          db
        );
      }

      return version;
    });

    await this.auditWriter({
      actorUserId,
      action: "floor-plan-version.update",
      entityType: "floorPlanVersion",
      entityId: updated.id,
      summary: `Updated floor plan version ${updated.name}.`,
      beforeState: mapFloorPlanVersion(existing),
      afterState: mapFloorPlanVersion(updated)
    });

    return mapFloorPlanVersion(updated);
  }

  async archiveFloorPlanVersion(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireFloorPlanVersion(id);
    archiveCommandSchema.parse(payload ?? {});

    const updated = await this.repository.withTransaction(async (db) => {
      const archived = await this.repository.updateFloorPlanVersion(
        id,
        {
          status: "archived",
          isCurrent: false,
          archivedAt: new Date(),
          archivedBy: actorUserId ?? null,
          updatedBy: actorUserId ?? null
        },
        db
      );

      if (existing.isCurrent) {
        const candidate = (await this.repository.listFloorPlanVersions(existing.floorId, db)).find((record: any) => record.id !== id);
        if (candidate) {
          const promoted = await this.repository.updateFloorPlanVersion(
            candidate.id,
            {
              isCurrent: true,
              updatedBy: actorUserId ?? null
            },
            db
          );

          await this.repository.clearFloorPlanVersionCurrentFlags(existing.floorId, promoted.id, db);
          await this.repository.updateFloor(
            existing.floorId,
            {
              planImageUrl: promoted.assetUrl ?? null,
              canvasWidth: promoted.canvasWidth ?? null,
              canvasHeight: promoted.canvasHeight ?? null,
              updatedBy: actorUserId ?? null
            },
            db
          );
        } else {
          await this.repository.updateFloor(
            existing.floorId,
            {
              planImageUrl: null,
              canvasWidth: null,
              canvasHeight: null,
              updatedBy: actorUserId ?? null
            },
            db
          );
        }
      }

      return archived;
    });

    await this.auditWriter({
      actorUserId,
      action: "floor-plan-version.archive",
      entityType: "floorPlanVersion",
      entityId: updated.id,
      summary: `Archived floor plan version ${updated.name}.`,
      beforeState: mapFloorPlanVersion(existing),
      afterState: mapFloorPlanVersion(updated)
    });

    return mapFloorPlanVersion(updated);
  }

  async listAnnotations(floorId?: string) {
    const records = await this.repository.listAnnotations(floorId);
    return records.map((record: any) => mapAnnotation(record));
  }

  async getAnnotation(id: string) {
    const record = await this.requireAnnotation(id);
    return mapAnnotation(record);
  }

  async createAnnotation(payload: unknown, actorUserId?: string) {
    const input = mapAnnotationInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const scope = await this.resolveAnnotationScope({
      floorId: input.floorId,
      floorPlanVersionId: input.floorPlanVersionId ?? null,
      zoneId: input.zoneId ?? null,
      roomId: input.roomId ?? null
    });

    const created = await this.repository.createAnnotation({
      floorId: scope.floorId,
      floorPlanVersionId: scope.floorPlanVersionId,
      zoneId: scope.zoneId,
      roomId: scope.roomId,
      title: input.title,
      annotationType: input.annotationType,
      severity: input.severity ?? null,
      geometryJson: serializeGeometry(input.geometry) ?? "{}",
      notes: input.notes ?? null,
      status: input.status,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "map-annotation.create",
      entityType: "mapAnnotation",
      entityId: created.id,
      summary: `Created map annotation ${created.title}.`,
      afterState: mapAnnotation(created)
    });

    return mapAnnotation(created);
  }

  async updateAnnotation(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireAnnotation(id);
    const input = mapAnnotationInputSchema.partial().omit({ floorId: true }).parse(payload);
    assertNonArchiveStatus(input.status);
    const scope = await this.resolveAnnotationScope(
      {
        floorId: existing.floorId,
        floorPlanVersionId:
          input.floorPlanVersionId === undefined ? existing.floorPlanVersionId : input.floorPlanVersionId ?? null,
        zoneId: input.zoneId === undefined ? existing.zoneId : input.zoneId ?? null,
        roomId: input.roomId === undefined ? existing.roomId : input.roomId ?? null
      }
    );

    const updated = await this.repository.updateAnnotation(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.annotationType !== undefined ? { annotationType: input.annotationType } : {}),
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.geometry !== undefined ? { geometryJson: serializeGeometry(input.geometry) ?? "{}" } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      floorPlanVersionId: scope.floorPlanVersionId,
      zoneId: scope.zoneId,
      roomId: scope.roomId,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "map-annotation.update",
      entityType: "mapAnnotation",
      entityId: updated.id,
      summary: `Updated map annotation ${updated.title}.`,
      beforeState: mapAnnotation(existing),
      afterState: mapAnnotation(updated)
    });

    return mapAnnotation(updated);
  }

  async archiveAnnotation(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireAnnotation(id);
    archiveCommandSchema.parse(payload ?? {});
    const updated = await this.repository.updateAnnotation(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "map-annotation.archive",
      entityType: "mapAnnotation",
      entityId: updated.id,
      summary: `Archived map annotation ${updated.title}.`,
      beforeState: mapAnnotation(existing),
      afterState: mapAnnotation(updated)
    });

    return mapAnnotation(updated);
  }

  async updateZoneGeometry(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireZone(id);
    const input = spatialGeometryUpdateInputSchema.parse(payload);
    const updated = await this.repository.updateZone(id, {
      geometryJson: serializeGeometry(input.geometry),
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "zone.geometry.update",
      entityType: "zone",
      entityId: updated.id,
      summary: `Updated geometry for zone ${updated.name}.`,
      beforeState: mapZone(existing),
      afterState: mapZone(updated)
    });

    return mapZone(updated);
  }

  async updateRoomGeometry(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireRoom(id);
    const input = spatialGeometryUpdateInputSchema.parse(payload);
    const updated = await this.repository.updateRoom(id, {
      geometryJson: serializeGeometry(input.geometry),
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "room.geometry.update",
      entityType: "room",
      entityId: updated.id,
      summary: `Updated geometry for room ${updated.name}.`,
      beforeState: mapRoom(existing),
      afterState: mapRoom(updated)
    });

    return mapRoom(updated);
  }

  private async resolveAnnotationScope(input: {
    floorId: string;
    floorPlanVersionId: string | null;
    zoneId: string | null;
    roomId: string | null;
  }) {
    const floor = await this.requireFloor(input.floorId);
    let floorPlanVersionId = input.floorPlanVersionId;
    let zoneId = input.zoneId;
    let roomId = input.roomId;

    if (floorPlanVersionId) {
      const version = await this.requireFloorPlanVersion(floorPlanVersionId);
      if (version.floorId !== floor.id) {
        throw new DomainError("Floor plan version does not belong to the selected floor.", 409);
      }
    }

    if (zoneId) {
      const zone = await this.requireZone(zoneId);
      if (zone.floorId !== floor.id) {
        throw new DomainError("Zone does not belong to the selected floor.", 409);
      }
    }

    if (roomId) {
      const room = await this.requireRoom(roomId);
      if (room.floorId !== floor.id) {
        throw new DomainError("Room does not belong to the selected floor.", 409);
      }

      if (zoneId && room.zoneId && room.zoneId !== zoneId) {
        throw new DomainError("Room does not belong to the selected zone.", 409);
      }
    }

    if (zoneId && roomId) {
      const room = await this.requireRoom(roomId);
      if (room.zoneId && room.zoneId !== zoneId) {
        throw new DomainError("Room does not belong to the selected zone.", 409);
      }
    }

    return {
      floorId: floor.id,
      floorPlanVersionId,
      zoneId,
      roomId
    };
  }

  private async requireFloor(id: string) {
    const record = await this.repository.getFloor(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Floor not found.", 404);
    }

    return record;
  }

  private async requireZone(id: string) {
    const record = await this.repository.getZone(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Zone not found.", 404);
    }

    return record;
  }

  private async requireRoom(id: string) {
    const record = await this.repository.getRoom(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Room not found.", 404);
    }

    return record;
  }

  private async requireFloorPlanVersion(id: string) {
    const record = await this.repository.getFloorPlanVersion(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Floor plan version not found.", 404);
    }

    return record;
  }

  private async requireAnnotation(id: string) {
    const record = await this.repository.getAnnotation(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Annotation not found.", 404);
    }

    return record;
  }
}
