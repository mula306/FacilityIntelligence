import {
  contactInputSchema,
  contactRoleInputSchema,
  facilityContactAssignmentInputSchema
} from "@facility/contracts";
import type { Prisma } from "@facility/db";
import { DomainError } from "../../lib/domain-error.js";
import { writeAuditEntry } from "../../lib/audit.js";
import { mapAssignment, mapContact, mapRole } from "./mappers.js";
import { ContactsRepository } from "./repository.js";

type AuditWriter = typeof writeAuditEntry;

function toNullableText(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toNullableEmail(value: string | null | undefined) {
  const normalized = toNullableText(value);
  return normalized === "" ? null : normalized;
}

function assertNonArchiveStatus(status: string | undefined) {
  if (status === "archived") {
    throw new DomainError("Archived status can only be set through the archive workflow.", 400);
  }
}

type LocationMaps = {
  facilityNameById: Map<string, string>;
  buildingNameById: Map<string, string>;
  floorNameById: Map<string, string>;
  zoneNameById: Map<string, string>;
  roomNameById: Map<string, string>;
};

type AssignmentPlacement = {
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
};

function toAuditState(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

export interface ContactsServiceOptions {
  auditWriter?: AuditWriter;
}

export class ContactsService {
  constructor(
    private readonly repository: ContactsRepository,
    private readonly options: ContactsServiceOptions = {}
  ) {}

  private get auditWriter() {
    return this.options.auditWriter ?? writeAuditEntry;
  }

  async getBootstrap() {
    const [contacts, roles, assignments, facilities, buildings, floors, zones, rooms] = await Promise.all([
      this.repository.listContacts(),
      this.repository.listRoles(),
      this.repository.listAssignments(),
      this.repository.listFacilities(),
      this.repository.listBuildings(),
      this.repository.listFloors(),
      this.repository.listZones(),
      this.repository.listRooms()
    ]);

    const maps = this.buildLocationMaps(facilities, buildings, floors, zones, rooms);
    const assignmentCountByContactId = this.countAssignments(assignments, "contactId");
    const assignmentCountByRoleId = this.countAssignments(assignments, "contactRoleId");

    return {
      summary: {
        contacts: contacts.length,
        roles: roles.length,
        assignments: assignments.length,
        facilities: facilities.length,
        buildings: buildings.length,
        floors: floors.length,
        zones: zones.length,
        rooms: rooms.length
      },
      lists: {
        contacts: contacts.map((record: any) => mapContact(record, assignmentCountByContactId.get(record.id) ?? 0)),
        roles: roles.map((record: any) => mapRole(record, assignmentCountByRoleId.get(record.id) ?? 0)),
        assignments: assignments.map((record: any) => this.mapAssignment(record, maps)),
        facilities: facilities,
        buildings: buildings,
        floors: floors,
        zones: zones,
        rooms: rooms
      }
    };
  }

  async listContacts() {
    const [contacts, assignments] = await Promise.all([this.repository.listContacts(), this.repository.listAssignments()]);
    const assignmentCountByContactId = this.countAssignments(assignments, "contactId");
    return contacts.map((record: any) => mapContact(record, assignmentCountByContactId.get(record.id) ?? 0));
  }

  async getContact(id: string) {
    const [contact, assignments, maps] = await Promise.all([
      this.requireContact(id),
      this.repository.listAssignments(),
      this.loadLocationMaps()
    ]);

    return {
      ...mapContact(contact, assignments.filter((assignment: any) => assignment.contactId === contact.id).length),
      assignments: assignments
        .filter((assignment: any) => assignment.contactId === contact.id)
        .map((assignment: any) => this.mapAssignment(assignment, maps))
    };
  }

  async createContact(payload: unknown, actorUserId?: string) {
    const input = contactInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const created = await this.repository.createContact(this.buildContactCreateInput(input, actorUserId));

    await this.auditWriter({
      actorUserId,
      action: "contact.create",
      entityType: "contact",
      entityId: created.id,
      summary: `Created contact ${created.name}.`,
      afterState: toAuditState(mapContact(created, created.assignments?.length ?? 0))
    });

    return this.getContact(created.id);
  }

  async updateContact(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireContact(id);
    const input = contactInputSchema.partial().parse(payload);
    assertNonArchiveStatus(input.status);
    const updated = await this.repository.updateContact(id, this.buildContactUpdateInput(input, actorUserId));

    await this.auditWriter({
      actorUserId,
      action: "contact.update",
      entityType: "contact",
      entityId: updated.id,
      summary: `Updated contact ${updated.name}.`,
      beforeState: toAuditState(mapContact(existing, existing.assignments.length)),
      afterState: toAuditState(mapContact(updated, updated.assignments?.length ?? 0))
    });

    return this.getContact(updated.id);
  }

  async archiveContact(id: string, actorUserId?: string) {
    const existing = await this.requireContact(id);

    if (existing.assignments.length > 0) {
      throw new DomainError("Archive assignments before archiving this contact.", 409);
    }

    const updated = await this.repository.updateContact(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "contact.archive",
      entityType: "contact",
      entityId: updated.id,
      summary: `Archived contact ${updated.name}.`,
      beforeState: toAuditState(mapContact(existing, existing.assignments.length)),
      afterState: toAuditState(mapContact(updated, updated.assignments?.length ?? 0))
    });

    return mapContact(updated, existing.assignments.length);
  }

  async listRoles() {
    const [roles, assignments] = await Promise.all([this.repository.listRoles(), this.repository.listAssignments()]);
    const assignmentCountByRoleId = this.countAssignments(assignments, "contactRoleId");
    return roles.map((record: any) => mapRole(record, assignmentCountByRoleId.get(record.id) ?? 0));
  }

  async getRole(id: string) {
    const [role, assignments, maps] = await Promise.all([this.requireRole(id), this.repository.listAssignments(), this.loadLocationMaps()]);

    return {
      ...mapRole(role, assignments.filter((assignment: any) => assignment.contactRoleId === role.id).length),
      assignments: assignments
        .filter((assignment: any) => assignment.contactRoleId === role.id)
        .map((assignment: any) => this.mapAssignment(assignment, maps))
    };
  }

  async createRole(payload: unknown, actorUserId?: string) {
    const input = contactRoleInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const created = await this.repository.createRole(this.buildRoleCreateInput(input, actorUserId));

    await this.auditWriter({
      actorUserId,
      action: "contact-role.create",
      entityType: "contact-role",
      entityId: created.id,
      summary: `Created contact role ${created.name}.`,
      afterState: toAuditState(mapRole(created, created.assignments?.length ?? 0))
    });

    return this.getRole(created.id);
  }

  async updateRole(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireRole(id);
    const input = contactRoleInputSchema.partial().parse(payload);
    assertNonArchiveStatus(input.status);
    const updated = await this.repository.updateRole(id, this.buildRoleUpdateInput(input, actorUserId));

    await this.auditWriter({
      actorUserId,
      action: "contact-role.update",
      entityType: "contact-role",
      entityId: updated.id,
      summary: `Updated contact role ${updated.name}.`,
      beforeState: toAuditState(mapRole(existing, existing.assignments.length)),
      afterState: toAuditState(mapRole(updated, updated.assignments?.length ?? 0))
    });

    return this.getRole(updated.id);
  }

  async archiveRole(id: string, actorUserId?: string) {
    const existing = await this.requireRole(id);

    if (existing.assignments.length > 0) {
      throw new DomainError("Archive assignments before archiving this role.", 409);
    }

    const updated = await this.repository.updateRole(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "contact-role.archive",
      entityType: "contact-role",
      entityId: updated.id,
      summary: `Archived contact role ${updated.name}.`,
      beforeState: toAuditState(mapRole(existing, existing.assignments.length)),
      afterState: toAuditState(mapRole(updated, updated.assignments?.length ?? 0))
    });

    return mapRole(updated, existing.assignments.length);
  }

  async listAssignments() {
    const [assignments, maps] = await Promise.all([this.repository.listAssignments(), this.loadLocationMaps()]);
    return assignments.map((record: any) => this.mapAssignment(record, maps));
  }

  async getAssignment(id: string) {
    const [assignment, maps] = await Promise.all([this.requireAssignment(id), this.loadLocationMaps()]);
    return this.mapAssignment(assignment, maps);
  }

  async createAssignment(payload: unknown, actorUserId?: string) {
    const input = facilityContactAssignmentInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const placement = await this.resolvePlacement(input);
    await this.requireContact(input.contactId);
    await this.requireRole(input.contactRoleId);
    const escalationPriority = await this.resolveEscalationPriority({
      facilityId: placement.facilityId,
      contactRoleId: input.contactRoleId,
      escalationPriority: input.escalationPriority ?? undefined
    });

    const created = await this.repository.createAssignment({
      facilityId: placement.facilityId,
      buildingId: placement.buildingId,
      floorId: placement.floorId,
      zoneId: placement.zoneId,
      roomId: placement.roomId,
      contactId: input.contactId,
      contactRoleId: input.contactRoleId,
      escalationPriority,
      isPrimary: input.isPrimary,
      status: input.status,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "contact-assignment.create",
      entityType: "contact-assignment",
      entityId: created.id,
      summary: `Created contact assignment for ${created.contact.name} in ${created.facility.name}.`,
      afterState: toAuditState(this.mapAssignment(created, await this.loadLocationMaps()))
    });

    return this.getAssignment(created.id);
  }

  async updateAssignment(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireAssignment(id);
    const input = facilityContactAssignmentInputSchema.partial().parse(payload);
    assertNonArchiveStatus(input.status);
    const placement = await this.resolvePlacement(input, existing);
    const contactId = input.contactId ?? existing.contactId;
    const contactRoleId = input.contactRoleId ?? existing.contactRoleId;

    if (input.contactId !== undefined) {
      await this.requireContact(input.contactId);
    }

    if (input.contactRoleId !== undefined) {
      await this.requireRole(input.contactRoleId);
    }

    const scopeChanged =
      placement.facilityId !== existing.facilityId ||
      placement.buildingId !== existing.buildingId ||
      placement.floorId !== existing.floorId ||
      placement.zoneId !== existing.zoneId ||
      placement.roomId !== existing.roomId ||
      contactRoleId !== existing.contactRoleId;

    const escalationPriority = await this.resolveEscalationPriority({
      facilityId: placement.facilityId,
      contactRoleId,
      escalationPriority:
        input.escalationPriority === undefined && !scopeChanged
          ? existing.escalationPriority ?? undefined
          : input.escalationPriority ?? undefined,
      ignoreAssignmentId: existing.id
    });

    const updated = await this.repository.updateAssignment(id, {
      facilityId: placement.facilityId,
      buildingId: placement.buildingId,
      floorId: placement.floorId,
      zoneId: placement.zoneId,
      roomId: placement.roomId,
      contactId,
      contactRoleId,
      escalationPriority,
      isPrimary: input.isPrimary ?? existing.isPrimary,
      status: input.status,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "contact-assignment.update",
      entityType: "contact-assignment",
      entityId: updated.id,
      summary: `Updated contact assignment for ${updated.contact.name}.`,
      beforeState: toAuditState(this.mapAssignment(existing, await this.loadLocationMaps())),
      afterState: toAuditState(this.mapAssignment(updated, await this.loadLocationMaps()))
    });

    return this.getAssignment(updated.id);
  }

  async archiveAssignment(id: string, actorUserId?: string) {
    const existing = await this.requireAssignment(id);
    const updated = await this.repository.updateAssignment(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await this.auditWriter({
      actorUserId,
      action: "contact-assignment.archive",
      entityType: "contact-assignment",
      entityId: updated.id,
      summary: `Archived contact assignment for ${updated.contact.name}.`,
      beforeState: toAuditState(this.mapAssignment(existing, await this.loadLocationMaps())),
      afterState: toAuditState(this.mapAssignment(updated, await this.loadLocationMaps()))
    });

    return this.mapAssignment(updated, await this.loadLocationMaps());
  }

  async listFacilities() {
    return this.repository.listFacilities();
  }

  async listBuildings(facilityId?: string) {
    return this.repository.listBuildings(facilityId);
  }

  async listFloors(buildingId?: string) {
    return this.repository.listFloors(buildingId);
  }

  async listZones(floorId?: string) {
    return this.repository.listZones(floorId);
  }

  async listRooms(floorId?: string) {
    return this.repository.listRooms(floorId);
  }

  private async requireContact(id: string) {
    const record = await this.repository.getContact(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Contact not found.", 404);
    }

    return record;
  }

  private async requireRole(id: string) {
    const record = await this.repository.getRole(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Contact role not found.", 404);
    }

    return record;
  }

  private async requireAssignment(id: string) {
    const record = await this.repository.getAssignment(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Assignment not found.", 404);
    }

    return record;
  }

  private buildContactCreateInput(input: any, actorUserId?: string): Prisma.ContactCreateInput {
    return {
      name: input.name,
      code: toNullableText(input.code),
      firstName: input.firstName,
      lastName: input.lastName,
      title: toNullableText(input.title),
      email: toNullableEmail(input.email),
      phone: toNullableText(input.phone),
      mobilePhone: toNullableText(input.mobilePhone),
      organization: toNullableText(input.organization),
      status: input.status,
      notes: toNullableText(input.notes),
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    };
  }

  private buildContactUpdateInput(input: any, actorUserId?: string): Prisma.ContactUpdateInput {
    const data: Prisma.ContactUpdateInput = {
      updatedBy: actorUserId ?? null
    };

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.code !== undefined) {
      data.code = toNullableText(input.code);
    }

    if (input.firstName !== undefined) {
      data.firstName = input.firstName;
    }

    if (input.lastName !== undefined) {
      data.lastName = input.lastName;
    }

    if (input.title !== undefined) {
      data.title = toNullableText(input.title);
    }

    if (input.email !== undefined) {
      data.email = toNullableEmail(input.email);
    }

    if (input.phone !== undefined) {
      data.phone = toNullableText(input.phone);
    }

    if (input.mobilePhone !== undefined) {
      data.mobilePhone = toNullableText(input.mobilePhone);
    }

    if (input.organization !== undefined) {
      data.organization = toNullableText(input.organization);
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    if (input.notes !== undefined) {
      data.notes = toNullableText(input.notes);
    }

    return data;
  }

  private buildRoleCreateInput(input: any, actorUserId?: string): Prisma.ContactRoleCreateInput {
    return {
      name: input.name,
      code: toNullableText(input.code),
      description: toNullableText(input.description),
      status: input.status,
      notes: toNullableText(input.notes),
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    };
  }

  private buildRoleUpdateInput(input: any, actorUserId?: string): Prisma.ContactRoleUpdateInput {
    const data: Prisma.ContactRoleUpdateInput = {
      updatedBy: actorUserId ?? null
    };

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.code !== undefined) {
      data.code = toNullableText(input.code);
    }

    if (input.description !== undefined) {
      data.description = toNullableText(input.description);
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    if (input.notes !== undefined) {
      data.notes = toNullableText(input.notes);
    }

    return data;
  }

  private async resolvePlacement(
    input: {
      facilityId?: string | null | undefined;
      buildingId?: string | null | undefined;
      floorId?: string | null | undefined;
      zoneId?: string | null | undefined;
      roomId?: string | null | undefined;
    },
    existing?: {
      facilityId: string;
      buildingId: string | null;
      floorId: string | null;
      zoneId: string | null;
      roomId: string | null;
    }
  ): Promise<AssignmentPlacement> {
    const placement: AssignmentPlacement = {
      facilityId: input.facilityId ?? existing?.facilityId ?? "",
      buildingId: input.buildingId ?? existing?.buildingId ?? null,
      floorId: input.floorId ?? existing?.floorId ?? null,
      zoneId: input.zoneId ?? existing?.zoneId ?? null,
      roomId: input.roomId ?? existing?.roomId ?? null
    };

    if (placement.roomId) {
      const room = await this.repository.getRoom(placement.roomId);
      if (!room || room.archivedAt) {
        throw new DomainError("Room not found.", 404);
      }

      if (placement.facilityId && room.facilityId !== placement.facilityId) {
        throw new DomainError("Room does not belong to the selected facility.", 409);
      }

      if (placement.buildingId && room.buildingId !== placement.buildingId) {
        throw new DomainError("Room does not belong to the selected building.", 409);
      }

      if (placement.floorId && room.floorId !== placement.floorId) {
        throw new DomainError("Room does not belong to the selected floor.", 409);
      }

      placement.facilityId = room.facilityId;
      placement.buildingId = room.buildingId;
      placement.floorId = room.floorId;

      if (room.zoneId) {
        if (placement.zoneId && placement.zoneId !== room.zoneId) {
          throw new DomainError("Room does not belong to the selected zone.", 409);
        }

        placement.zoneId = room.zoneId;
      } else if (placement.zoneId) {
        throw new DomainError("Selected room is not assigned to a zone.", 409);
      }
    }

    if (placement.zoneId) {
      const zone = await this.repository.getZone(placement.zoneId);
      if (!zone || zone.archivedAt) {
        throw new DomainError("Zone not found.", 404);
      }

      if (placement.facilityId && zone.facilityId !== placement.facilityId) {
        throw new DomainError("Zone does not belong to the selected facility.", 409);
      }

      if (placement.buildingId && zone.buildingId !== placement.buildingId) {
        throw new DomainError("Zone does not belong to the selected building.", 409);
      }

      if (placement.floorId && zone.floorId !== placement.floorId) {
        throw new DomainError("Zone does not belong to the selected floor.", 409);
      }

      placement.facilityId = zone.facilityId;
      placement.buildingId = zone.buildingId;
      placement.floorId = zone.floorId;
    }

    if (placement.floorId) {
      const floor = await this.repository.getFloor(placement.floorId);
      if (!floor || floor.archivedAt) {
        throw new DomainError("Floor not found.", 404);
      }

      if (placement.facilityId && floor.facilityId !== placement.facilityId) {
        throw new DomainError("Floor does not belong to the selected facility.", 409);
      }

      if (placement.buildingId && floor.buildingId !== placement.buildingId) {
        throw new DomainError("Floor does not belong to the selected building.", 409);
      }

      placement.facilityId = floor.facilityId;
      placement.buildingId = floor.buildingId;
    }

    if (placement.buildingId) {
      const building = await this.repository.getBuilding(placement.buildingId);
      if (!building || building.archivedAt) {
        throw new DomainError("Building not found.", 404);
      }

      if (placement.facilityId && building.facilityId !== placement.facilityId) {
        throw new DomainError("Building does not belong to the selected facility.", 409);
      }

      placement.facilityId = building.facilityId;
    }

    if (!placement.facilityId) {
      throw new DomainError("Assignments must resolve to a facility.", 400);
    }

    const facility = await this.repository.getFacility(placement.facilityId);
    if (!facility || facility.archivedAt) {
      throw new DomainError("Facility not found.", 404);
    }

    return {
      facilityId: placement.facilityId,
      buildingId: placement.buildingId,
      floorId: placement.floorId,
      zoneId: placement.zoneId,
      roomId: placement.roomId
    };
  }

  private async resolveEscalationPriority(input: {
    facilityId: string;
    contactRoleId: string;
    escalationPriority?: number | null | undefined;
    ignoreAssignmentId?: string | undefined;
  }) {
    const assignments = await this.repository.listAssignments();
    const scopedAssignments = assignments.filter(
      (assignment: any) =>
        assignment.facilityId === input.facilityId &&
        assignment.contactRoleId === input.contactRoleId &&
        assignment.archivedAt === null &&
        assignment.id !== input.ignoreAssignmentId
    );

    if (input.escalationPriority === undefined || input.escalationPriority === null) {
      const nextPriority =
        scopedAssignments.reduce((maxPriority: number, assignment: any) => Math.max(maxPriority, assignment.escalationPriority ?? 0), 0) + 1;
      return nextPriority;
    }

    const duplicate = scopedAssignments.find((assignment: any) => assignment.escalationPriority === input.escalationPriority);
    if (duplicate) {
      throw new DomainError("That escalation priority is already used for this role in the selected facility.", 409);
    }

    return input.escalationPriority;
  }

  private buildLocationMaps(
    facilities: any[],
    buildings: any[],
    floors: any[],
    zones: any[],
    rooms: any[]
  ): LocationMaps {
    return {
      facilityNameById: new Map(facilities.map((record) => [record.id, record.name])),
      buildingNameById: new Map(buildings.map((record) => [record.id, record.name])),
      floorNameById: new Map(floors.map((record) => [record.id, record.name])),
      zoneNameById: new Map(zones.map((record) => [record.id, record.name])),
      roomNameById: new Map(rooms.map((record) => [record.id, record.name]))
    };
  }

  private async loadLocationMaps() {
    const [facilities, buildings, floors, zones, rooms] = await Promise.all([
      this.repository.listFacilities(),
      this.repository.listBuildings(),
      this.repository.listFloors(),
      this.repository.listZones(),
      this.repository.listRooms()
    ]);

    return this.buildLocationMaps(facilities, buildings, floors, zones, rooms);
  }

  private mapAssignment(record: any, maps: LocationMaps) {
    return mapAssignment(record, {
      buildingName: record.buildingId ? maps.buildingNameById.get(record.buildingId) ?? null : null,
      floorName: record.floorId ? maps.floorNameById.get(record.floorId) ?? null : null,
      zoneName: record.zoneId ? maps.zoneNameById.get(record.zoneId) ?? null : null,
      roomName: record.roomId ? maps.roomNameById.get(record.roomId) ?? null : null
    });
  }

  private countAssignments(assignments: any[], key: "contactId" | "contactRoleId") {
    const counts = new Map<string, number>();
    for (const assignment of assignments) {
      counts.set(assignment[key], (counts.get(assignment[key]) ?? 0) + 1);
    }
    return counts;
  }
}
