import {
  buildingInputSchema,
  facilityInputSchema,
  floorInputSchema,
  roomInputSchema,
  zoneInputSchema
} from "@facility/contracts";
import { DomainError } from "../../lib/domain-error.js";
import { writeAuditEntry } from "../../lib/audit.js";
import {
  mapBuilding,
  mapFacility,
  mapFloor,
  mapRoom,
  mapZone
} from "../../lib/mappers.js";
import { LocationRepository } from "./repository.js";

function serializeGeometry(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return JSON.stringify(value);
}

const facilityPatchSchema = facilityInputSchema.partial();
const buildingPatchSchema = buildingInputSchema.partial().omit({ facilityId: true });
const floorPatchSchema = floorInputSchema.partial().omit({ facilityId: true, buildingId: true });
const zonePatchSchema = zoneInputSchema.partial().omit({ facilityId: true, buildingId: true, floorId: true });
const roomPatchSchema = roomInputSchema.partial().omit({ facilityId: true, buildingId: true, floorId: true });

export class LocationService {
  constructor(private readonly repository: LocationRepository) {}

  async getBootstrap() {
    const [summary, tree, facilities, buildings, floors, zones, rooms] = await Promise.all([
      this.repository.getSummary(),
      this.repository.getTree(),
      this.repository.listFacilities(),
      this.repository.listBuildings(),
      this.repository.listFloors(),
      this.repository.listZones(),
      this.repository.listRooms()
    ]);

    return {
      summary,
      lists: {
        facilities: facilities.map((record: any) => mapFacility(record)),
        buildings: buildings.map((record: any) => mapBuilding(record)),
        floors: floors.map((record: any) => mapFloor(record)),
        zones: zones.map((record: any) => mapZone(record)),
        rooms: rooms.map((record: any) => mapRoom(record))
      },
      tree: tree.map((facility: any) => ({
        ...mapFacility(facility),
        buildings: facility.buildings.map((building: any) => ({
          ...mapBuilding(building),
          floors: building.floors.map((floor: any) => ({
            ...mapFloor(floor),
            zones: floor.zones.map((zone: any) => mapZone(zone)),
            rooms: floor.rooms.map((room: any) => mapRoom(room))
          }))
        }))
      }))
    };
  }

  async listFacilities() {
    const facilities = await this.repository.listFacilities();
    return facilities.map((record: any) => mapFacility(record));
  }

  async getFacility(id: string) {
    const facility = await this.requireFacility(id);
    return mapFacility(facility);
  }

  async createFacility(payload: unknown, actorUserId?: string) {
    const input = facilityInputSchema.parse(payload);
    const created = await this.repository.createFacility({
      name: input.name,
      code: input.code ?? null,
      notes: input.notes ?? null,
      status: input.status,
      shortName: input.shortName ?? null,
      facilityType: input.facilityType ?? null,
      campusName: input.campusName ?? null,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      region: input.region ?? null,
      postalCode: input.postalCode ?? null,
      countryCode: input.countryCode ?? null,
      timezone: input.timezone ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "facility.create",
      entityType: "facility",
      entityId: created.id,
      summary: `Created facility ${created.name}.`,
      afterState: mapFacility(created)
    });

    return mapFacility(created);
  }

  async updateFacility(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireFacility(id);
    const input = facilityPatchSchema.parse(payload);
    const updated = await this.repository.updateFacility(id, {
      name: input.name,
      code: input.code,
      notes: input.notes,
      status: input.status,
      shortName: input.shortName,
      facilityType: input.facilityType,
      campusName: input.campusName,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      region: input.region,
      postalCode: input.postalCode,
      countryCode: input.countryCode,
      timezone: input.timezone,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "facility.update",
      entityType: "facility",
      entityId: updated.id,
      summary: `Updated facility ${updated.name}.`,
      beforeState: mapFacility(existing),
      afterState: mapFacility(updated)
    });

    return mapFacility(updated);
  }

  async archiveFacility(id: string, actorUserId?: string) {
    const existing = await this.requireFacility(id);
    const childBuildings = await this.repository.listBuildings(id);

    if (childBuildings.length > 0) {
      throw new DomainError("Archive child buildings before archiving the facility.", 409);
    }

    const updated = await this.repository.updateFacility(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "facility.archive",
      entityType: "facility",
      entityId: updated.id,
      summary: `Archived facility ${updated.name}.`,
      beforeState: mapFacility(existing),
      afterState: mapFacility(updated)
    });

    return mapFacility(updated);
  }

  async listBuildings(facilityId?: string) {
    const records = await this.repository.listBuildings(facilityId);
    return records.map((record: any) => mapBuilding(record));
  }

  async getBuilding(id: string) {
    const record = await this.requireBuilding(id);
    return mapBuilding(record);
  }

  async createBuilding(payload: unknown, actorUserId?: string) {
    const input = buildingInputSchema.parse(payload);
    await this.requireFacility(input.facilityId);

    const created = await this.repository.createBuilding({
      facilityId: input.facilityId,
      name: input.name,
      code: input.code ?? null,
      buildingType: input.buildingType ?? null,
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "building.create",
      entityType: "building",
      entityId: created.id,
      summary: `Created building ${created.name}.`,
      afterState: mapBuilding(created)
    });

    return mapBuilding(created);
  }

  async updateBuilding(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireBuilding(id);
    const input = buildingPatchSchema.parse(payload);
    const updated = await this.repository.updateBuilding(id, {
      name: input.name,
      code: input.code,
      buildingType: input.buildingType,
      status: input.status,
      notes: input.notes,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "building.update",
      entityType: "building",
      entityId: updated.id,
      summary: `Updated building ${updated.name}.`,
      beforeState: mapBuilding(existing),
      afterState: mapBuilding(updated)
    });

    return mapBuilding(updated);
  }

  async archiveBuilding(id: string, actorUserId?: string) {
    const existing = await this.requireBuilding(id);
    const childFloors = await this.repository.listFloors(id);

    if (childFloors.length > 0) {
      throw new DomainError("Archive child floors before archiving the building.", 409);
    }

    const updated = await this.repository.updateBuilding(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "building.archive",
      entityType: "building",
      entityId: updated.id,
      summary: `Archived building ${updated.name}.`,
      beforeState: mapBuilding(existing),
      afterState: mapBuilding(updated)
    });

    return mapBuilding(updated);
  }

  async listFloors(buildingId?: string) {
    const records = await this.repository.listFloors(buildingId);
    return records.map((record: any) => mapFloor(record));
  }

  async getFloor(id: string) {
    const record = await this.requireFloor(id);
    return mapFloor(record);
  }

  async createFloor(payload: unknown, actorUserId?: string) {
    const input = floorInputSchema.parse(payload);
    const building = await this.requireBuilding(input.buildingId);

    if (building.facilityId !== input.facilityId) {
      throw new DomainError("Building does not belong to the provided facility.", 409);
    }

    const created = await this.repository.createFloor({
      facilityId: input.facilityId,
      buildingId: input.buildingId,
      name: input.name,
      code: input.code ?? null,
      floorNumber: input.floorNumber,
      planImageUrl: input.planImageUrl ?? null,
      canvasWidth: input.canvasWidth ?? null,
      canvasHeight: input.canvasHeight ?? null,
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "floor.create",
      entityType: "floor",
      entityId: created.id,
      summary: `Created floor ${created.name}.`,
      afterState: mapFloor(created)
    });

    return mapFloor(created);
  }

  async updateFloor(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireFloor(id);
    const input = floorPatchSchema.parse(payload);
    const updated = await this.repository.updateFloor(id, {
      name: input.name,
      code: input.code,
      floorNumber: input.floorNumber,
      planImageUrl: input.planImageUrl,
      canvasWidth: input.canvasWidth,
      canvasHeight: input.canvasHeight,
      status: input.status,
      notes: input.notes,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "floor.update",
      entityType: "floor",
      entityId: updated.id,
      summary: `Updated floor ${updated.name}.`,
      beforeState: mapFloor(existing),
      afterState: mapFloor(updated)
    });

    return mapFloor(updated);
  }

  async archiveFloor(id: string, actorUserId?: string) {
    const existing = await this.requireFloor(id);
    const [zones, rooms] = await Promise.all([this.repository.listZones(id), this.repository.listRooms(id)]);

    if (zones.length > 0 || rooms.length > 0) {
      throw new DomainError("Archive child zones and rooms before archiving the floor.", 409);
    }

    const updated = await this.repository.updateFloor(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "floor.archive",
      entityType: "floor",
      entityId: updated.id,
      summary: `Archived floor ${updated.name}.`,
      beforeState: mapFloor(existing),
      afterState: mapFloor(updated)
    });

    return mapFloor(updated);
  }

  async listZones(floorId?: string) {
    const records = await this.repository.listZones(floorId);
    return records.map((record: any) => mapZone(record));
  }

  async getZone(id: string) {
    const record = await this.requireZone(id);
    return mapZone(record);
  }

  async createZone(payload: unknown, actorUserId?: string) {
    const input = zoneInputSchema.parse(payload);
    const floor = await this.requireFloor(input.floorId);

    if (floor.facilityId !== input.facilityId || floor.buildingId !== input.buildingId) {
      throw new DomainError("Floor does not match the selected facility and building.", 409);
    }

    const created = await this.repository.createZone({
      facilityId: input.facilityId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      name: input.name,
      code: input.code ?? null,
      zoneType: input.zoneType ?? null,
      geometryJson: serializeGeometry(input.geometry),
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "zone.create",
      entityType: "zone",
      entityId: created.id,
      summary: `Created zone ${created.name}.`,
      afterState: mapZone(created)
    });

    return mapZone(created);
  }

  async updateZone(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireZone(id);
    const input = zonePatchSchema.parse(payload);
    const updated = await this.repository.updateZone(id, {
      name: input.name,
      code: input.code,
      zoneType: input.zoneType,
      geometryJson: serializeGeometry(input.geometry),
      status: input.status,
      notes: input.notes,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "zone.update",
      entityType: "zone",
      entityId: updated.id,
      summary: `Updated zone ${updated.name}.`,
      beforeState: mapZone(existing),
      afterState: mapZone(updated)
    });

    return mapZone(updated);
  }

  async archiveZone(id: string, actorUserId?: string) {
    const existing = await this.requireZone(id);
    const rooms = (await this.repository.listRooms(existing.floorId)).filter((room: any) => room.zoneId === id);

    if (rooms.length > 0) {
      throw new DomainError("Archive child rooms before archiving the zone.", 409);
    }

    const updated = await this.repository.updateZone(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "zone.archive",
      entityType: "zone",
      entityId: updated.id,
      summary: `Archived zone ${updated.name}.`,
      beforeState: mapZone(existing),
      afterState: mapZone(updated)
    });

    return mapZone(updated);
  }

  async listRooms(floorId?: string) {
    const records = await this.repository.listRooms(floorId);
    return records.map((record: any) => mapRoom(record));
  }

  async getRoom(id: string) {
    const record = await this.requireRoom(id);
    return mapRoom(record);
  }

  async createRoom(payload: unknown, actorUserId?: string) {
    const input = roomInputSchema.parse(payload);
    const floor = await this.requireFloor(input.floorId);

    if (floor.facilityId !== input.facilityId || floor.buildingId !== input.buildingId) {
      throw new DomainError("Floor does not match the selected facility and building.", 409);
    }

    if (input.zoneId) {
      const zone = await this.requireZone(input.zoneId);
      if (zone.floorId !== input.floorId) {
        throw new DomainError("Zone does not belong to the selected floor.", 409);
      }
    }

    const created = await this.repository.createRoom({
      facilityId: input.facilityId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      zoneId: input.zoneId ?? null,
      name: input.name,
      code: input.code ?? null,
      roomNumber: input.roomNumber ?? null,
      roomType: input.roomType ?? null,
      clinicalCriticality: input.clinicalCriticality ?? null,
      geometryJson: serializeGeometry(input.geometry),
      status: input.status,
      notes: input.notes ?? null,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "room.create",
      entityType: "room",
      entityId: created.id,
      summary: `Created room ${created.name}.`,
      afterState: mapRoom(created)
    });

    return mapRoom(created);
  }

  async updateRoom(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireRoom(id);
    const input = roomPatchSchema.parse(payload);

    if (input.zoneId) {
      const zone = await this.requireZone(input.zoneId);
      if (zone.floorId !== existing.floorId) {
        throw new DomainError("Zone does not belong to the selected floor.", 409);
      }
    }

    const updated = await this.repository.updateRoom(id, {
      name: input.name,
      code: input.code,
      zoneId: input.zoneId,
      roomNumber: input.roomNumber,
      roomType: input.roomType,
      clinicalCriticality: input.clinicalCriticality,
      geometryJson: serializeGeometry(input.geometry),
      status: input.status,
      notes: input.notes,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "room.update",
      entityType: "room",
      entityId: updated.id,
      summary: `Updated room ${updated.name}.`,
      beforeState: mapRoom(existing),
      afterState: mapRoom(updated)
    });

    return mapRoom(updated);
  }

  async archiveRoom(id: string, actorUserId?: string) {
    const existing = await this.requireRoom(id);
    const updated = await this.repository.updateRoom(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "room.archive",
      entityType: "room",
      entityId: updated.id,
      summary: `Archived room ${updated.name}.`,
      beforeState: mapRoom(existing),
      afterState: mapRoom(updated)
    });

    return mapRoom(updated);
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
}
