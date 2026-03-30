import { hoursOfOperationInputSchema, serviceAreaInputSchema } from "@facility/contracts";
import { DomainError } from "../../lib/domain-error.js";
import { writeAuditEntry } from "../../lib/audit.js";
import type { HoursRepository } from "./repository.js";
import { parseTimeToMinutes, schedulesOverlap } from "./utils.js";

type HoursRecord = Awaited<ReturnType<HoursRepository["getHours"]>>;

function isoOrNull(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function mapAuditSafe(record: any) {
  return {
    ...record,
    createdAt: record.createdAt?.toISOString?.() ?? record.createdAt,
    updatedAt: record.updatedAt?.toISOString?.() ?? record.updatedAt,
    archivedAt: isoOrNull(record.archivedAt)
  };
}

function assertNonArchiveStatus(status: string | undefined) {
  if (status === "archived") {
    throw new DomainError("Archived status can only be set through the archive workflow.", 400);
  }
}

export class HoursService {
  constructor(private readonly repository: HoursRepository) {}

  async getBootstrap() {
    const [summary, serviceAreas, hours] = await Promise.all([
      this.repository.getSummary(),
      this.repository.listServiceAreas(),
      this.repository.listHours()
    ]);

    return {
      summary,
      lists: {
        serviceAreas: serviceAreas.map((record: any) => mapAuditSafe(record)),
        hours: hours.map((record: any) => this.mapHours(record))
      }
    };
  }

  async listServiceAreas(facilityId?: string) {
    const records = await this.repository.listServiceAreas(facilityId);
    return records.map((record: any) => mapAuditSafe(record));
  }

  async getServiceArea(id: string) {
    const record = await this.requireServiceArea(id);
    return mapAuditSafe(record);
  }

  async createServiceArea(payload: unknown, actorUserId?: string) {
    const input = serviceAreaInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    await this.validateLocationScope(input.facilityId, input.buildingId ?? null, input.floorId ?? null);

    const created = await this.repository.createServiceArea({
      facilityId: input.facilityId,
      buildingId: input.buildingId ?? null,
      floorId: input.floorId ?? null,
      name: input.name,
      code: input.code ?? null,
      notes: input.notes ?? null,
      status: input.status,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "service-area.create",
      entityType: "serviceArea",
      entityId: created.id,
      summary: `Created service area ${created.name}.`,
      afterState: mapAuditSafe(created)
    });

    return mapAuditSafe(created);
  }

  async updateServiceArea(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireServiceArea(id);
    const input = serviceAreaInputSchema.partial().omit({ facilityId: true }).parse(payload);
    assertNonArchiveStatus(input.status);
    const facilityId = existing.facilityId;
    const buildingId = input.buildingId === undefined ? existing.buildingId : input.buildingId;
    const floorId = input.floorId === undefined ? existing.floorId : input.floorId;

    await this.validateLocationScope(facilityId, buildingId ?? null, floorId ?? null);

    const updated = await this.repository.updateServiceArea(id, {
      name: input.name,
      code: input.code,
      notes: input.notes,
      buildingId: input.buildingId === undefined ? undefined : input.buildingId,
      floorId: input.floorId === undefined ? undefined : input.floorId,
      status: input.status,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "service-area.update",
      entityType: "serviceArea",
      entityId: updated.id,
      summary: `Updated service area ${updated.name}.`,
      beforeState: mapAuditSafe(existing),
      afterState: mapAuditSafe(updated)
    });

    return mapAuditSafe(updated);
  }

  async archiveServiceArea(id: string, actorUserId?: string) {
    const existing = await this.requireServiceArea(id);
    const activeHours = await this.repository.listHours(id);

    if (activeHours.length > 0) {
      throw new DomainError("Archive all hours before archiving the service area.", 409);
    }

    const updated = await this.repository.updateServiceArea(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "service-area.archive",
      entityType: "serviceArea",
      entityId: updated.id,
      summary: `Archived service area ${updated.name}.`,
      beforeState: mapAuditSafe(existing),
      afterState: mapAuditSafe(updated)
    });

    return mapAuditSafe(updated);
  }

  async listHours(serviceAreaId?: string, facilityId?: string) {
    const records = await this.repository.listHours(serviceAreaId, facilityId);
    return records.map((record: any) => this.mapHours(record));
  }

  async getHours(id: string) {
    const record = await this.requireHours(id);
    return this.mapHours(record);
  }

  async createHours(payload: unknown, actorUserId?: string) {
    const input = hoursOfOperationInputSchema.parse(payload);
    assertNonArchiveStatus(input.status);
    const serviceArea = input.serviceAreaId ? await this.requireServiceArea(input.serviceAreaId) : null;

    if (serviceArea && serviceArea.facilityId !== input.facilityId) {
      throw new DomainError("Service area does not belong to the supplied facility.", 409);
    }

    this.validateHoursShape(input.opensAt, input.closesAt, input.overnight);
    await this.ensureNoOverlap({
      facilityId: input.facilityId,
      serviceAreaId: input.serviceAreaId ?? null,
      dayOfWeek: input.dayOfWeek,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      overnight: input.overnight
    });

    const created = await this.repository.createHours({
      facilityId: input.facilityId,
      serviceAreaId: input.serviceAreaId ?? null,
      dayOfWeek: input.dayOfWeek,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      overnight: input.overnight,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      status: input.status,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "hours.create",
      entityType: "hoursOfOperation",
      entityId: created.id,
      summary: `Created hours for day ${created.dayOfWeek}.`,
      afterState: this.mapHours(created)
    });

    return this.mapHours(created);
  }

  async updateHours(id: string, payload: unknown, actorUserId?: string) {
    const existing = await this.requireHours(id);
    const input = hoursOfOperationInputSchema.partial().omit({ facilityId: true }).parse(payload);
    assertNonArchiveStatus(input.status);
    const facilityId = existing.facilityId;
    const serviceAreaId = input.serviceAreaId === undefined ? existing.serviceAreaId : input.serviceAreaId;
    const dayOfWeek = input.dayOfWeek ?? existing.dayOfWeek;
    const opensAt = input.opensAt ?? existing.opensAt;
    const closesAt = input.closesAt ?? existing.closesAt;
    const overnight = input.overnight ?? existing.overnight;

    const serviceArea = serviceAreaId ? await this.requireServiceArea(serviceAreaId) : null;
    if (serviceArea && serviceArea.facilityId !== facilityId) {
      throw new DomainError("Service area does not belong to the supplied facility.", 409);
    }

    this.validateHoursShape(opensAt, closesAt, overnight);
    await this.ensureNoOverlap({
      facilityId,
      serviceAreaId,
      dayOfWeek,
      opensAt,
      closesAt,
      overnight
    }, id);

    const updated = await this.repository.updateHours(id, {
      dayOfWeek: input.dayOfWeek,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      overnight: input.overnight,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      status: input.status,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "hours.update",
      entityType: "hoursOfOperation",
      entityId: updated.id,
      summary: `Updated hours for day ${updated.dayOfWeek}.`,
      beforeState: this.mapHours(existing),
      afterState: this.mapHours(updated)
    });

    return this.mapHours(updated);
  }

  async archiveHours(id: string, actorUserId?: string) {
    const existing = await this.requireHours(id);
    const updated = await this.repository.updateHours(id, {
      status: "archived",
      archivedAt: new Date(),
      archivedBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null
    });

    await writeAuditEntry({
      actorUserId,
      action: "hours.archive",
      entityType: "hoursOfOperation",
      entityId: updated.id,
      summary: `Archived hours for day ${updated.dayOfWeek}.`,
      beforeState: this.mapHours(existing),
      afterState: this.mapHours(updated)
    });

    return this.mapHours(updated);
  }

  private mapHours(record: NonNullable<HoursRecord>) {
    return {
      ...record,
      effectiveFrom: isoOrNull(record.effectiveFrom),
      effectiveTo: isoOrNull(record.effectiveTo),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      archivedAt: isoOrNull(record.archivedAt)
    };
  }

  private validateHoursShape(opensAt: string, closesAt: string, overnight: boolean) {
    if (opensAt === closesAt) {
      throw new DomainError("Opening and closing times must differ.", 400);
    }

    const start = parseTimeToMinutes(opensAt);
    const end = parseTimeToMinutes(closesAt);

    if (!overnight && end <= start) {
      throw new DomainError("Same-day hours must close after they open.", 400);
    }

    if (overnight && end >= start) {
      throw new DomainError("Overnight hours must close after midnight on the next day.", 400);
    }
  }

  private async ensureNoOverlap(
    candidate: {
      facilityId: string;
      serviceAreaId: string | null;
      dayOfWeek: number;
      opensAt: string;
      closesAt: string;
      overnight: boolean;
    },
    ignoreId?: string
  ) {
    const records = await this.repository.listHours(candidate.serviceAreaId ?? undefined, candidate.facilityId);

    for (const record of records as any[]) {
      if (ignoreId && record.id === ignoreId) {
        continue;
      }

      if (record.facilityId !== candidate.facilityId || (record.serviceAreaId ?? null) !== candidate.serviceAreaId) {
        continue;
      }

      if (
        schedulesOverlap(candidate, {
          dayOfWeek: record.dayOfWeek,
          opensAt: record.opensAt,
          closesAt: record.closesAt,
          overnight: record.overnight
        })
      ) {
        throw new DomainError("Hours overlap with an existing schedule in the same scope.", 409);
      }
    }
  }

  private async validateLocationScope(facilityId: string, buildingId: string | null, floorId: string | null) {
    if (buildingId === null && floorId !== null) {
      throw new DomainError("A floor cannot be assigned without a building.", 400);
    }

    if (buildingId) {
      const building = await this.repository.getBuilding(buildingId);
      if (!building || building.archivedAt || building.facilityId !== facilityId) {
        throw new DomainError("Building does not belong to the supplied facility.", 409);
      }
    }

    if (floorId) {
      const floor = await this.repository.getFloor(floorId);
      if (!floor || floor.archivedAt || floor.facilityId !== facilityId) {
        throw new DomainError("Floor does not belong to the supplied facility.", 409);
      }

      if (buildingId && floor.buildingId !== buildingId) {
        throw new DomainError("Floor does not belong to the supplied building.", 409);
      }
    }
  }

  private async requireServiceArea(id: string) {
    const record = await this.repository.getServiceArea(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Service area not found.", 404);
    }
    return record;
  }

  private async requireHours(id: string) {
    const record = await this.repository.getHours(id);
    if (!record || record.archivedAt) {
      throw new DomainError("Hours record not found.", 404);
    }
    return record;
  }
}
