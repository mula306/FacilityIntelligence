import type { Prisma } from "@facility/db";

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function mapRole(role: {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  permissionsJson: string;
}) {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    status: role.status,
    permissions: parseJson<string[]>(role.permissionsJson) ?? []
  };
}

type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: true;
      };
    };
  };
}>;

export function mapAuthUser(user: UserWithRoles) {
  const roles = user.roles.map((assignment: UserWithRoles["roles"][number]) => mapRole(assignment.role));

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    roleIds: roles.map((role: { id: string }) => role.id),
    roles,
    lastLoginAt: toIsoString(user.lastLoginAt)
  };
}

export function mapAuditLog(log: {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: Date;
  actorUserId: string | null;
}) {
  return {
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    summary: log.summary,
    createdAt: log.createdAt.toISOString(),
    actorUserId: log.actorUserId
  };
}

function mapBaseLocation<T extends {
  id: string;
  name: string;
  code: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
}>(record: T) {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    notes: record.notes,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIsoString(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

export function mapFacility(record: {
  id: string;
  name: string;
  code: string | null;
  shortName: string | null;
  facilityType: string | null;
  campusName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
  timezone: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
}) {
  return {
    ...mapBaseLocation(record),
    shortName: record.shortName,
    facilityType: record.facilityType,
    campusName: record.campusName,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    region: record.region,
    postalCode: record.postalCode,
    countryCode: record.countryCode,
    timezone: record.timezone
  };
}

export function mapBuilding(record: {
  id: string;
  facilityId: string;
  name: string;
  code: string | null;
  buildingType: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
}) {
  return {
    ...mapBaseLocation(record),
    facilityId: record.facilityId,
    buildingType: record.buildingType
  };
}

export function mapFloor(record: {
  id: string;
  facilityId: string;
  buildingId: string;
  name: string;
  code: string | null;
  floorNumber: number;
  planImageUrl: string | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
}) {
  return {
    ...mapBaseLocation(record),
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorNumber: record.floorNumber,
    planImageUrl: record.planImageUrl,
    canvasWidth: record.canvasWidth,
    canvasHeight: record.canvasHeight
  };
}

export function mapZone(record: {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  name: string;
  code: string | null;
  zoneType: string | null;
  geometryJson: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
}) {
  return {
    ...mapBaseLocation(record),
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorId: record.floorId,
    zoneType: record.zoneType,
    geometry: parseJson(record.geometryJson)
  };
}

export function mapRoom(record: {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  name: string;
  code: string | null;
  roomNumber: string | null;
  roomType: string | null;
  clinicalCriticality: string | null;
  geometryJson: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
}) {
  return {
    ...mapBaseLocation(record),
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorId: record.floorId,
    zoneId: record.zoneId,
    roomNumber: record.roomNumber,
    roomType: record.roomType,
    clinicalCriticality: record.clinicalCriticality,
    geometry: parseJson(record.geometryJson)
  };
}
