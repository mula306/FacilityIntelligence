import { deviceInputSchema, deviceTypeInputSchema } from "@facility/contracts";
import { writeAuditEntry } from "../../lib/audit.js";
import { DomainError } from "../../lib/domain-error.js";
import type {
  InventoryBuildingRecord,
  InventoryContactRecord,
  InventoryDeviceRecord,
  InventoryDeviceTypeRecord,
  InventoryFacilityRecord,
  InventoryFloorRecord,
  InventoryRepository,
  InventoryRoomRecord,
  InventoryZoneRecord
} from "./repository.js";

type LocationMaps = {
  facilityNameById: Map<string, string>;
  buildingNameById: Map<string, string>;
  floorNameById: Map<string, string>;
  zoneNameById: Map<string, string>;
  roomNameById: Map<string, string>;
};

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function assertNonArchiveStatus(status: string | undefined) {
  if (status === "archived") {
    throw new DomainError("Archived status can only be set through the archive workflow.", 400);
  }
}

function mapFacility(record: InventoryFacilityRecord) {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    status: record.status,
    archivedAt: toIso(record.archivedAt),
    updatedAt: record.updatedAt.toISOString()
  };
}

function mapBuilding(record: InventoryBuildingRecord) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    name: record.name,
    code: record.code,
    status: record.status,
    archivedAt: toIso(record.archivedAt)
  };
}

function mapFloor(record: InventoryFloorRecord) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    name: record.name,
    code: record.code,
    floorNumber: record.floorNumber,
    status: record.status,
    archivedAt: toIso(record.archivedAt)
  };
}

function mapZone(record: InventoryZoneRecord) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorId: record.floorId,
    name: record.name,
    code: record.code,
    status: record.status,
    archivedAt: toIso(record.archivedAt)
  };
}

function mapRoom(record: InventoryRoomRecord) {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorId: record.floorId,
    zoneId: record.zoneId,
    name: record.name,
    code: record.code,
    roomNumber: record.roomNumber,
    roomType: record.roomType,
    status: record.status,
    archivedAt: toIso(record.archivedAt)
  };
}

function mapDeviceType(record: InventoryDeviceTypeRecord) {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    notes: record.notes,
    manufacturer: record.manufacturer,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    archivedAt: toIso(record.archivedAt),
    deviceCount: record.devices.length
  };
}

function mapDevice(record: InventoryDeviceRecord, maps: LocationMaps) {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    facilityId: record.facilityId,
    facilityName: maps.facilityNameById.get(record.facilityId) ?? record.facility.name,
    buildingId: record.buildingId,
    buildingName: record.buildingId ? maps.buildingNameById.get(record.buildingId) ?? record.building?.name ?? null : null,
    floorId: record.floorId,
    floorName: record.floorId ? maps.floorNameById.get(record.floorId) ?? null : null,
    zoneId: record.zoneId,
    zoneName: record.zoneId ? maps.zoneNameById.get(record.zoneId) ?? null : null,
    roomId: record.roomId,
    roomName: record.roomId ? maps.roomNameById.get(record.roomId) ?? record.room?.name ?? null : null,
    deviceTypeId: record.deviceTypeId,
    deviceTypeName: record.deviceType.name,
    hostname: record.hostname,
    serialNumber: record.serialNumber,
    assetTag: record.assetTag,
    ipAddress: record.ipAddress,
    macAddress: record.macAddress,
    lifecycleState: record.lifecycleState,
    ownerContactId: record.ownerContactId,
    notes: record.notes,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    archivedAt: toIso(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

export interface InventoryServiceOptions {
  auditWriter?: typeof writeAuditEntry;
}

export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly options: InventoryServiceOptions = {}
  ) {}

  private get auditWriter() {
    return this.options.auditWriter ?? writeAuditEntry;
  }

  async getBootstrap() {
    const [deviceTypes, devices, facilities, buildings, floors, zones, rooms] = await Promise.all([
      this.repository.listDeviceTypes(),
      this.repository.listDevices(),
      this.repository.listFacilities(),
      this.repository.listBuildings(),
      this.repository.listFloors(),
      this.repository.listZones(),
      this.repository.listRooms()
    ]);

    const maps = this.buildLocationMaps(facilities, buildings, floors, zones, rooms);

    return {
      summary: {
        deviceTypes: deviceTypes.length,
        devices: devices.length,
        facilities: facilities.length,
        buildings: buildings.length,
        floors: floors.length,
        zones: zones.length,
        rooms: rooms.length
      },
      lists: {
        deviceTypes: deviceTypes.map((record: InventoryDeviceTypeRecord) => mapDeviceType(record)),
        devices: devices.map((record: InventoryDeviceRecord) => mapDevice(record, maps)),
        facilities: facilities.map((record: InventoryFacilityRecord) => mapFacility(record)),
        buildings: buildings.map((record: InventoryBuildingRecord) => mapBuilding(record)),
        floors: floors.map((record: InventoryFloorRecord) => mapFloor(record)),
        zones: zones.map((record: InventoryZoneRecord) => mapZone(record)),
        rooms: rooms.map((record: InventoryRoomRecord) => mapRoom(record))
      }
    };
  }

  async listDeviceTypes() {
    const records = await this.repository.listDeviceTypes();
    return records.map((record: InventoryDeviceTypeRecord) => mapDeviceType(record));
  }

  async getDeviceType(id: string) {
    const record = await this.requireDeviceType(id);
    return mapDeviceType(record);
  }

  async createDeviceType(payload: unknown, actorUserId?: string) {
    const input = deviceTypeInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const created = await this.repository.createDeviceType({
      name: input.name,
      code: input.code ?? null,
      notes: input.notes ?? null,
      manufacturer: input.manufacturer ?? null,
      status: input.status,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "device-type.create",
      entityType: "device-type",
      entityId: created.id,
      summary: `Created device type ${created.name}.`
    });

    return mapDeviceType(await this.requireDeviceType(created.id));
  }

  async updateDeviceType(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireDeviceType(id);
    const input = deviceTypeInputSchema.partial().parse(payload);
    assertNonArchiveStatus(input.status);
    const updated = await this.repository.updateDeviceType(id, {
      name: input.name,
      code: input.code,
      notes: input.notes,
      manufacturer: input.manufacturer,
      status: input.status,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "device-type.update",
      entityType: "device-type",
      entityId: updated.id,
      summary: `Updated device type ${updated.name}.`,
      beforeState: mapDeviceType(existing),
      afterState: mapDeviceType(updated)
    });

    return mapDeviceType(updated);
  }

  async archiveDeviceType(id: string, actorUserId?: string) {
    const existing = await this.requireDeviceType(id);
    const deviceCount = await this.repository.countDevicesByType(id);

    if (deviceCount > 0) {
      throw new DomainError("Archive or reassign devices before archiving this device type.", 409);
    }

    const updated = await this.repository.updateDeviceType(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "device-type.archive",
      entityType: "device-type",
      entityId: updated.id,
      summary: `Archived device type ${updated.name}.`,
      beforeState: mapDeviceType(existing),
      afterState: mapDeviceType(updated)
    });

    return mapDeviceType(updated);
  }

  async listDevices(facilityId?: string) {
    const [devices, maps] = await Promise.all([this.repository.listDevices(facilityId), this.loadLocationMaps()]);
    return devices.map((record: InventoryDeviceRecord) => mapDevice(record, maps));
  }

  async getDevice(id: string) {
    const [device, maps] = await Promise.all([this.requireDevice(id), this.loadLocationMaps()]);
    return mapDevice(device, maps);
  }

  async createDevice(payload: unknown, actorUserId?: string) {
    const input = deviceInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const deviceType = await this.requireDeviceType(input.deviceTypeId);
    const placement = await this.resolvePlacement({
      facilityId: input.facilityId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      zoneId: input.zoneId,
      roomId: input.roomId
    });

    if (input.ownerContactId) {
      await this.requireContact(input.ownerContactId);
    }

    const created = await this.repository.createDevice({
      name: input.name,
      code: input.code ?? null,
      facilityId: placement.facilityId,
      buildingId: placement.buildingId,
      floorId: placement.floorId,
      zoneId: placement.zoneId,
      roomId: placement.roomId,
      deviceTypeId: deviceType.id,
      hostname: input.hostname ?? null,
      serialNumber: input.serialNumber ?? null,
      assetTag: input.assetTag ?? null,
      ipAddress: input.ipAddress ?? null,
      macAddress: input.macAddress ?? null,
      lifecycleState: input.lifecycleState ?? null,
      ownerContactId: input.ownerContactId ?? null,
      notes: input.notes ?? null,
      status: input.status,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "device.create",
      entityType: "device",
      entityId: created.id,
      summary: `Created device ${created.name}.`
    });

    const [deviceRecord, maps] = await Promise.all([this.requireDevice(created.id), this.loadLocationMaps()]);
    return mapDevice(deviceRecord, maps);
  }

  async updateDevice(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireDevice(id);
    const input = deviceInputSchema.partial().parse(payload);
    assertNonArchiveStatus(input.status);
    const placement = await this.resolvePlacement(
      {
        facilityId: input.facilityId,
        buildingId: input.buildingId,
        floorId: input.floorId,
        zoneId: input.zoneId,
        roomId: input.roomId
      },
      existing
    );

    if (input.deviceTypeId) {
      await this.requireDeviceType(input.deviceTypeId);
    }

    if (input.ownerContactId) {
      await this.requireContact(input.ownerContactId);
    }

    const updated = await this.repository.updateDevice(id, {
      name: input.name,
      code: input.code,
      facilityId: placement.facilityId,
      buildingId: placement.buildingId,
      floorId: placement.floorId,
      zoneId: placement.zoneId,
      roomId: placement.roomId,
      deviceTypeId: input.deviceTypeId,
      hostname: input.hostname,
      serialNumber: input.serialNumber,
      assetTag: input.assetTag,
      ipAddress: input.ipAddress,
      macAddress: input.macAddress,
      lifecycleState: input.lifecycleState,
      ownerContactId: input.ownerContactId,
      notes: input.notes,
      status: input.status,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "device.update",
      entityType: "device",
      entityId: updated.id,
      summary: `Updated device ${updated.name}.`,
      beforeState: await this.snapshotDevice(existing),
      afterState: await this.snapshotDevice(updated)
    });

    const [deviceRecord, maps] = await Promise.all([this.requireDevice(updated.id), this.loadLocationMaps()]);
    return mapDevice(deviceRecord, maps);
  }

  async archiveDevice(id: string, actorUserId?: string) {
    const existing = await this.requireDevice(id);
    const updated = await this.repository.updateDevice(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "device.archive",
      entityType: "device",
      entityId: updated.id,
      summary: `Archived device ${updated.name}.`,
      beforeState: await this.snapshotDevice(existing),
      afterState: await this.snapshotDevice(updated)
    });

    const maps = await this.loadLocationMaps();
    return mapDevice(updated, maps);
  }

  async listFacilities() {
    const records = await this.repository.listFacilities();
    return records.map((record: InventoryFacilityRecord) => mapFacility(record));
  }

  async listBuildings(facilityId?: string) {
    const records = await this.repository.listBuildings(facilityId);
    return records.map((record: InventoryBuildingRecord) => mapBuilding(record));
  }

  async listFloors(buildingId?: string) {
    const records = await this.repository.listFloors(buildingId);
    return records.map((record: InventoryFloorRecord) => mapFloor(record));
  }

  async listZones(floorId?: string) {
    const records = await this.repository.listZones(floorId);
    return records.map((record: InventoryZoneRecord) => mapZone(record));
  }

  async listRooms(floorId?: string) {
    const records = await this.repository.listRooms(floorId);
    return records.map((record: InventoryRoomRecord) => mapRoom(record));
  }

  private async requireDeviceType(id: string) {
    const record = await this.repository.getDeviceType(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Device type not found.", 404);
    }
    return record;
  }

  private async requireDevice(id: string) {
    const record = await this.repository.getDevice(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Device not found.", 404);
    }
    return record;
  }

  private async requireContact(id: string) {
    const record = await this.repository.getContact(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Contact not found.", 404);
    }
    return record;
  }

  private async requireFacility(id: string) {
    const record = await this.repository.getFacility(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Facility not found.", 404);
    }
    return record;
  }

  private async requireBuilding(id: string) {
    const record = await this.repository.getBuilding(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Building not found.", 404);
    }
    return record;
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

  private async loadLocationMaps(): Promise<LocationMaps> {
    const [facilities, buildings, floors, zones, rooms] = await Promise.all([
      this.repository.listFacilities(),
      this.repository.listBuildings(),
      this.repository.listFloors(),
      this.repository.listZones(),
      this.repository.listRooms()
    ]);

    return this.buildLocationMaps(facilities, buildings, floors, zones, rooms);
  }

  private buildLocationMaps(
    facilities: InventoryFacilityRecord[],
    buildings: InventoryBuildingRecord[],
    floors: InventoryFloorRecord[],
    zones: InventoryZoneRecord[],
    rooms: InventoryRoomRecord[]
  ): LocationMaps {
    return {
      facilityNameById: new Map(facilities.map((record) => [record.id, record.name])),
      buildingNameById: new Map(buildings.map((record) => [record.id, record.name])),
      floorNameById: new Map(floors.map((record) => [record.id, record.name])),
      zoneNameById: new Map(zones.map((record) => [record.id, record.name])),
      roomNameById: new Map(rooms.map((record) => [record.id, record.name]))
    };
  }

  private async resolvePlacement(
    input: {
      facilityId: string | null | undefined;
      buildingId: string | null | undefined;
      floorId: string | null | undefined;
      zoneId: string | null | undefined;
      roomId: string | null | undefined;
    },
    existing?: InventoryDeviceRecord
  ) {
    const placement = {
      facilityId: input.facilityId ?? existing?.facilityId ?? null,
      buildingId: input.buildingId ?? existing?.buildingId ?? null,
      floorId: input.floorId ?? existing?.floorId ?? null,
      zoneId: input.zoneId ?? existing?.zoneId ?? null,
      roomId: input.roomId ?? existing?.roomId ?? null
    };

    if (placement.roomId) {
      const room = await this.requireRoom(placement.roomId);
      placement.facilityId = placement.facilityId ?? room.facilityId;
      placement.buildingId = placement.buildingId ?? room.buildingId;
      placement.floorId = placement.floorId ?? room.floorId;

      if (room.facilityId !== placement.facilityId || room.buildingId !== placement.buildingId || room.floorId !== placement.floorId) {
        throw new DomainError("Room does not match the selected facility, building, or floor.", 409);
      }

      if (room.zoneId) {
        if (placement.zoneId && placement.zoneId !== room.zoneId) {
          throw new DomainError("Room zone does not match the selected zone.", 409);
        }
        placement.zoneId = room.zoneId;
      } else if (placement.zoneId) {
        throw new DomainError("Selected room is not assigned to a zone.", 409);
      }
    }

    if (placement.zoneId) {
      const zone = await this.requireZone(placement.zoneId);
      placement.facilityId = placement.facilityId ?? zone.facilityId;
      placement.buildingId = placement.buildingId ?? zone.buildingId;
      placement.floorId = placement.floorId ?? zone.floorId;

      if (zone.facilityId !== placement.facilityId || zone.buildingId !== placement.buildingId || zone.floorId !== placement.floorId) {
        throw new DomainError("Zone does not match the selected facility, building, or floor.", 409);
      }
    }

    if (placement.floorId) {
      const floor = await this.requireFloor(placement.floorId);
      placement.facilityId = placement.facilityId ?? floor.facilityId;
      placement.buildingId = placement.buildingId ?? floor.buildingId;

      if (floor.facilityId !== placement.facilityId || floor.buildingId !== placement.buildingId) {
        throw new DomainError("Floor does not match the selected facility or building.", 409);
      }
    }

    if (placement.buildingId) {
      const building = await this.requireBuilding(placement.buildingId);
      placement.facilityId = placement.facilityId ?? building.facilityId;

      if (building.facilityId !== placement.facilityId) {
        throw new DomainError("Building does not match the selected facility.", 409);
      }
    }

    if (!placement.facilityId) {
      throw new DomainError("Facility is required for device placement.", 400);
    }

    await this.requireFacility(placement.facilityId);

    return {
      facilityId: placement.facilityId,
      buildingId: placement.buildingId ?? null,
      floorId: placement.floorId ?? null,
      zoneId: placement.zoneId ?? null,
      roomId: placement.roomId ?? null
    };
  }

  private async snapshotDevice(record: InventoryDeviceRecord) {
    const maps = await this.loadLocationMaps();
    return mapDevice(record, maps);
  }
}
