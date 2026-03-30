import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  DefinitionList,
  EmptyState,
  Field,
  PageHeader,
  PanelMessage,
  SectionCard,
  SelectInput,
  StatStrip,
  TextInput,
  TextareaInput
} from "@facility/ui";
import { ApiError, apiRequest } from "../../app/api";

interface Summary {
  deviceTypes: number;
  devices: number;
  facilities: number;
  buildings: number;
  floors: number;
  zones: number;
  rooms: number;
}

interface FacilityRecord {
  id: string;
  name: string;
}

interface BuildingRecord {
  id: string;
  facilityId: string;
  name: string;
}

interface FloorRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  name: string;
}

interface ZoneRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  name: string;
}

interface RoomRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  name: string;
}

interface DeviceTypeRecord {
  id: string;
  name: string;
  code: string | null;
  notes: string | null;
  manufacturer: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deviceCount: number;
}

interface DeviceRecord {
  id: string;
  name: string;
  code: string | null;
  facilityId: string;
  facilityName: string;
  buildingId: string | null;
  buildingName: string | null;
  floorId: string | null;
  floorName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  roomId: string | null;
  roomName: string | null;
  deviceTypeId: string;
  deviceTypeName: string;
  hostname: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  lifecycleState: string | null;
  ownerContactId: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  archivedBy: string | null;
}

interface BootstrapPayload {
  summary: Summary;
  lists: {
    deviceTypes: DeviceTypeRecord[];
    devices: DeviceRecord[];
    facilities: FacilityRecord[];
    buildings: BuildingRecord[];
    floors: FloorRecord[];
    zones: ZoneRecord[];
    rooms: RoomRecord[];
  };
}

interface DeviceTypeFormState {
  name: string;
  code: string;
  manufacturer: string;
  notes: string;
  status: string;
}

interface DeviceFormState {
  name: string;
  code: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string;
  roomId: string;
  deviceTypeId: string;
  hostname: string;
  serialNumber: string;
  assetTag: string;
  ipAddress: string;
  macAddress: string;
  lifecycleState: string;
  ownerContactId: string;
  notes: string;
  status: string;
}

const blankDeviceTypeForm: DeviceTypeFormState = {
  name: "",
  code: "",
  manufacturer: "",
  notes: "",
  status: "active"
};

const blankDeviceForm: DeviceFormState = {
  name: "",
  code: "",
  facilityId: "",
  buildingId: "",
  floorId: "",
  zoneId: "",
  roomId: "",
  deviceTypeId: "",
  hostname: "",
  serialNumber: "",
  assetTag: "",
  ipAddress: "",
  macAddress: "",
  lifecycleState: "",
  ownerContactId: "",
  notes: "",
  status: "active"
};

function nullableString(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function nullableNumber(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function badgeTone(status: string) {
  if (status === "archived") {
    return "danger" as const;
  }

  if (status === "inactive") {
    return "warning" as const;
  }

  return "success" as const;
}

function locationPath(record: DeviceRecord) {
  const pieces = [record.facilityName, record.buildingName, record.floorName, record.roomName].filter(Boolean);
  return pieces.length > 0 ? pieces.join(" / ") : "Unassigned";
}

export function InventoryPage({
  token,
  hasReadAccess,
  hasWriteAccess
}: {
  token: string;
  hasReadAccess: boolean;
  hasWriteAccess: boolean;
}) {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<string>("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [deviceTypeForm, setDeviceTypeForm] = useState<DeviceTypeFormState>(blankDeviceTypeForm);
  const [deviceForm, setDeviceForm] = useState<DeviceFormState>(blankDeviceForm);

  async function loadBootstrap() {
    const response = await apiRequest<{ data: BootstrapPayload }>("/api/inventory/bootstrap", {}, token);
    setData(response.data);
  }

  useEffect(() => {
    if (!hasReadAccess) {
      setLoading(false);
      return;
    }

    loadBootstrap()
      .catch((error) => {
        setMessage(error instanceof ApiError ? error.message : "Unable to load inventory.");
      })
      .finally(() => setLoading(false));
  }, [hasReadAccess, token]);

  const facilities = data?.lists.facilities ?? [];
  const buildings = data?.lists.buildings ?? [];
  const floors = data?.lists.floors ?? [];
  const zones = data?.lists.zones ?? [];
  const rooms = data?.lists.rooms ?? [];
  const deviceTypes = data?.lists.deviceTypes ?? [];
  const devices = data?.lists.devices ?? [];

  const selectedDeviceType = deviceTypes.find((record) => record.id === selectedDeviceTypeId) ?? null;
  const selectedDevice = devices.find((record) => record.id === selectedDeviceId) ?? null;

  const filteredBuildings = useMemo(
    () => buildings.filter((building) => building.facilityId === deviceForm.facilityId),
    [buildings, deviceForm.facilityId]
  );
  const filteredFloors = useMemo(
    () => floors.filter((floor) => floor.buildingId === deviceForm.buildingId),
    [floors, deviceForm.buildingId]
  );
  const filteredZones = useMemo(
    () => zones.filter((zone) => zone.floorId === deviceForm.floorId),
    [zones, deviceForm.floorId]
  );
  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.floorId === deviceForm.floorId),
    [rooms, deviceForm.floorId]
  );

  async function runMutation<T>(work: () => Promise<T>, successMessage: string) {
    try {
      await work();
      await loadBootstrap();
      setMessage(successMessage);
    } catch (error: unknown) {
      setMessage(error instanceof ApiError ? error.message : "Unable to save changes.");
    }
  }

  function resetForms() {
    setSelectedDeviceTypeId("");
    setSelectedDeviceId("");
    setDeviceTypeForm(blankDeviceTypeForm);
    setDeviceForm(blankDeviceForm);
    setMessage("Forms reset for a new entry.");
  }

  function selectDeviceType(record: DeviceTypeRecord) {
    setSelectedDeviceTypeId(record.id);
    setDeviceTypeForm({
      name: record.name,
      code: record.code ?? "",
      manufacturer: record.manufacturer ?? "",
      notes: record.notes ?? "",
      status: record.status
    });
  }

  function selectDevice(record: DeviceRecord) {
    setSelectedDeviceId(record.id);
    setDeviceForm({
      name: record.name,
      code: record.code ?? "",
      facilityId: record.facilityId,
      buildingId: record.buildingId ?? "",
      floorId: record.floorId ?? "",
      zoneId: record.zoneId ?? "",
      roomId: record.roomId ?? "",
      deviceTypeId: record.deviceTypeId,
      hostname: record.hostname ?? "",
      serialNumber: record.serialNumber ?? "",
      assetTag: record.assetTag ?? "",
      ipAddress: record.ipAddress ?? "",
      macAddress: record.macAddress ?? "",
      lifecycleState: record.lifecycleState ?? "",
      ownerContactId: record.ownerContactId ?? "",
      notes: record.notes ?? "",
      status: record.status
    });
  }

  if (!hasReadAccess) {
    return (
      <div className="fi-page-stack">
        <PageHeader
          title="Device and Computer Inventory"
          description="Location-linked device tracking for healthcare facilities."
        />
        <PanelMessage tone="warning" title="Access required">
          This workspace expects the <strong>inventory:read</strong> permission.
        </PanelMessage>
      </div>
    );
  }

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Device and Computer Inventory"
        description="Manage device types, devices, and location-linked placement records."
        actions={
          <Button variant="secondary" onClick={resetForms}>
            Reset Editors
          </Button>
        }
      />

      {message ? (
        <PanelMessage tone="info" title="Workspace message">
          {message}
        </PanelMessage>
      ) : null}

      <StatStrip
        items={[
          { label: "Device Types", value: data?.summary.deviceTypes ?? 0 },
          { label: "Devices", value: data?.summary.devices ?? 0 },
          { label: "Facilities", value: data?.summary.facilities ?? 0 },
          { label: "Rooms", value: data?.summary.rooms ?? 0 }
        ]}
      />

      <SectionCard title="Selected Context" description="Current inventory focus">
        <DefinitionList
          items={[
            { label: "Device Type", value: selectedDeviceType?.name ?? "None" },
            { label: "Device", value: selectedDevice?.name ?? "None" },
            { label: "Facility", value: deviceForm.facilityId || "None" },
            { label: "Building", value: deviceForm.buildingId || "None" },
            { label: "Floor", value: deviceForm.floorId || "None" },
            { label: "Room", value: deviceForm.roomId || "None" }
          ]}
        />
      </SectionCard>

      <SectionCard title="Device Types" description="Reusable classifications for inventory records">
        <div className="fi-admin-grid">
          <DataTable
            rows={deviceTypes}
            onRowClick={selectDeviceType}
            empty={
              <EmptyState
                title="No device types yet"
                description="Create the first device type to standardize inventory records."
              />
            }
            columns={[
              { key: "name", header: "Type", render: (row) => row.name },
              { key: "manufacturer", header: "Manufacturer", render: (row) => row.manufacturer ?? "Unspecified" },
              { key: "devices", header: "Devices", render: (row) => row.deviceCount },
              {
                key: "status",
                header: "Status",
                render: (row) => <Badge tone={badgeTone(row.status)}>{row.status}</Badge>
              }
            ]}
          />
          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void runMutation(
                () =>
                  selectedDeviceTypeId
                    ? apiRequest(`/api/inventory/device-types/${selectedDeviceTypeId}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          name: deviceTypeForm.name,
                          code: nullableString(deviceTypeForm.code),
                          manufacturer: nullableString(deviceTypeForm.manufacturer),
                          notes: nullableString(deviceTypeForm.notes),
                          status: deviceTypeForm.status
                        })
                      }, token)
                    : apiRequest("/api/inventory/device-types", {
                        method: "POST",
                        body: JSON.stringify({
                          name: deviceTypeForm.name,
                          code: nullableString(deviceTypeForm.code),
                          manufacturer: nullableString(deviceTypeForm.manufacturer),
                          notes: nullableString(deviceTypeForm.notes),
                          status: deviceTypeForm.status
                        })
                      }, token),
                selectedDeviceTypeId ? "Device type updated." : "Device type created."
              );
            }}
          >
            <Field label="Device Type Name">
              <TextInput
                value={deviceTypeForm.name}
                onChange={(event) => setDeviceTypeForm({ ...deviceTypeForm, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Code">
              <TextInput
                value={deviceTypeForm.code}
                onChange={(event) => setDeviceTypeForm({ ...deviceTypeForm, code: event.target.value })}
              />
            </Field>
            <Field label="Manufacturer">
              <TextInput
                value={deviceTypeForm.manufacturer}
                onChange={(event) => setDeviceTypeForm({ ...deviceTypeForm, manufacturer: event.target.value })}
              />
            </Field>
            <Field label="Notes">
              <TextareaInput
                value={deviceTypeForm.notes}
                onChange={(event) => setDeviceTypeForm({ ...deviceTypeForm, notes: event.target.value })}
              />
            </Field>
            <Field label="Status">
              <SelectInput
                value={deviceTypeForm.status}
                onChange={(event) => setDeviceTypeForm({ ...deviceTypeForm, status: event.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess}>
                {selectedDeviceTypeId ? "Save Device Type" : "Create Device Type"}
              </Button>
              {selectedDeviceTypeId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this device type? Devices must be reassigned first.")) {
                      void runMutation(
                        () => apiRequest(`/api/inventory/device-types/${selectedDeviceTypeId}/archive`, { method: "POST" }, token),
                        "Device type archived."
                      );
                    }
                  }}
                >
                  Archive
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Devices" description="Asset records tied to facility, floor, room, and device type">
        <div className="fi-admin-grid">
          <DataTable
            rows={devices}
            onRowClick={selectDevice}
            empty={
              <EmptyState
                title="No devices yet"
                description="Create the first device record to track inventory placement."
              />
            }
            columns={[
              { key: "name", header: "Device", render: (row) => row.name },
              { key: "type", header: "Type", render: (row) => row.deviceTypeName },
              { key: "location", header: "Location", render: (row) => locationPath(row) },
              { key: "lifecycle", header: "Lifecycle", render: (row) => row.lifecycleState ?? "Unspecified" },
              {
                key: "status",
                header: "Status",
                render: (row) => <Badge tone={badgeTone(row.status)}>{row.status}</Badge>
              }
            ]}
          />

          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void runMutation(
                () =>
                  selectedDeviceId
                    ? apiRequest(`/api/inventory/devices/${selectedDeviceId}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          name: deviceForm.name,
                          code: nullableString(deviceForm.code),
                          facilityId: deviceForm.facilityId,
                          buildingId: nullableString(deviceForm.buildingId),
                          floorId: nullableString(deviceForm.floorId),
                          zoneId: nullableString(deviceForm.zoneId),
                          roomId: nullableString(deviceForm.roomId),
                          deviceTypeId: deviceForm.deviceTypeId,
                          hostname: nullableString(deviceForm.hostname),
                          serialNumber: nullableString(deviceForm.serialNumber),
                          assetTag: nullableString(deviceForm.assetTag),
                          ipAddress: nullableString(deviceForm.ipAddress),
                          macAddress: nullableString(deviceForm.macAddress),
                          lifecycleState: nullableString(deviceForm.lifecycleState),
                          ownerContactId: nullableString(deviceForm.ownerContactId),
                          notes: nullableString(deviceForm.notes),
                          status: deviceForm.status
                        })
                      }, token)
                    : apiRequest("/api/inventory/devices", {
                        method: "POST",
                        body: JSON.stringify({
                          name: deviceForm.name,
                          code: nullableString(deviceForm.code),
                          facilityId: deviceForm.facilityId,
                          buildingId: nullableString(deviceForm.buildingId),
                          floorId: nullableString(deviceForm.floorId),
                          zoneId: nullableString(deviceForm.zoneId),
                          roomId: nullableString(deviceForm.roomId),
                          deviceTypeId: deviceForm.deviceTypeId,
                          hostname: nullableString(deviceForm.hostname),
                          serialNumber: nullableString(deviceForm.serialNumber),
                          assetTag: nullableString(deviceForm.assetTag),
                          ipAddress: nullableString(deviceForm.ipAddress),
                          macAddress: nullableString(deviceForm.macAddress),
                          lifecycleState: nullableString(deviceForm.lifecycleState),
                          ownerContactId: nullableString(deviceForm.ownerContactId),
                          notes: nullableString(deviceForm.notes),
                          status: deviceForm.status
                        })
                      }, token),
                selectedDeviceId ? "Device updated." : "Device created."
              );
            }}
          >
            <Field label="Facility">
              <SelectInput
                value={deviceForm.facilityId}
                onChange={(event) => {
                  const facilityId = event.target.value;
                  setDeviceForm({
                    ...deviceForm,
                    facilityId,
                    buildingId: "",
                    floorId: "",
                    zoneId: "",
                    roomId: ""
                  });
                }}
                required
              >
                <option value="">Select a facility</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Building">
              <SelectInput
                value={deviceForm.buildingId}
                onChange={(event) => {
                  const buildingId = event.target.value;
                  setDeviceForm({
                    ...deviceForm,
                    buildingId,
                    floorId: "",
                    zoneId: "",
                    roomId: ""
                  });
                }}
                disabled={!deviceForm.facilityId}
              >
                <option value="">Select a building</option>
                {filteredBuildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Floor">
              <SelectInput
                value={deviceForm.floorId}
                onChange={(event) => {
                  const floorId = event.target.value;
                  setDeviceForm({
                    ...deviceForm,
                    floorId,
                    zoneId: "",
                    roomId: ""
                  });
                }}
                disabled={!deviceForm.buildingId}
              >
                <option value="">Select a floor</option>
                {filteredFloors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Zone">
              <SelectInput
                value={deviceForm.zoneId}
                onChange={(event) => setDeviceForm({ ...deviceForm, zoneId: event.target.value })}
                disabled={!deviceForm.floorId}
              >
                <option value="">No zone</option>
                {filteredZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Room">
              <SelectInput
                value={deviceForm.roomId}
                onChange={(event) => {
                  const roomId = event.target.value;
                  const room = rooms.find((record) => record.id === roomId) ?? null;
                  setDeviceForm({
                    ...deviceForm,
                    roomId,
                    zoneId: room?.zoneId ?? deviceForm.zoneId
                  });
                }}
                disabled={!deviceForm.floorId}
              >
                <option value="">No room</option>
                {filteredRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Device Type">
              <SelectInput
                value={deviceForm.deviceTypeId}
                onChange={(event) => setDeviceForm({ ...deviceForm, deviceTypeId: event.target.value })}
                required
              >
                <option value="">Select a device type</option>
                {deviceTypes.map((deviceType) => (
                  <option key={deviceType.id} value={deviceType.id}>
                    {deviceType.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Device Name">
              <TextInput
                value={deviceForm.name}
                onChange={(event) => setDeviceForm({ ...deviceForm, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Code">
              <TextInput
                value={deviceForm.code}
                onChange={(event) => setDeviceForm({ ...deviceForm, code: event.target.value })}
              />
            </Field>
            <Field label="Hostname">
              <TextInput
                value={deviceForm.hostname}
                onChange={(event) => setDeviceForm({ ...deviceForm, hostname: event.target.value })}
              />
            </Field>
            <Field label="Serial Number">
              <TextInput
                value={deviceForm.serialNumber}
                onChange={(event) => setDeviceForm({ ...deviceForm, serialNumber: event.target.value })}
              />
            </Field>
            <Field label="Asset Tag">
              <TextInput
                value={deviceForm.assetTag}
                onChange={(event) => setDeviceForm({ ...deviceForm, assetTag: event.target.value })}
              />
            </Field>
            <Field label="IP Address">
              <TextInput
                value={deviceForm.ipAddress}
                onChange={(event) => setDeviceForm({ ...deviceForm, ipAddress: event.target.value })}
              />
            </Field>
            <Field label="MAC Address">
              <TextInput
                value={deviceForm.macAddress}
                onChange={(event) => setDeviceForm({ ...deviceForm, macAddress: event.target.value })}
              />
            </Field>
            <Field label="Lifecycle State">
              <TextInput
                value={deviceForm.lifecycleState}
                onChange={(event) => setDeviceForm({ ...deviceForm, lifecycleState: event.target.value })}
              />
            </Field>
            <Field label="Owner Contact ID">
              <TextInput
                value={deviceForm.ownerContactId}
                onChange={(event) => setDeviceForm({ ...deviceForm, ownerContactId: event.target.value })}
              />
            </Field>
            <Field label="Notes">
              <TextareaInput
                value={deviceForm.notes}
                onChange={(event) => setDeviceForm({ ...deviceForm, notes: event.target.value })}
              />
            </Field>
            <Field label="Status">
              <SelectInput
                value={deviceForm.status}
                onChange={(event) => setDeviceForm({ ...deviceForm, status: event.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess || !deviceForm.facilityId || !deviceForm.deviceTypeId}>
                {selectedDeviceId ? "Save Device" : "Create Device"}
              </Button>
              {selectedDeviceId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this device?")) {
                      void runMutation(
                        () => apiRequest(`/api/inventory/devices/${selectedDeviceId}/archive`, { method: "POST" }, token),
                        "Device archived."
                      );
                    }
                  }}
                >
                  Archive
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </SectionCard>

      {loading ? <p className="fi-muted">Loading inventory...</p> : null}
    </div>
  );
}
