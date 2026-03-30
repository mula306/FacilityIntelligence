function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export interface FacilityOption {
  id: string;
  name: string;
  code: string | null;
}

export interface BuildingOption {
  id: string;
  facilityId: string;
  name: string;
  code: string | null;
}

export interface FloorOption {
  id: string;
  facilityId: string;
  buildingId: string;
  name: string;
  code: string | null;
  floorNumber: number;
}

export interface ZoneOption {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  name: string;
  code: string | null;
}

export interface RoomOption {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  name: string;
  code: string | null;
  roomNumber: string | null;
}

export interface ContactSummary {
  id: string;
  name: string;
  code: string | null;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  organization: string | null;
  notes: string | null;
  status: string;
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
}

export interface ContactRoleSummary {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  notes: string | null;
  status: string;
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
}

export interface AssignmentSummary {
  id: string;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
  contactId: string;
  contactRoleId: string;
  contactName: string;
  contactRoleName: string;
  facilityName: string;
  buildingName: string | null;
  floorName: string | null;
  zoneName: string | null;
  roomName: string | null;
  escalationPriority: number | null;
  isPrimary: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
}

export function mapContact(record: {
  id: string;
  name: string;
  code: string | null;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  organization: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
}, assignmentCount = 0): ContactSummary {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    firstName: record.firstName,
    lastName: record.lastName,
    title: record.title,
    email: record.email,
    phone: record.phone,
    mobilePhone: record.mobilePhone,
    organization: record.organization,
    notes: record.notes,
    status: record.status,
    assignmentCount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIsoString(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

export function mapRole(record: {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
}, assignmentCount = 0): ContactRoleSummary {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    description: record.description,
    notes: record.notes,
    status: record.status,
    assignmentCount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIsoString(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

export function mapAssignment(record: {
  id: string;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
  contactId: string;
  contactRoleId: string;
  escalationPriority: number | null;
  isPrimary: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
  contact: { name: string };
  contactRole: { name: string };
  facility: { name: string };
}, labels: {
  buildingName?: string | null;
  floorName?: string | null;
  zoneName?: string | null;
  roomName?: string | null;
} = {}): AssignmentSummary {
  return {
    id: record.id,
    facilityId: record.facilityId,
    buildingId: record.buildingId,
    floorId: record.floorId,
    zoneId: record.zoneId,
    roomId: record.roomId,
    contactId: record.contactId,
    contactRoleId: record.contactRoleId,
    contactName: record.contact.name,
    contactRoleName: record.contactRole.name,
    facilityName: record.facility.name,
    buildingName: labels.buildingName ?? null,
    floorName: labels.floorName ?? null,
    zoneName: labels.zoneName ?? null,
    roomName: labels.roomName ?? null,
    escalationPriority: record.escalationPriority,
    isPrimary: record.isPrimary,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    archivedAt: toIsoString(record.archivedAt),
    archivedBy: record.archivedBy
  };
}

export function mapFacility(record: FacilityOption) {
  return record;
}

export function mapBuilding(record: BuildingOption) {
  return record;
}

export function mapFloor(record: FloorOption) {
  return record;
}

export function mapZone(record: ZoneOption) {
  return record;
}

export function mapRoom(record: RoomOption) {
  return record;
}
