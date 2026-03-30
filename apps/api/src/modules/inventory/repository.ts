import { Prisma, prisma } from "@facility/db";

const activeWhere = {
  archivedAt: null
} as const;

const deviceTypeInclude = {
  devices: {
    where: activeWhere
  }
} as const;

const deviceInclude = {
  deviceType: true,
  facility: true,
  building: true,
  room: true
} as const;

export type InventoryDeviceTypeRecord = Prisma.DeviceTypeGetPayload<{
  include: typeof deviceTypeInclude;
}>;

export type InventoryDeviceRecord = Prisma.DeviceGetPayload<{
  include: typeof deviceInclude;
}>;

export type InventoryFacilityRecord = Prisma.FacilityGetPayload<{}>;
export type InventoryBuildingRecord = Prisma.BuildingGetPayload<{}>;
export type InventoryFloorRecord = Prisma.FloorGetPayload<{}>;
export type InventoryZoneRecord = Prisma.ZoneGetPayload<{}>;
export type InventoryRoomRecord = Prisma.RoomGetPayload<{}>;
export type InventoryContactRecord = Prisma.ContactGetPayload<{}>;

export class InventoryRepository {
  listFacilities(): Promise<InventoryFacilityRecord[]> {
    return prisma.facility.findMany({
      where: activeWhere,
      orderBy: { name: "asc" }
    });
  }

  getFacility(id: string): Promise<InventoryFacilityRecord | null> {
    return prisma.facility.findUnique({ where: { id } });
  }

  listBuildings(facilityId?: string): Promise<InventoryBuildingRecord[]> {
    return prisma.building.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }]
    });
  }

  getBuilding(id: string): Promise<InventoryBuildingRecord | null> {
    return prisma.building.findUnique({ where: { id } });
  }

  listFloors(buildingId?: string): Promise<InventoryFloorRecord[]> {
    return prisma.floor.findMany({
      where: {
        ...activeWhere,
        ...(buildingId ? { buildingId } : {})
      },
      orderBy: [{ buildingId: "asc" }, { floorNumber: "asc" }]
    });
  }

  getFloor(id: string): Promise<InventoryFloorRecord | null> {
    return prisma.floor.findUnique({ where: { id } });
  }

  listZones(floorId?: string): Promise<InventoryZoneRecord[]> {
    return prisma.zone.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { name: "asc" }]
    });
  }

  getZone(id: string): Promise<InventoryZoneRecord | null> {
    return prisma.zone.findUnique({ where: { id } });
  }

  listRooms(floorId?: string): Promise<InventoryRoomRecord[]> {
    return prisma.room.findMany({
      where: {
        ...activeWhere,
        ...(floorId ? { floorId } : {})
      },
      orderBy: [{ floorId: "asc" }, { roomNumber: "asc" }, { name: "asc" }]
    });
  }

  getRoom(id: string): Promise<InventoryRoomRecord | null> {
    return prisma.room.findUnique({ where: { id } });
  }

  getContact(id: string): Promise<InventoryContactRecord | null> {
    return prisma.contact.findUnique({ where: { id } });
  }

  listDeviceTypes(): Promise<InventoryDeviceTypeRecord[]> {
    return prisma.deviceType.findMany({
      where: activeWhere,
      orderBy: { name: "asc" },
      include: deviceTypeInclude
    });
  }

  getDeviceType(id: string): Promise<InventoryDeviceTypeRecord | null> {
    return prisma.deviceType.findUnique({
      where: { id },
      include: deviceTypeInclude
    });
  }

  countDevicesByType(deviceTypeId: string): Promise<number> {
    return prisma.device.count({
      where: {
        archivedAt: null,
        deviceTypeId
      }
    });
  }

  listDevices(facilityId?: string): Promise<InventoryDeviceRecord[]> {
    return prisma.device.findMany({
      where: {
        ...activeWhere,
        ...(facilityId ? { facilityId } : {})
      },
      orderBy: [{ facilityId: "asc" }, { name: "asc" }],
      include: deviceInclude
    });
  }

  getDevice(id: string): Promise<InventoryDeviceRecord | null> {
    return prisma.device.findUnique({
      where: { id },
      include: deviceInclude
    });
  }

  createDeviceType(data: Prisma.DeviceTypeUncheckedCreateInput): Promise<InventoryDeviceTypeRecord> {
    return prisma.deviceType.create({
      data,
      include: deviceTypeInclude
    });
  }

  updateDeviceType(id: string, data: Prisma.DeviceTypeUncheckedUpdateInput): Promise<InventoryDeviceTypeRecord> {
    return prisma.deviceType.update({
      where: { id },
      data,
      include: deviceTypeInclude
    });
  }

  createDevice(data: Prisma.DeviceUncheckedCreateInput): Promise<InventoryDeviceRecord> {
    return prisma.device.create({ data, include: deviceInclude });
  }

  updateDevice(id: string, data: Prisma.DeviceUncheckedUpdateInput): Promise<InventoryDeviceRecord> {
    return prisma.device.update({
      where: { id },
      data,
      include: deviceInclude
    });
  }
}
