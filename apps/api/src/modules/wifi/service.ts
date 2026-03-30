import {
  archiveCommandSchema,
  pointCoordinateSchema,
  wifiScanSampleImportInputSchema,
  wifiScanSampleInputSchema,
  wifiScanSessionInputSchema
} from "@facility/contracts";
import { writeAuditEntry } from "../../lib/audit.js";
import { DomainError } from "../../lib/domain-error.js";
import { WifiRepository, type DbClient, type WifiRepositoryLike } from "./repository.js";

type AuditWriter = typeof writeAuditEntry;

type LocationMaps = {
  floorLookup: Map<string, any>;
  zoneLookup: Map<string, any>;
  roomLookup: Map<string, any>;
};

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function decimalToNumber(value: { toString(): string } | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value.toString());
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

function serializeGeometry(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return JSON.stringify(value);
}

function serializeCoordinate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return { coordinateX: null, coordinateY: null };
  }

  const coordinate = pointCoordinateSchema.parse(value);
  return {
    coordinateX: coordinate.x,
    coordinateY: coordinate.y
  };
}

function assertNonArchiveStatus(status: string | undefined) {
  if (status === "archived") {
    throw new DomainError("Archived status can only be set through the archive workflow.", 400);
  }
}

function mapWifiSource(source: string) {
  switch (source) {
    case "manual":
      return "MANUAL";
    case "csv-import":
      return "CSV_IMPORT";
    case "android-companion":
      return "ANDROID_COMPANION";
    default:
      throw new DomainError("Unsupported Wi-Fi scan source.", 400);
  }
}

function mapWifiSourceFromDb(source: string) {
  switch (source) {
    case "MANUAL":
      return "manual";
    case "CSV_IMPORT":
      return "csv-import";
    case "ANDROID_COMPANION":
      return "android-companion";
    default:
      return source.toLowerCase();
  }
}

function mapWifiBand(band: string) {
  switch (band) {
    case "2.4ghz":
      return "BAND_2_4GHZ";
    case "5ghz":
      return "BAND_5GHZ";
    case "6ghz":
      return "BAND_6GHZ";
    case "unknown":
      return "UNKNOWN";
    default:
      throw new DomainError("Unsupported Wi-Fi band.", 400);
  }
}

function mapWifiBandFromDb(band: string) {
  switch (band) {
    case "BAND_2_4GHZ":
      return "2.4ghz";
    case "BAND_5GHZ":
      return "5ghz";
    case "BAND_6GHZ":
      return "6ghz";
    case "UNKNOWN":
      return "unknown";
    default:
      return band.toLowerCase();
  }
}

function mapFacility(record: any) {
  return {
    id: record.id,
    name: record.name,
    code: record.code
  };
}

function mapBuilding(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    name: record.name,
    code: record.code
  };
}

function mapFloor(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    name: record.name,
    code: record.code,
    floorNumber: record.floorNumber,
    planImageUrl: record.planImageUrl,
    canvasWidth: record.canvasWidth,
    canvasHeight: record.canvasHeight,
    status: record.status
  };
}

function mapZone(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorId: record.floorId,
    name: record.name,
    code: record.code,
    status: record.status
  };
}

function mapRoom(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorId: record.floorId,
    zoneId: record.zoneId,
    name: record.name,
    code: record.code,
    roomNumber: record.roomNumber,
    status: record.status
  };
}

function mapFloorContext(record: any) {
  return record
    ? {
        planImageUrl: record.planImageUrl,
        canvasWidth: record.canvasWidth,
        canvasHeight: record.canvasHeight
      }
    : null;
}

function mapAccessPoint(record: any, maps: LocationMaps) {
  const floor = maps.floorLookup.get(record.floorId) ?? null;
  const zone = record.zoneId ? maps.zoneLookup.get(record.zoneId) ?? null : null;

  return {
    id: record.id,
    facilityId: record.facilityId,
    facilityName: record.facility?.name ?? null,
    facilityCode: record.facility?.code ?? null,
    buildingId: record.buildingId,
    buildingName: record.building?.name ?? null,
    buildingCode: record.building?.code ?? null,
    floorId: record.floorId,
    floorName: floor?.name ?? null,
    floorCode: floor?.code ?? null,
    floorNumber: floor?.floorNumber ?? null,
    zoneId: record.zoneId,
    zoneName: zone?.name ?? null,
    zoneCode: zone?.code ?? null,
    roomId: record.roomId,
    roomName: record.room?.name ?? null,
    roomNumber: record.room?.roomNumber ?? null,
    name: record.name,
    code: record.code,
    model: record.model,
    macAddress: record.macAddress,
    geometry: parseJson(record.geometryJson),
    status: record.status,
    notes: record.notes,
    wifiSampleCount: record._count?.wifiSamples ?? 0,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIso(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

function mapSession(record: any, _maps?: LocationMaps) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    facilityName: record.facility?.name ?? null,
    facilityCode: record.facility?.code ?? null,
    buildingId: record.buildingId,
    buildingName: record.building?.name ?? null,
    buildingCode: record.building?.code ?? null,
    floorId: record.floorId,
    floorName: record.floor?.name ?? null,
    floorCode: record.floor?.code ?? null,
    floorNumber: record.floor?.floorNumber ?? null,
    zoneId: record.zoneId,
    zoneName: record.zone?.name ?? null,
    zoneCode: record.zone?.code ?? null,
    roomId: record.roomId,
    roomName: record.room?.name ?? null,
    roomNumber: record.room?.roomNumber ?? null,
    collectorUserId: record.collectorUserId,
    collectorDisplayName: record.collector?.displayName ?? null,
    collectorEmail: record.collector?.email ?? null,
    collectorDeviceLabel: record.collectorDeviceLabel,
    name: record.name,
    code: record.code,
    source: mapWifiSourceFromDb(record.source),
    startedAt: toIso(record.startedAt),
    endedAt: toIso(record.endedAt),
    status: record.status,
    notes: record.notes,
    sampleCount: record._count?.samples ?? 0,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIso(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

function mapSample(record: any, _maps?: LocationMaps) {
  return {
    id: record.id,
    wifiScanSessionId: record.wifiScanSessionId,
    wifiScanSessionName: record.session?.name ?? null,
    wifiScanSessionCode: record.session?.code ?? null,
    facilityId: record.facilityId,
    facilityName: record.facility?.name ?? null,
    facilityCode: record.facility?.code ?? null,
    buildingId: record.buildingId,
    buildingName: record.building?.name ?? null,
    buildingCode: record.building?.code ?? null,
    floorId: record.floorId,
    floorName: record.floor?.name ?? null,
    floorCode: record.floor?.code ?? null,
    floorNumber: record.floor?.floorNumber ?? null,
    zoneId: record.zoneId,
    zoneName: record.zone?.name ?? null,
    zoneCode: record.zone?.code ?? null,
    roomId: record.roomId,
    roomName: record.room?.name ?? null,
    roomNumber: record.room?.roomNumber ?? null,
    accessPointId: record.accessPointId,
    accessPointName: record.accessPoint?.name ?? null,
    accessPointCode: record.accessPoint?.code ?? null,
    ssid: record.ssid,
    bssid: record.bssid,
    rssi: record.rssi,
    frequencyMHz: record.frequencyMHz,
    channel: record.channel,
    band: mapWifiBandFromDb(record.band),
    sampledAt: toIso(record.sampledAt),
    coordinate:
      record.coordinateX === null || record.coordinateY === null
        ? null
        : {
            x: decimalToNumber(record.coordinateX),
            y: decimalToNumber(record.coordinateY)
          },
    status: record.status,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIso(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

function buildMaps(floors: any[], zones: any[], rooms: any[]): LocationMaps {
  return {
    floorLookup: new Map(floors.map((floor) => [floor.id, floor])),
    zoneLookup: new Map(zones.map((zone) => [zone.id, zone])),
    roomLookup: new Map(rooms.map((room) => [room.id, room]))
  };
}

export interface WifiServiceOptions {
  auditWriter?: AuditWriter;
}

export class WifiService {
  constructor(
    private readonly repository: WifiRepositoryLike = new WifiRepository(),
    private readonly options: WifiServiceOptions = {}
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

    let selectedFloor = null as any;
    let selectedFloorId = floorId ?? floors[0]?.id ?? null;

    if (selectedFloorId) {
      selectedFloor = await this.requireFloor(selectedFloorId);
      selectedFloorId = selectedFloor.id;
    }

    const [zones, rooms, accessPoints, sessions, samples, summary] = selectedFloorId
      ? await Promise.all([
          this.repository.listZones(selectedFloorId),
          this.repository.listRooms(selectedFloorId),
          this.repository.listAccessPoints(selectedFloorId),
          this.repository.listSessions(selectedFloorId),
          this.repository.listSamples(selectedFloorId),
          this.repository.getSummary(selectedFloorId)
        ])
      : [[], [], [], [], [], await this.repository.getSummary()];

    const maps = buildMaps(selectedFloorId ? [selectedFloor] : floors, zones, rooms);

    return {
      summary,
      selection: {
        facilityId: selectedFloor?.facilityId ?? null,
        buildingId: selectedFloor?.buildingId ?? null,
        floorId: selectedFloor?.id ?? null
      },
      floorContext: mapFloorContext(selectedFloor),
      lists: {
        facilities: facilities.map(mapFacility),
        buildings: buildings.map(mapBuilding),
        floors: floors.map(mapFloor),
        zones: zones.map(mapZone),
        rooms: rooms.map(mapRoom),
        accessPoints: accessPoints.map((record: any) => mapAccessPoint(record, maps)),
        sessions: sessions.map((record: any) => mapSession(record)),
        samples: samples.map((record: any) => mapSample(record))
      }
    };
  }

  async listSessions(floorId?: string) {
    const [records, floors, zones, rooms] = await Promise.all([
      this.repository.listSessions(floorId),
      this.repository.listFloors(),
      this.repository.listZones(floorId),
      this.repository.listRooms(floorId)
    ]);

    const maps = buildMaps(floors, zones, rooms);
    return records.map((record: any) => mapSession(record, maps));
  }

  async getSession(id: string) {
    const record = await this.requireSession(id);
    return mapSession(record);
  }

  async createSession(payload: unknown, actorUserId?: string) {
    const input = wifiScanSessionInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const scope = await this.resolveSessionScope({
      facilityId: input.facilityId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      zoneId: input.zoneId ?? null,
      roomId: input.roomId ?? null
    });

    const created = await this.repository.createSession({
      facilityId: scope.facilityId,
      buildingId: scope.buildingId,
      floorId: scope.floorId,
      zoneId: scope.zoneId,
      roomId: scope.roomId,
      collectorUserId: input.collectorUserId ?? null,
      collectorDeviceLabel: input.collectorDeviceLabel ?? null,
      name: input.name,
      code: input.code ?? null,
      startedAt: new Date(input.startedAt),
      endedAt: input.endedAt ? new Date(input.endedAt) : null,
      source: mapWifiSource(input.source),
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "wifi-session.create",
      entityType: "wifiScanSession",
      entityId: created.id,
      summary: `Created Wi-Fi scan session ${created.name}.`,
      afterState: mapSession(created)
    });

    return mapSession(created);
  }

  async updateSession(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireSession(id);
    const input = wifiScanSessionInputSchema.partial().parse(payload);
    assertNonArchiveStatus(input.status);

    const scope = await this.resolveSessionScope({
      facilityId: input.facilityId ?? existing.facilityId,
      buildingId: input.buildingId ?? existing.buildingId,
      floorId: input.floorId ?? existing.floorId,
      zoneId: input.zoneId === undefined ? existing.zoneId : input.zoneId ?? null,
      roomId: input.roomId === undefined ? existing.roomId : input.roomId ?? null
    });

    const updated = await this.repository.updateSession(id, {
      facilityId: scope.facilityId,
      buildingId: scope.buildingId,
      floorId: scope.floorId,
      zoneId: scope.zoneId,
      roomId: scope.roomId,
      ...(input.collectorUserId !== undefined ? { collectorUserId: input.collectorUserId } : {}),
      ...(input.collectorDeviceLabel !== undefined ? { collectorDeviceLabel: input.collectorDeviceLabel } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.startedAt !== undefined ? { startedAt: new Date(input.startedAt) } : {}),
      ...(input.endedAt !== undefined ? { endedAt: input.endedAt ? new Date(input.endedAt) : null } : {}),
      ...(input.source !== undefined ? { source: mapWifiSource(input.source) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "wifi-session.update",
      entityType: "wifiScanSession",
      entityId: updated.id,
      summary: `Updated Wi-Fi scan session ${updated.name}.`,
      beforeState: mapSession(existing),
      afterState: mapSession(updated)
    });

    return mapSession(updated);
  }

  async archiveSession(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireSession(id);
    archiveCommandSchema.parse(payload ?? {});

    const updated = await this.repository.updateSession(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "wifi-session.archive",
      entityType: "wifiScanSession",
      entityId: updated.id,
      summary: `Archived Wi-Fi scan session ${updated.name}.`,
      beforeState: mapSession(existing),
      afterState: mapSession(updated)
    });

    return mapSession(updated);
  }

  async listSamples(floorId?: string, sessionId?: string) {
    const [records, floors, zones, rooms] = await Promise.all([
      this.repository.listSamples(floorId, sessionId),
      this.repository.listFloors(),
      this.repository.listZones(floorId),
      this.repository.listRooms(floorId)
    ]);

    const maps = buildMaps(floors, zones, rooms);
    return records.map((record: any) => mapSample(record, maps));
  }

  async getSample(id: string) {
    const record = await this.requireSample(id);
    const [floors, zones, rooms] = await Promise.all([
      this.repository.listFloors(),
      this.repository.listZones(record.floorId),
      this.repository.listRooms(record.floorId)
    ]);

    return mapSample(record, buildMaps(floors, zones, rooms));
  }

  async createSample(payload: unknown, actorUserId?: string) {
    const input = wifiScanSampleInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const session = await this.requireSession(input.wifiScanSessionId);
    const scope = await this.resolveSampleScope(
      {
        facilityId: input.facilityId,
        buildingId: input.buildingId,
        floorId: input.floorId,
        zoneId: input.zoneId ?? null,
        roomId: input.roomId ?? null
      },
      session,
      input.accessPointId ?? null
    );

    const created = await this.repository.createSample({
      wifiScanSessionId: session.id,
      facilityId: scope.facilityId,
      buildingId: scope.buildingId,
      floorId: scope.floorId,
      zoneId: scope.zoneId,
      roomId: scope.roomId,
      accessPointId: input.accessPointId ?? null,
      ssid: input.ssid,
      bssid: input.bssid,
      rssi: input.rssi,
      frequencyMHz: input.frequencyMHz ?? null,
      channel: input.channel ?? null,
      band: mapWifiBand(input.band),
      sampledAt: new Date(input.sampledAt),
      coordinateX: input.coordinate ? input.coordinate.x : null,
      coordinateY: input.coordinate ? input.coordinate.y : null,
      status: input.status,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "wifi-sample.create",
      entityType: "wifiScanSample",
      entityId: created.id,
      summary: `Created Wi-Fi scan sample ${created.ssid}.`,
      afterState: mapSample(created, buildMaps([session.floor], [session.zone].filter(Boolean) as any[], [session.room].filter(Boolean) as any[]))
    });

    return mapSample(
      created,
      buildMaps([session.floor], [session.zone].filter(Boolean) as any[], [session.room].filter(Boolean) as any[])
    );
  }

  async updateSample(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireSample(id);
    const input = wifiScanSampleInputSchema.partial().parse(payload);
    assertNonArchiveStatus(input.status);

    const sessionId = input.wifiScanSessionId ?? existing.wifiScanSessionId;
    const session = await this.requireSession(sessionId);
    const scope = await this.resolveSampleScope(
      {
        facilityId: input.facilityId ?? existing.facilityId,
        buildingId: input.buildingId ?? existing.buildingId,
        floorId: input.floorId ?? existing.floorId,
        zoneId: input.zoneId === undefined ? existing.zoneId : input.zoneId ?? null,
        roomId: input.roomId === undefined ? existing.roomId : input.roomId ?? null
      },
      session,
      input.accessPointId === undefined ? existing.accessPointId : input.accessPointId ?? null
    );

    const updated = await this.repository.updateSample(id, {
      wifiScanSessionId: session.id,
      facilityId: scope.facilityId,
      buildingId: scope.buildingId,
      floorId: scope.floorId,
      zoneId: scope.zoneId,
      roomId: scope.roomId,
      ...(input.accessPointId !== undefined ? { accessPointId: input.accessPointId } : {}),
      ...(input.ssid !== undefined ? { ssid: input.ssid } : {}),
      ...(input.bssid !== undefined ? { bssid: input.bssid } : {}),
      ...(input.rssi !== undefined ? { rssi: input.rssi } : {}),
      ...(input.frequencyMHz !== undefined ? { frequencyMHz: input.frequencyMHz } : {}),
      ...(input.channel !== undefined ? { channel: input.channel } : {}),
      ...(input.band !== undefined ? { band: mapWifiBand(input.band) } : {}),
      ...(input.sampledAt !== undefined ? { sampledAt: new Date(input.sampledAt) } : {}),
      ...(input.coordinate !== undefined
        ? (() => {
            const serialized = serializeCoordinate(input.coordinate);
            return serialized ?? {};
          })()
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "wifi-sample.update",
      entityType: "wifiScanSample",
      entityId: updated.id,
      summary: `Updated Wi-Fi scan sample ${updated.ssid}.`,
      beforeState: mapSample(existing, buildMaps([session.floor], [session.zone].filter(Boolean) as any[], [session.room].filter(Boolean) as any[])),
      afterState: mapSample(updated, buildMaps([session.floor], [session.zone].filter(Boolean) as any[], [session.room].filter(Boolean) as any[]))
    });

    return mapSample(updated, buildMaps([session.floor], [session.zone].filter(Boolean) as any[], [session.room].filter(Boolean) as any[]));
  }

  async archiveSample(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireSample(id);
    archiveCommandSchema.parse(payload ?? {});

    const updated = await this.repository.updateSample(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    const session = await this.requireSession(updated.wifiScanSessionId);
    const maps = buildMaps([session.floor], [session.zone].filter(Boolean) as any[], [session.room].filter(Boolean) as any[]);

    await this.auditWriter({
      actorUserId,
      action: "wifi-sample.archive",
      entityType: "wifiScanSample",
      entityId: updated.id,
      summary: `Archived Wi-Fi scan sample ${updated.ssid}.`,
      beforeState: mapSample(existing, maps),
      afterState: mapSample(updated, maps)
    });

    return mapSample(updated, maps);
  }

  async importSamples(payload: unknown, actorUserId?: string) {
    const input = wifiScanSampleImportInputSchema.parse(payload);
    const session = await this.requireSession(input.wifiScanSessionId);
    const maps = buildMaps([session.floor], [session.zone].filter(Boolean) as any[], [session.room].filter(Boolean) as any[]);

    const created = await this.repository.withTransaction(async (db) => {
      const imported: any[] = [];

      for (const row of input.rows) {
        assertNonArchiveStatus(row.status);
        const scope = await this.resolveSampleScope(
          {
            facilityId: session.facilityId,
            buildingId: session.buildingId,
            floorId: session.floorId,
            zoneId: row.zoneId ?? null,
            roomId: row.roomId ?? null
          },
          session,
          row.accessPointId ?? null,
          db
        );

        const sample = await this.repository.createSample(
          {
            wifiScanSessionId: session.id,
            facilityId: scope.facilityId,
            buildingId: scope.buildingId,
            floorId: scope.floorId,
            zoneId: scope.zoneId,
            roomId: scope.roomId,
            accessPointId: row.accessPointId ?? null,
            ssid: row.ssid,
            bssid: row.bssid,
            rssi: row.rssi,
            frequencyMHz: row.frequencyMHz ?? null,
            channel: row.channel ?? null,
            band: mapWifiBand(row.band),
            sampledAt: new Date(row.sampledAt),
            coordinateX: row.coordinate ? row.coordinate.x : null,
            coordinateY: row.coordinate ? row.coordinate.y : null,
            status: row.status,
            createdBy: actorUserId ?? null,
            updatedBy: actorUserId ?? null
          },
          db
        );

        imported.push(sample);
      }

      return imported;
    });

    const refreshedSession = await this.requireSession(session.id);

    await this.auditWriter({
      actorUserId,
      action: "wifi-sample.import",
      entityType: "wifiScanSample",
      entityId: refreshedSession.id,
      summary: `Imported ${created.length} Wi-Fi scan samples for ${refreshedSession.name}.`,
      afterState: {
        wifiScanSessionId: refreshedSession.id,
        importedCount: created.length
      }
    });

    return {
      importedCount: created.length,
      session: mapSession(refreshedSession),
      samples: created.map((record) => mapSample(record, maps))
    };
  }

  private async resolveSessionScope(
    input: {
      facilityId: string;
      buildingId: string;
      floorId: string;
      zoneId: string | null;
      roomId: string | null;
    },
    db?: DbClient
  ) {
    const facility = await this.requireFacility(input.facilityId, db);
    const building = await this.requireBuilding(input.buildingId, db);
    const floor = await this.requireFloor(input.floorId, db);

    if (building.facilityId !== facility.id) {
      throw new DomainError("Building does not belong to the selected facility.", 409);
    }

    if (floor.facilityId !== facility.id) {
      throw new DomainError("Floor does not belong to the selected facility.", 409);
    }

    if (floor.buildingId !== building.id) {
      throw new DomainError("Floor does not belong to the selected building.", 409);
    }

    let zoneId = input.zoneId;
    let roomId = input.roomId;

    if (zoneId) {
      const zone = await this.requireZone(zoneId, db);
      if (zone.facilityId !== facility.id) {
        throw new DomainError("Zone does not belong to the selected facility.", 409);
      }
      if (zone.buildingId !== building.id) {
        throw new DomainError("Zone does not belong to the selected building.", 409);
      }
      if (zone.floorId !== floor.id) {
        throw new DomainError("Zone does not belong to the selected floor.", 409);
      }
    }

    if (roomId) {
      const room = await this.requireRoom(roomId, db);
      if (room.facilityId !== facility.id) {
        throw new DomainError("Room does not belong to the selected facility.", 409);
      }
      if (room.buildingId !== building.id) {
        throw new DomainError("Room does not belong to the selected building.", 409);
      }
      if (room.floorId !== floor.id) {
        throw new DomainError("Room does not belong to the selected floor.", 409);
      }
      if (zoneId && room.zoneId !== zoneId) {
        throw new DomainError("Room does not belong to the selected zone.", 409);
      }
    }

    return {
      facilityId: facility.id,
      buildingId: building.id,
      floorId: floor.id,
      zoneId,
      roomId
    };
  }

  private async resolveSampleScope(
    input: {
      facilityId: string;
      buildingId: string;
      floorId: string;
      zoneId: string | null;
      roomId: string | null;
    },
    session: any,
    accessPointId: string | null,
    db?: DbClient
  ) {
    const scope = await this.resolveSessionScope(input, db);

    if (session.facilityId !== scope.facilityId || session.buildingId !== scope.buildingId || session.floorId !== scope.floorId) {
      throw new DomainError("Sample scope does not match the selected session.", 409);
    }

    if (accessPointId) {
      const accessPoint = await this.requireAccessPoint(accessPointId, db);
      if (accessPoint.facilityId !== scope.facilityId) {
        throw new DomainError("Access point does not belong to the selected facility.", 409);
      }
      if (accessPoint.floorId !== scope.floorId) {
        throw new DomainError("Access point does not belong to the selected floor.", 409);
      }
    }

    return scope;
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

  private async requireAccessPoint(id: string, db?: DbClient) {
    const record = await this.repository.getAccessPoint(id, db);
    if (!record) {
      throw new DomainError("Access point not found.", 404);
    }
    return record;
  }

  private async requireSession(id: string, db?: DbClient) {
    const record = await this.repository.getSession(id, db);
    if (!record || record.archivedAt) {
      throw new DomainError("Wi-Fi scan session not found.", 404);
    }
    return record;
  }

  private async requireSample(id: string, db?: DbClient) {
    const record = await this.repository.getSample(id, db);
    if (!record || record.archivedAt) {
      throw new DomainError("Wi-Fi scan sample not found.", 404);
    }
    return record;
  }
}
