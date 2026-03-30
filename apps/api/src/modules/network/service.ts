import {
  accessPointInputSchema,
  archiveCommandSchema,
  connectivityMeasurementInputSchema,
  facilityInputSchema,
  networkCircuitInputSchema,
  networkProfileInputSchema
} from "@facility/contracts";
import { DomainError } from "../../lib/domain-error.js";
import { writeAuditEntry } from "../../lib/audit.js";
import { NetworkRepository, type NetworkRepositoryLike } from "./repository.js";

function serializeGeometry(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return JSON.stringify(value);
}

function toDecimalString(value: { toString(): string } | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" ? value : value.toString();
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

const circuitPatchSchema = networkCircuitInputSchema.partial().omit({ facilityId: true });
const profilePatchSchema = networkProfileInputSchema.partial().omit({ facilityId: true });
const accessPointPatchSchema = accessPointInputSchema.partial().omit({ facilityId: true });
const measurementPatchSchema = connectivityMeasurementInputSchema.partial().omit({ facilityId: true });

type NetworkInput = unknown;

function assertNonArchiveStatus(status: string | undefined) {
  if (status === "archived") {
    throw new DomainError("Archived status can only be set through the archive workflow.", 400);
  }
}

export class NetworkService {
  constructor(private readonly repository: NetworkRepositoryLike = new NetworkRepository()) {}

  async getBootstrap(facilityId?: string) {
    const [summary, facilities, circuits, profiles, accessPoints, measurements, locationOptions] = await Promise.all([
      this.repository.getSummary(facilityId),
      this.repository.listFacilities(),
      this.repository.listCircuits(facilityId),
      this.repository.listProfiles(facilityId),
      this.repository.listAccessPoints(facilityId),
      this.repository.listMeasurements(facilityId),
      this.repository.listLocationOptions(facilityId)
    ]);

    return {
      summary,
      lists: {
        facilities: facilities.map((facility: any) => ({
          id: facility.id,
          name: facility.name,
          code: facility.code
        })),
        circuits: circuits.map((record: any) => mapCircuit(record)),
        profiles: profiles.map((record: any) => mapProfile(record)),
        accessPoints: accessPoints.map((record: any) => mapAccessPoint(record)),
        measurements: measurements.map((record: any) => mapMeasurement(record))
      },
      locations: locationOptions
    };
  }

  async listCircuits(facilityId?: string) {
    const records = await this.repository.listCircuits(facilityId);
    return records.map((record: any) => mapCircuit(record));
  }

  async getCircuit(id: string) {
    const record = await this.requireCircuit(id);
    return mapCircuit(record);
  }

  async createCircuit(payload: NetworkInput, actorUserId?: string) {
    const input = networkCircuitInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    await this.requireFacility(input.facilityId);

    const created = await this.repository.createCircuit({
      facilityId: input.facilityId,
      name: input.name,
      code: input.code ?? null,
      providerName: input.providerName ?? null,
      circuitIdentifier: input.circuitIdentifier ?? null,
      bandwidthDownMbps: input.bandwidthDownMbps ?? null,
      bandwidthUpMbps: input.bandwidthUpMbps ?? null,
      serviceLevel: input.serviceLevel ?? null,
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "network-circuit.create",
      entityType: "networkCircuit",
      entityId: created.id,
      summary: `Created network circuit ${created.name}.`,
      afterState: mapCircuit(created)
    });

    return mapCircuit(created);
  }

  async updateCircuit(id: string, payload: NetworkInput, actorUserId?: string) {
    const existing = await this.requireCircuit(id);
    const input = circuitPatchSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const updated = await this.repository.updateCircuit(id, {
      name: input.name,
      code: input.code,
      providerName: input.providerName,
      circuitIdentifier: input.circuitIdentifier,
      bandwidthDownMbps: input.bandwidthDownMbps,
      bandwidthUpMbps: input.bandwidthUpMbps,
      serviceLevel: input.serviceLevel,
      status: input.status,
      notes: input.notes,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "network-circuit.update",
      entityType: "networkCircuit",
      entityId: updated.id,
      summary: `Updated network circuit ${updated.name}.`,
      beforeState: mapCircuit(existing),
      afterState: mapCircuit(updated)
    });

    return mapCircuit(updated);
  }

  async archiveCircuit(id: string, payload: NetworkInput, actorUserId?: string) {
    const existing = await this.requireCircuit(id);
    archiveCommandSchema.parse(payload ?? {});
    const updated = await this.repository.updateCircuit(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "network-circuit.archive",
      entityType: "networkCircuit",
      entityId: updated.id,
      summary: `Archived network circuit ${updated.name}.`,
      beforeState: mapCircuit(existing),
      afterState: mapCircuit(updated)
    });

    return mapCircuit(updated);
  }

  async listProfiles(facilityId?: string) {
    const records = await this.repository.listProfiles(facilityId);
    return records.map((record: any) => mapProfile(record));
  }

  async getProfile(id: string) {
    const record = await this.requireProfile(id);
    return mapProfile(record);
  }

  async createProfile(payload: NetworkInput, actorUserId?: string) {
    const input = networkProfileInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    await this.requireFacility(input.facilityId);

    const created = await this.repository.createProfile({
      facilityId: input.facilityId,
      name: input.name,
      code: input.code ?? null,
      networkType: input.networkType ?? null,
      vlanName: input.vlanName ?? null,
      subnetCidr: input.subnetCidr ?? null,
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "network-profile.create",
      entityType: "networkProfile",
      entityId: created.id,
      summary: `Created network profile ${created.name}.`,
      afterState: mapProfile(created)
    });

    return mapProfile(created);
  }

  async updateProfile(id: string, payload: NetworkInput, actorUserId?: string) {
    const existing = await this.requireProfile(id);
    const input = profilePatchSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const updated = await this.repository.updateProfile(id, {
      name: input.name,
      code: input.code,
      networkType: input.networkType,
      vlanName: input.vlanName,
      subnetCidr: input.subnetCidr,
      status: input.status,
      notes: input.notes,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "network-profile.update",
      entityType: "networkProfile",
      entityId: updated.id,
      summary: `Updated network profile ${updated.name}.`,
      beforeState: mapProfile(existing),
      afterState: mapProfile(updated)
    });

    return mapProfile(updated);
  }

  async archiveProfile(id: string, payload: NetworkInput, actorUserId?: string) {
    const existing = await this.requireProfile(id);
    archiveCommandSchema.parse(payload ?? {});
    const updated = await this.repository.updateProfile(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "network-profile.archive",
      entityType: "networkProfile",
      entityId: updated.id,
      summary: `Archived network profile ${updated.name}.`,
      beforeState: mapProfile(existing),
      afterState: mapProfile(updated)
    });

    return mapProfile(updated);
  }

  async listAccessPoints(facilityId?: string) {
    const records = await this.repository.listAccessPoints(facilityId);
    return records.map((record: any) => mapAccessPoint(record));
  }

  async getAccessPoint(id: string) {
    const record = await this.requireAccessPoint(id);
    return mapAccessPoint(record);
  }

  async createAccessPoint(payload: NetworkInput, actorUserId?: string) {
    const input = accessPointInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    await this.requireFacility(input.facilityId);
    if (input.networkProfileId) {
      await this.requireProfile(input.networkProfileId, input.facilityId);
    }
    const scope = await this.validateAccessPointScope({
      facilityId: input.facilityId,
      buildingId: input.buildingId ?? null,
      floorId: input.floorId ?? null,
      zoneId: input.zoneId ?? null,
      roomId: input.roomId ?? null
    });

    const created = await this.repository.createAccessPoint({
      facilityId: input.facilityId,
      buildingId: scope.buildingId,
      floorId: scope.floorId,
      zoneId: scope.zoneId,
      roomId: scope.roomId,
      networkProfileId: input.networkProfileId ?? null,
      name: input.name,
      code: input.code ?? null,
      model: input.model ?? null,
      macAddress: input.macAddress ?? null,
      geometryJson: serializeGeometry(input.geometry),
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "access-point.create",
      entityType: "accessPoint",
      entityId: created.id,
      summary: `Created access point ${created.name}.`,
      afterState: mapAccessPoint(created)
    });

    return mapAccessPoint(created);
  }

  async updateAccessPoint(id: string, payload: NetworkInput, actorUserId?: string) {
    const existing = await this.requireAccessPoint(id);
    const input = accessPointPatchSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const networkProfileId = input.networkProfileId === undefined ? existing.networkProfileId : input.networkProfileId;
    if (networkProfileId) {
      await this.requireProfile(networkProfileId, existing.facilityId);
    }
    const scope = await this.validateAccessPointScope({
      facilityId: existing.facilityId,
      buildingId: input.buildingId ?? existing.buildingId,
      floorId: input.floorId ?? existing.floorId,
      zoneId: input.zoneId ?? existing.zoneId,
      roomId: input.roomId ?? existing.roomId
    });

    const updated = await this.repository.updateAccessPoint(id, {
      buildingId: scope.buildingId,
      floorId: scope.floorId,
      zoneId: scope.zoneId,
      roomId: scope.roomId,
      networkProfileId,
      name: input.name,
      code: input.code,
      model: input.model,
      macAddress: input.macAddress,
      geometryJson: serializeGeometry(input.geometry),
      status: input.status,
      notes: input.notes,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "access-point.update",
      entityType: "accessPoint",
      entityId: updated.id,
      summary: `Updated access point ${updated.name}.`,
      beforeState: mapAccessPoint(existing),
      afterState: mapAccessPoint(updated)
    });

    return mapAccessPoint(updated);
  }

  async archiveAccessPoint(id: string, payload: NetworkInput, actorUserId?: string) {
    const existing = await this.requireAccessPoint(id);
    archiveCommandSchema.parse(payload ?? {});
    const updated = await this.repository.updateAccessPoint(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "access-point.archive",
      entityType: "accessPoint",
      entityId: updated.id,
      summary: `Archived access point ${updated.name}.`,
      beforeState: mapAccessPoint(existing),
      afterState: mapAccessPoint(updated)
    });

    return mapAccessPoint(updated);
  }

  async listMeasurements(facilityId?: string) {
    const records = await this.repository.listMeasurements(facilityId);
    return records.map((record: any) => mapMeasurement(record));
  }

  async getMeasurement(id: string) {
    const record = await this.requireMeasurement(id);
    return mapMeasurement(record);
  }

  async createMeasurement(payload: NetworkInput, actorUserId?: string) {
    const input = connectivityMeasurementInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    await this.requireFacility(input.facilityId);
    if (input.networkCircuitId) {
      await this.requireCircuit(input.networkCircuitId, input.facilityId);
    }

    if (input.accessPointId) {
      await this.requireAccessPoint(input.accessPointId, input.facilityId);
    }

    const created = await this.repository.createMeasurement({
      facilityId: input.facilityId,
      networkCircuitId: input.networkCircuitId ?? null,
      accessPointId: input.accessPointId ?? null,
      source: input.source,
      measuredAt: new Date(input.measuredAt),
      downloadMbps: input.downloadMbps ?? null,
      uploadMbps: input.uploadMbps ?? null,
      latencyMs: input.latencyMs ?? null,
      packetLossPct: input.packetLossPct ?? null,
      notes: input.notes ?? null,
      status: input.status,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "connectivity-measurement.create",
      entityType: "connectivityMeasurement",
      entityId: created.id,
      summary: `Created connectivity measurement for ${created.facilityId}.`,
      afterState: mapMeasurement(created)
    });

    return mapMeasurement(created);
  }

  async updateMeasurement(id: string, payload: NetworkInput, actorUserId?: string) {
    const existing = await this.requireMeasurement(id);
    const input = measurementPatchSchema.parse(payload);
    assertNonArchiveStatus(input.status);

    if (input.networkCircuitId) {
      await this.requireCircuit(input.networkCircuitId, existing.facilityId);
    }

    if (input.accessPointId) {
      await this.requireAccessPoint(input.accessPointId, existing.facilityId);
    }

    const updated = await this.repository.updateMeasurement(id, {
      networkCircuitId: input.networkCircuitId,
      accessPointId: input.accessPointId,
      source: input.source,
      measuredAt: input.measuredAt ? new Date(input.measuredAt) : undefined,
      downloadMbps: input.downloadMbps,
      uploadMbps: input.uploadMbps,
      latencyMs: input.latencyMs,
      packetLossPct: input.packetLossPct,
      notes: input.notes,
      status: input.status,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "connectivity-measurement.update",
      entityType: "connectivityMeasurement",
      entityId: updated.id,
      summary: `Updated connectivity measurement ${updated.id}.`,
      beforeState: mapMeasurement(existing),
      afterState: mapMeasurement(updated)
    });

    return mapMeasurement(updated);
  }

  async archiveMeasurement(id: string, payload: NetworkInput, actorUserId?: string) {
    const existing = await this.requireMeasurement(id);
    archiveCommandSchema.parse(payload ?? {});
    const updated = await this.repository.updateMeasurement(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "connectivity-measurement.archive",
      entityType: "connectivityMeasurement",
      entityId: updated.id,
      summary: `Archived connectivity measurement ${updated.id}.`,
      beforeState: mapMeasurement(existing),
      afterState: mapMeasurement(updated)
    });

    return mapMeasurement(updated);
  }

  private async requireFacility(id: string) {
    const record = await this.repository.getFacility(id);
    if (!record) {
      throw new DomainError("Facility not found.", 404);
    }
    return record;
  }

  private async requireCircuit(id: string, facilityId?: string) {
    const record = await this.repository.getCircuit(id);
    if (!record) {
      throw new DomainError("Network circuit not found.", 404);
    }
    if (facilityId && record.facilityId !== facilityId) {
      throw new DomainError("Network circuit does not belong to the selected facility.", 409);
    }
    return record;
  }

  private async requireProfile(id: string, facilityId?: string) {
    const record = await this.repository.getProfile(id);
    if (!record) {
      throw new DomainError("Network profile not found.", 404);
    }
    if (facilityId && record.facilityId !== facilityId) {
      throw new DomainError("Network profile does not belong to the selected facility.", 409);
    }
    return record;
  }

  private async requireAccessPoint(id: string, facilityId?: string) {
    const record = await this.repository.getAccessPoint(id);
    if (!record) {
      throw new DomainError("Access point not found.", 404);
    }
    if (facilityId && record.facilityId !== facilityId) {
      throw new DomainError("Access point does not belong to the selected facility.", 409);
    }
    return record;
  }

  private async requireMeasurement(id: string) {
    const record = await this.repository.getMeasurement(id);
    if (!record) {
      throw new DomainError("Connectivity measurement not found.", 404);
    }
    return record;
  }

  private async validateAccessPointScope(input: {
    facilityId: string;
    buildingId: string | null;
    floorId: string | null;
    zoneId: string | null;
    roomId: string | null;
  }) {
    const { facilityId, buildingId, floorId, zoneId, roomId } = input;
    let resolvedBuildingId = buildingId;
    let resolvedFloorId = floorId;
    let resolvedZoneId = zoneId;
    let resolvedRoomId = roomId;

    if (buildingId) {
      const building = await this.requireBuilding(buildingId);
      if (building.facilityId !== facilityId) {
        throw new DomainError("Building does not belong to the selected facility.", 409);
      }
    }

    if (floorId) {
      const floor = await this.requireFloor(floorId);
      if (floor.facilityId !== facilityId) {
        throw new DomainError("Floor does not belong to the selected facility.", 409);
      }
      if (buildingId && floor.buildingId !== buildingId) {
        throw new DomainError("Floor does not belong to the selected building.", 409);
      }
      resolvedBuildingId = resolvedBuildingId ?? floor.buildingId;
    }

    if (zoneId) {
      const zone = await this.requireZone(zoneId);
      if (zone.facilityId !== facilityId) {
        throw new DomainError("Zone does not belong to the selected facility.", 409);
      }
      if (floorId && zone.floorId !== floorId) {
        throw new DomainError("Zone does not belong to the selected floor.", 409);
      }
      resolvedBuildingId = resolvedBuildingId ?? zone.buildingId;
      resolvedFloorId = resolvedFloorId ?? zone.floorId;
    }

    if (roomId) {
      const room = await this.requireRoom(roomId);
      if (room.facilityId !== facilityId) {
        throw new DomainError("Room does not belong to the selected facility.", 409);
      }
      if (floorId && room.floorId !== floorId) {
        throw new DomainError("Room does not belong to the selected floor.", 409);
      }
      if (zoneId && room.zoneId !== zoneId) {
        throw new DomainError("Room does not belong to the selected zone.", 409);
      }
      resolvedBuildingId = resolvedBuildingId ?? room.buildingId;
      resolvedFloorId = resolvedFloorId ?? room.floorId;
      resolvedZoneId = resolvedZoneId ?? room.zoneId;
    }

    return {
      buildingId: resolvedBuildingId,
      floorId: resolvedFloorId,
      zoneId: resolvedZoneId,
      roomId: resolvedRoomId
    };
  }

  private async requireBuilding(id: string) {
    const record = await this.repository.getBuilding(id);
    if (!record) {
      throw new DomainError("Building not found.", 404);
    }
    return record;
  }

  private async requireFloor(id: string) {
    const record = await this.repository.getFloor(id);
    if (!record) {
      throw new DomainError("Floor not found.", 404);
    }
    return record;
  }

  private async requireZone(id: string) {
    const record = await this.repository.getZone(id);
    if (!record) {
      throw new DomainError("Zone not found.", 404);
    }
    return record;
  }

  private async requireRoom(id: string) {
    const record = await this.repository.getRoom(id);
    if (!record) {
      throw new DomainError("Room not found.", 404);
    }
    return record;
  }
}

function mapCircuit(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    facilityName: record.facility?.name ?? null,
    facilityCode: record.facility?.code ?? null,
    name: record.name,
    code: record.code,
    providerName: record.providerName,
    circuitIdentifier: record.circuitIdentifier,
    bandwidthDownMbps: toDecimalString(record.bandwidthDownMbps),
    bandwidthUpMbps: toDecimalString(record.bandwidthUpMbps),
    serviceLevel: record.serviceLevel,
    status: record.status,
    notes: record.notes,
    measurementCount: record._count?.measurements ?? 0,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIsoString(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

function mapProfile(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    facilityName: record.facility?.name ?? null,
    facilityCode: record.facility?.code ?? null,
    name: record.name,
    code: record.code,
    networkType: record.networkType,
    vlanName: record.vlanName,
    subnetCidr: record.subnetCidr,
    status: record.status,
    notes: record.notes,
    accessPointCount: record._count?.accessPoints ?? 0,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIsoString(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

function mapAccessPoint(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    facilityName: record.facility?.name ?? null,
    facilityCode: record.facility?.code ?? null,
    buildingId: record.buildingId,
    buildingName: record.building?.name ?? null,
    buildingCode: record.building?.code ?? null,
    floorId: record.floorId,
    floorName: record.floor ? `${record.floor.name}` : null,
    floorNumber: record.floor?.floorNumber ?? null,
    zoneId: record.zoneId,
    zoneName: record.zone?.name ?? null,
    zoneCode: record.zone?.code ?? null,
    roomId: record.roomId,
    roomName: record.room?.name ?? null,
    roomNumber: record.room?.roomNumber ?? null,
    networkProfileId: record.networkProfileId,
    networkProfileName: record.networkProfile?.name ?? null,
    networkProfileCode: record.networkProfile?.code ?? null,
    name: record.name,
    code: record.code,
    model: record.model,
    macAddress: record.macAddress,
    geometry: record.geometryJson ? safeJsonParse(record.geometryJson) : null,
    status: record.status,
    notes: record.notes,
    measurementCount: record._count?.measurements ?? 0,
    wifiSampleCount: record._count?.wifiSamples ?? 0,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIsoString(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

function mapMeasurement(record: any) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    facilityName: record.facility?.name ?? null,
    facilityCode: record.facility?.code ?? null,
    networkCircuitId: record.networkCircuitId,
    networkCircuitName: record.networkCircuit?.name ?? null,
    networkCircuitCode: record.networkCircuit?.code ?? null,
    accessPointId: record.accessPointId,
    accessPointName: record.accessPoint?.name ?? null,
    accessPointCode: record.accessPoint?.code ?? null,
    source: record.source,
    measuredAt: toIsoString(record.measuredAt),
    downloadMbps: toDecimalString(record.downloadMbps),
    uploadMbps: toDecimalString(record.uploadMbps),
    latencyMs: toDecimalString(record.latencyMs),
    packetLossPct: toDecimalString(record.packetLossPct),
    notes: record.notes,
    status: record.status,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIsoString(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
