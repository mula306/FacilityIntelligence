import { prisma, type Prisma } from "@facility/db";

const activeWhere = {
  archivedAt: null
} as const;

const contactInclude = {
  assignments: {
    where: activeWhere,
    orderBy: [
      { escalationPriority: "asc" },
      { createdAt: "asc" }
    ],
    include: {
      facility: true,
      contactRole: true
    }
  }
} as const;

const roleInclude = {
  assignments: {
    where: activeWhere,
    orderBy: [
      { escalationPriority: "asc" },
      { createdAt: "asc" }
    ],
    include: {
      contact: true,
      facility: true
    }
  }
} as const;

export class ContactsRepository {
  listContacts() {
    return prisma.contact.findMany({
      where: activeWhere,
      orderBy: [{ name: "asc" }, { lastName: "asc" }]
    });
  }

  getContact(id: string) {
    return prisma.contact.findUnique({
      where: { id },
      include: contactInclude
    });
  }

  createContact(data: Prisma.ContactCreateInput) {
    return prisma.contact.create({ data, include: contactInclude });
  }

  updateContact(id: string, data: Prisma.ContactUpdateInput) {
    return prisma.contact.update({
      where: { id },
      data,
      include: contactInclude
    });
  }

  listRoles() {
    return prisma.contactRole.findMany({
      where: activeWhere,
      orderBy: [{ name: "asc" }]
    });
  }

  getRole(id: string) {
    return prisma.contactRole.findUnique({
      where: { id },
      include: roleInclude
    });
  }

  createRole(data: Prisma.ContactRoleCreateInput) {
    return prisma.contactRole.create({ data, include: roleInclude });
  }

  updateRole(id: string, data: Prisma.ContactRoleUpdateInput) {
    return prisma.contactRole.update({
      where: { id },
      data,
      include: roleInclude
    });
  }

  listAssignments() {
    return prisma.facilityContactAssignment.findMany({
      where: activeWhere,
      orderBy: [
        { facilityId: "asc" },
        { contactRoleId: "asc" },
        { escalationPriority: "asc" },
        { createdAt: "asc" }
      ],
      include: {
        contact: true,
        contactRole: true,
        facility: true
      }
    });
  }

  getAssignment(id: string) {
    return prisma.facilityContactAssignment.findUnique({
      where: { id },
      include: {
        contact: true,
        contactRole: true,
        facility: true
      }
    });
  }

  createAssignment(data: Prisma.FacilityContactAssignmentCreateInput) {
    return prisma.facilityContactAssignment.create({
      data,
      include: {
        contact: true,
        contactRole: true,
        facility: true
      }
    });
  }

  updateAssignment(id: string, data: Prisma.FacilityContactAssignmentUpdateInput) {
    return prisma.facilityContactAssignment.update({
      where: { id },
      data,
      include: {
        contact: true,
        contactRole: true,
        facility: true
      }
    });
  }

  listFacilities() {
    return prisma.facility.findMany({
      where: activeWhere,
      orderBy: [{ name: "asc" }]
    });
  }

  listBuildings(facilityId?: string) {
    return prisma.building.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }]
    });
  }

  listFloors(buildingId?: string) {
    return prisma.floor.findMany({
      where: {
        ...activeWhere,
        ...(buildingId ? { buildingId } : {})
      },
      orderBy: [{ buildingId: "asc" }, { floorNumber: "asc" }]
    });
  }

  listZones(floorId?: string) {
    return prisma.zone.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { name: "asc" }]
    });
  }

  listRooms(floorId?: string) {
    return prisma.room.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { roomNumber: "asc" }, { name: "asc" }]
    });
  }

  getFacility(id: string) {
    return prisma.facility.findUnique({
      where: { id }
    });
  }

  getBuilding(id: string) {
    return prisma.building.findUnique({
      where: { id }
    });
  }

  getFloor(id: string) {
    return prisma.floor.findUnique({
      where: { id }
    });
  }

  getZone(id: string) {
    return prisma.zone.findUnique({
      where: { id }
    });
  }

  getRoom(id: string) {
    return prisma.room.findUnique({
      where: { id }
    });
  }

  async getBootstrapCounts() {
    const [contacts, roles, assignments] = await Promise.all([
      prisma.contact.count({ where: activeWhere }),
      prisma.contactRole.count({ where: activeWhere }),
      prisma.facilityContactAssignment.count({ where: activeWhere })
    ]);

    return {
      contacts,
      roles,
      assignments
    };
  }
}
