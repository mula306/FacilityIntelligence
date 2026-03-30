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
  TextInput
} from "@facility/ui";
import { ApiError, apiRequest } from "../../app/api";

interface Summary {
  facilities: number;
  buildings: number;
  floors: number;
  zones: number;
  rooms: number;
}

interface FacilityRecord {
  id: string;
  name: string;
  code: string | null;
  facilityType: string | null;
  city: string | null;
  region: string | null;
  status: string;
  updatedAt: string;
}

interface BuildingRecord {
  id: string;
  facilityId: string;
  name: string;
  code: string | null;
  buildingType: string | null;
  status: string;
}

interface FloorRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  name: string;
  code: string | null;
  floorNumber: number;
  canvasWidth: number | null;
  canvasHeight: number | null;
  status: string;
}

interface ZoneRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  name: string;
  code: string | null;
  zoneType: string | null;
  status: string;
}

interface RoomRecord {
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
  status: string;
}

interface BootstrapPayload {
  summary: Summary;
  lists: {
    facilities: FacilityRecord[];
    buildings: BuildingRecord[];
    floors: FloorRecord[];
    zones: ZoneRecord[];
    rooms: RoomRecord[];
  };
}

interface FacilityFormState {
  name: string;
  code: string;
  facilityType: string;
  city: string;
  region: string;
}

interface BuildingFormState {
  name: string;
  code: string;
  buildingType: string;
}

interface FloorFormState {
  name: string;
  code: string;
  floorNumber: string;
  canvasWidth: string;
  canvasHeight: string;
}

interface ZoneFormState {
  name: string;
  code: string;
  zoneType: string;
}

interface RoomFormState {
  name: string;
  code: string;
  roomNumber: string;
  roomType: string;
  zoneId: string;
  clinicalCriticality: string;
}

const blankFacilityForm: FacilityFormState = {
  name: "",
  code: "",
  facilityType: "",
  city: "",
  region: ""
};

const blankBuildingForm: BuildingFormState = {
  name: "",
  code: "",
  buildingType: ""
};

const blankFloorForm: FloorFormState = {
  name: "",
  code: "",
  floorNumber: "1",
  canvasWidth: "",
  canvasHeight: ""
};

const blankZoneForm: ZoneFormState = {
  name: "",
  code: "",
  zoneType: ""
};

const blankRoomForm: RoomFormState = {
  name: "",
  code: "",
  roomNumber: "",
  roomType: "",
  zoneId: "",
  clinicalCriticality: ""
};

function nullableString(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function nullableNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export function LocationsPage({
  token,
  hasWriteAccess
}: {
  token: string;
  hasWriteAccess: boolean;
}) {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [facilityForm, setFacilityForm] = useState<FacilityFormState>(blankFacilityForm);
  const [buildingForm, setBuildingForm] = useState<BuildingFormState>(blankBuildingForm);
  const [floorForm, setFloorForm] = useState<FloorFormState>(blankFloorForm);
  const [zoneForm, setZoneForm] = useState<ZoneFormState>(blankZoneForm);
  const [roomForm, setRoomForm] = useState<RoomFormState>(blankRoomForm);

  async function loadBootstrap() {
    const response = await apiRequest<{ data: BootstrapPayload }>("/api/locations/bootstrap", {}, token);
    setData(response.data);
  }

  useEffect(() => {
    loadBootstrap()
      .catch((error) => {
        setMessage(error instanceof ApiError ? error.message : "Unable to load locations.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const facilities = data?.lists.facilities ?? [];
  const buildings = data?.lists.buildings ?? [];
  const floors = data?.lists.floors ?? [];
  const zones = data?.lists.zones ?? [];
  const rooms = data?.lists.rooms ?? [];

  const selectedFacility = facilities.find((record) => record.id === selectedFacilityId) ?? null;
  const selectedBuilding = buildings.find((record) => record.id === selectedBuildingId) ?? null;
  const selectedFloor = floors.find((record) => record.id === selectedFloorId) ?? null;
  const selectedZone = zones.find((record) => record.id === selectedZoneId) ?? null;
  const selectedRoom = rooms.find((record) => record.id === selectedRoomId) ?? null;

  const filteredBuildings = useMemo(
    () => buildings.filter((building) => building.facilityId === selectedFacilityId),
    [buildings, selectedFacilityId]
  );
  const filteredFloors = useMemo(
    () => floors.filter((floor) => floor.buildingId === selectedBuildingId),
    [floors, selectedBuildingId]
  );
  const filteredZones = useMemo(
    () => zones.filter((zone) => zone.floorId === selectedFloorId),
    [zones, selectedFloorId]
  );
  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.floorId === selectedFloorId),
    [rooms, selectedFloorId]
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

  function selectFacility(record: FacilityRecord) {
    setSelectedFacilityId(record.id);
    setSelectedBuildingId("");
    setSelectedFloorId("");
    setSelectedZoneId("");
    setSelectedRoomId("");
    setFacilityForm({
      name: record.name,
      code: record.code ?? "",
      facilityType: record.facilityType ?? "",
      city: record.city ?? "",
      region: record.region ?? ""
    });
    setBuildingForm(blankBuildingForm);
    setFloorForm(blankFloorForm);
    setZoneForm(blankZoneForm);
    setRoomForm(blankRoomForm);
  }

  function selectBuilding(record: BuildingRecord) {
    setSelectedBuildingId(record.id);
    setSelectedFloorId("");
    setSelectedZoneId("");
    setSelectedRoomId("");
    setBuildingForm({
      name: record.name,
      code: record.code ?? "",
      buildingType: record.buildingType ?? ""
    });
    setFloorForm(blankFloorForm);
    setZoneForm(blankZoneForm);
    setRoomForm(blankRoomForm);
  }

  function selectFloor(record: FloorRecord) {
    setSelectedFloorId(record.id);
    setSelectedZoneId("");
    setSelectedRoomId("");
    setFloorForm({
      name: record.name,
      code: record.code ?? "",
      floorNumber: String(record.floorNumber),
      canvasWidth: record.canvasWidth ? String(record.canvasWidth) : "",
      canvasHeight: record.canvasHeight ? String(record.canvasHeight) : ""
    });
    setZoneForm(blankZoneForm);
    setRoomForm(blankRoomForm);
  }

  function selectZone(record: ZoneRecord) {
    setSelectedZoneId(record.id);
    setZoneForm({
      name: record.name,
      code: record.code ?? "",
      zoneType: record.zoneType ?? ""
    });
  }

  function selectRoom(record: RoomRecord) {
    setSelectedRoomId(record.id);
    setRoomForm({
      name: record.name,
      code: record.code ?? "",
      roomNumber: record.roomNumber ?? "",
      roomType: record.roomType ?? "",
      zoneId: record.zoneId ?? "",
      clinicalCriticality: record.clinicalCriticality ?? ""
    });
  }

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Location Hierarchy"
        description="Facility-first location management with consistent create, edit, and archive flows."
        actions={
          hasWriteAccess ? (
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedFacilityId("");
                setSelectedBuildingId("");
                setSelectedFloorId("");
                setSelectedZoneId("");
                setSelectedRoomId("");
                setFacilityForm(blankFacilityForm);
                setBuildingForm(blankBuildingForm);
                setFloorForm(blankFloorForm);
                setZoneForm(blankZoneForm);
                setRoomForm(blankRoomForm);
                setMessage("Forms reset for a new entry.");
              }}
            >
              Reset Editors
            </Button>
          ) : null
        }
      />

      {message ? (
        <PanelMessage tone="info" title="Workspace message">
          {message}
        </PanelMessage>
      ) : null}

      <StatStrip
        items={[
          { label: "Facilities", value: data?.summary.facilities ?? 0 },
          { label: "Buildings", value: data?.summary.buildings ?? 0 },
          { label: "Floors", value: data?.summary.floors ?? 0 },
          { label: "Zones", value: data?.summary.zones ?? 0 },
          { label: "Rooms", value: data?.summary.rooms ?? 0 }
        ]}
      />

      <SectionCard title="Selected Context" description="Current hierarchy focus">
        <div className="fi-badge-row">
          <Badge tone={selectedFacility ? "success" : "neutral"}>
            Facility: {selectedFacility?.name ?? "None"}
          </Badge>
          <Badge tone={selectedBuilding ? "success" : "neutral"}>
            Building: {selectedBuilding?.name ?? "None"}
          </Badge>
          <Badge tone={selectedFloor ? "success" : "neutral"}>
            Floor: {selectedFloor?.name ?? "None"}
          </Badge>
          <Badge tone={selectedZone ? "success" : "neutral"}>Zone: {selectedZone?.name ?? "None"}</Badge>
          <Badge tone={selectedRoom ? "success" : "neutral"}>Room: {selectedRoom?.name ?? "None"}</Badge>
        </div>
      </SectionCard>

      <div className="fi-page-stack">
        <SectionCard title="Facilities" description="Top-level organizational records">
          <div className="fi-admin-grid">
            <DataTable
              rows={facilities}
              onRowClick={selectFacility}
              empty={<EmptyState title="No facilities yet" description="Create the first facility to begin the hierarchy." />}
              columns={[
                { key: "name", header: "Facility", render: (row) => row.name },
                { key: "type", header: "Type", render: (row) => row.facilityType ?? "Unspecified" },
                { key: "city", header: "City", render: (row) => row.city ?? "Unknown" },
                { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> }
              ]}
            />
            <form
              className="fi-form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void runMutation(
                  () =>
                    selectedFacilityId
                      ? apiRequest(`/api/locations/facilities/${selectedFacilityId}`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            name: facilityForm.name,
                            code: nullableString(facilityForm.code),
                            facilityType: nullableString(facilityForm.facilityType),
                            city: nullableString(facilityForm.city),
                            region: nullableString(facilityForm.region)
                          })
                        }, token)
                      : apiRequest("/api/locations/facilities", {
                          method: "POST",
                          body: JSON.stringify({
                            name: facilityForm.name,
                            code: nullableString(facilityForm.code),
                            facilityType: nullableString(facilityForm.facilityType),
                            city: nullableString(facilityForm.city),
                            region: nullableString(facilityForm.region)
                          })
                        }, token),
                  selectedFacilityId ? "Facility updated." : "Facility created."
                );
              }}
            >
              <Field label="Facility Name">
                <TextInput value={facilityForm.name} onChange={(event) => setFacilityForm({ ...facilityForm, name: event.target.value })} required />
              </Field>
              <Field label="Code">
                <TextInput value={facilityForm.code} onChange={(event) => setFacilityForm({ ...facilityForm, code: event.target.value })} />
              </Field>
              <Field label="Type">
                <TextInput value={facilityForm.facilityType} onChange={(event) => setFacilityForm({ ...facilityForm, facilityType: event.target.value })} />
              </Field>
              <Field label="City">
                <TextInput value={facilityForm.city} onChange={(event) => setFacilityForm({ ...facilityForm, city: event.target.value })} />
              </Field>
              <Field label="Region">
                <TextInput value={facilityForm.region} onChange={(event) => setFacilityForm({ ...facilityForm, region: event.target.value })} />
              </Field>
              <div className="fi-form-actions">
                <Button type="submit" disabled={!hasWriteAccess}>
                  {selectedFacilityId ? "Save Facility" : "Create Facility"}
                </Button>
                {selectedFacilityId ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={!hasWriteAccess}
                    onClick={() => {
                      if (window.confirm("Archive this facility? Child buildings must be archived first.")) {
                        void runMutation(
                          () => apiRequest(`/api/locations/facilities/${selectedFacilityId}/archive`, { method: "POST" }, token),
                          "Facility archived."
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

        <SectionCard title="Buildings" description="Facilities own buildings">
          <div className="fi-admin-grid">
            <DataTable
              rows={filteredBuildings}
              onRowClick={selectBuilding}
              empty={
                <EmptyState
                  title="No buildings in scope"
                  description={selectedFacility ? "Create the first building for the selected facility." : "Select a facility first."}
                />
              }
              columns={[
                { key: "name", header: "Building", render: (row) => row.name },
                { key: "type", header: "Type", render: (row) => row.buildingType ?? "Unspecified" },
                { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> }
              ]}
            />
            <form
              className="fi-form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (!selectedFacilityId) {
                  setMessage("Select a facility before creating a building.");
                  return;
                }
                void runMutation(
                  () =>
                    selectedBuildingId
                      ? apiRequest(`/api/locations/buildings/${selectedBuildingId}`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            name: buildingForm.name,
                            code: nullableString(buildingForm.code),
                            buildingType: nullableString(buildingForm.buildingType)
                          })
                        }, token)
                      : apiRequest("/api/locations/buildings", {
                          method: "POST",
                          body: JSON.stringify({
                            facilityId: selectedFacilityId,
                            name: buildingForm.name,
                            code: nullableString(buildingForm.code),
                            buildingType: nullableString(buildingForm.buildingType)
                          })
                        }, token),
                  selectedBuildingId ? "Building updated." : "Building created."
                );
              }}
            >
              <Field label="Building Name">
                <TextInput value={buildingForm.name} onChange={(event) => setBuildingForm({ ...buildingForm, name: event.target.value })} required disabled={!selectedFacilityId} />
              </Field>
              <Field label="Code">
                <TextInput value={buildingForm.code} onChange={(event) => setBuildingForm({ ...buildingForm, code: event.target.value })} disabled={!selectedFacilityId} />
              </Field>
              <Field label="Type">
                <TextInput value={buildingForm.buildingType} onChange={(event) => setBuildingForm({ ...buildingForm, buildingType: event.target.value })} disabled={!selectedFacilityId} />
              </Field>
              <div className="fi-form-actions">
                <Button type="submit" disabled={!hasWriteAccess || !selectedFacilityId}>
                  {selectedBuildingId ? "Save Building" : "Create Building"}
                </Button>
                {selectedBuildingId ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={!hasWriteAccess}
                    onClick={() => {
                      if (window.confirm("Archive this building? Child floors must be archived first.")) {
                        void runMutation(
                          () => apiRequest(`/api/locations/buildings/${selectedBuildingId}/archive`, { method: "POST" }, token),
                          "Building archived."
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

        <SectionCard title="Floors" description="Buildings own floors and floor plan canvas dimensions">
          <div className="fi-admin-grid">
            <DataTable
              rows={filteredFloors}
              onRowClick={selectFloor}
              empty={
                <EmptyState
                  title="No floors in scope"
                  description={selectedBuilding ? "Create the first floor for the selected building." : "Select a building first."}
                />
              }
              columns={[
                { key: "name", header: "Floor", render: (row) => row.name },
                { key: "number", header: "Level", render: (row) => row.floorNumber },
                {
                  key: "canvas",
                  header: "Canvas",
                  render: (row) => row.canvasWidth && row.canvasHeight ? `${row.canvasWidth} x ${row.canvasHeight}` : "Not set"
                }
              ]}
            />
            <form
              className="fi-form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (!selectedFacilityId || !selectedBuildingId) {
                  setMessage("Select a facility and building before creating a floor.");
                  return;
                }
                void runMutation(
                  () =>
                    selectedFloorId
                      ? apiRequest(`/api/locations/floors/${selectedFloorId}`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            name: floorForm.name,
                            code: nullableString(floorForm.code),
                            floorNumber: Number(floorForm.floorNumber),
                            canvasWidth: nullableNumber(floorForm.canvasWidth),
                            canvasHeight: nullableNumber(floorForm.canvasHeight)
                          })
                        }, token)
                      : apiRequest("/api/locations/floors", {
                          method: "POST",
                          body: JSON.stringify({
                            facilityId: selectedFacilityId,
                            buildingId: selectedBuildingId,
                            name: floorForm.name,
                            code: nullableString(floorForm.code),
                            floorNumber: Number(floorForm.floorNumber),
                            canvasWidth: nullableNumber(floorForm.canvasWidth),
                            canvasHeight: nullableNumber(floorForm.canvasHeight)
                          })
                        }, token),
                  selectedFloorId ? "Floor updated." : "Floor created."
                );
              }}
            >
              <Field label="Floor Name">
                <TextInput value={floorForm.name} onChange={(event) => setFloorForm({ ...floorForm, name: event.target.value })} required disabled={!selectedBuildingId} />
              </Field>
              <Field label="Code">
                <TextInput value={floorForm.code} onChange={(event) => setFloorForm({ ...floorForm, code: event.target.value })} disabled={!selectedBuildingId} />
              </Field>
              <Field label="Floor Number">
                <TextInput value={floorForm.floorNumber} onChange={(event) => setFloorForm({ ...floorForm, floorNumber: event.target.value })} type="number" required disabled={!selectedBuildingId} />
              </Field>
              <Field label="Canvas Width">
                <TextInput value={floorForm.canvasWidth} onChange={(event) => setFloorForm({ ...floorForm, canvasWidth: event.target.value })} type="number" disabled={!selectedBuildingId} />
              </Field>
              <Field label="Canvas Height">
                <TextInput value={floorForm.canvasHeight} onChange={(event) => setFloorForm({ ...floorForm, canvasHeight: event.target.value })} type="number" disabled={!selectedBuildingId} />
              </Field>
              <div className="fi-form-actions">
                <Button type="submit" disabled={!hasWriteAccess || !selectedBuildingId}>
                  {selectedFloorId ? "Save Floor" : "Create Floor"}
                </Button>
                {selectedFloorId ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={!hasWriteAccess}
                    onClick={() => {
                      if (window.confirm("Archive this floor? Child zones and rooms must be archived first.")) {
                        void runMutation(
                          () => apiRequest(`/api/locations/floors/${selectedFloorId}/archive`, { method: "POST" }, token),
                          "Floor archived."
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

        <SectionCard title="Zones and Rooms" description="Floor-level operational spaces">
          <div className="fi-two-column">
            <div className="fi-page-stack">
              <SectionCard title="Rooms" description="Room records tied to floor and optional zone context">
                <div className="fi-admin-grid">
                  <DataTable
                    rows={filteredRooms}
                    onRowClick={selectRoom}
                    empty={<EmptyState title="No rooms in scope" description={selectedFloor ? "Create the first room for this floor." : "Select a floor first."} />}
                    columns={[
                      { key: "name", header: "Room", render: (row) => row.name },
                      { key: "number", header: "Number", render: (row) => row.roomNumber ?? "Not set" },
                      { key: "type", header: "Type", render: (row) => row.roomType ?? "Unspecified" }
                    ]}
                  />
                  <form
                    className="fi-form-grid"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!selectedFacilityId || !selectedBuildingId || !selectedFloorId) {
                        setMessage("Select facility, building, and floor before creating a room.");
                        return;
                      }
                      void runMutation(
                        () =>
                          selectedRoomId
                            ? apiRequest(`/api/locations/rooms/${selectedRoomId}`, {
                                method: "PATCH",
                                body: JSON.stringify({
                                  name: roomForm.name,
                                  code: nullableString(roomForm.code),
                                  roomNumber: nullableString(roomForm.roomNumber),
                                  roomType: nullableString(roomForm.roomType),
                                  zoneId: nullableString(roomForm.zoneId),
                                  clinicalCriticality: nullableString(roomForm.clinicalCriticality)
                                })
                              }, token)
                            : apiRequest("/api/locations/rooms", {
                                method: "POST",
                                body: JSON.stringify({
                                  facilityId: selectedFacilityId,
                                  buildingId: selectedBuildingId,
                                  floorId: selectedFloorId,
                                  zoneId: nullableString(roomForm.zoneId),
                                  name: roomForm.name,
                                  code: nullableString(roomForm.code),
                                  roomNumber: nullableString(roomForm.roomNumber),
                                  roomType: nullableString(roomForm.roomType),
                                  clinicalCriticality: nullableString(roomForm.clinicalCriticality)
                                })
                              }, token),
                        selectedRoomId ? "Room updated." : "Room created."
                      );
                    }}
                  >
                    <Field label="Room Name">
                      <TextInput value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} required disabled={!selectedFloorId} />
                    </Field>
                    <Field label="Code">
                      <TextInput value={roomForm.code} onChange={(event) => setRoomForm({ ...roomForm, code: event.target.value })} disabled={!selectedFloorId} />
                    </Field>
                    <Field label="Room Number">
                      <TextInput value={roomForm.roomNumber} onChange={(event) => setRoomForm({ ...roomForm, roomNumber: event.target.value })} disabled={!selectedFloorId} />
                    </Field>
                    <Field label="Room Type">
                      <TextInput value={roomForm.roomType} onChange={(event) => setRoomForm({ ...roomForm, roomType: event.target.value })} disabled={!selectedFloorId} />
                    </Field>
                    <Field label="Zone">
                      <SelectInput value={roomForm.zoneId} onChange={(event) => setRoomForm({ ...roomForm, zoneId: event.target.value })} disabled={!selectedFloorId}>
                        <option value="">No zone</option>
                        {filteredZones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Clinical Criticality">
                      <SelectInput value={roomForm.clinicalCriticality} onChange={(event) => setRoomForm({ ...roomForm, clinicalCriticality: event.target.value })} disabled={!selectedFloorId}>
                        <option value="">None</option>
                        <option value="low">Low</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </SelectInput>
                    </Field>
                    <div className="fi-form-actions">
                      <Button type="submit" disabled={!hasWriteAccess || !selectedFloorId}>
                        {selectedRoomId ? "Save Room" : "Create Room"}
                      </Button>
                      {selectedRoomId ? (
                        <Button
                          type="button"
                          variant="danger"
                          disabled={!hasWriteAccess}
                          onClick={() => {
                            if (window.confirm("Archive this room?")) {
                              void runMutation(
                                () => apiRequest(`/api/locations/rooms/${selectedRoomId}/archive`, { method: "POST" }, token),
                                "Room archived."
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
            </div>
            <div className="fi-page-stack">
              <SectionCard title="Rooms" description="Room records tied to floor and optional zone context">
                <div className="fi-admin-grid">
                  <DataTable
                    rows={filteredRooms}
                    onRowClick={selectRoom}
                    empty={<EmptyState title="No rooms in scope" description={selectedFloor ? "Create the first room for this floor." : "Select a floor first."} />}
                    columns={[
                      { key: "name", header: "Room", render: (row) => row.name },
                      { key: "number", header: "Number", render: (row) => row.roomNumber ?? "Not set" },
                      { key: "type", header: "Type", render: (row) => row.roomType ?? "Unspecified" }
                    ]}
                  />
                  <form
                    className="fi-form-grid"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!selectedFacilityId || !selectedBuildingId || !selectedFloorId) {
                        setMessage("Select facility, building, and floor before creating a room.");
                        return;
                      }
                      void runMutation(
                        () =>
                          selectedRoomId
                            ? apiRequest(`/api/locations/rooms/${selectedRoomId}`, {
                                method: "PATCH",
                                body: JSON.stringify({
                                  name: roomForm.name,
                                  code: nullableString(roomForm.code),
                                  roomNumber: nullableString(roomForm.roomNumber),
                                  roomType: nullableString(roomForm.roomType),
                                  zoneId: nullableString(roomForm.zoneId),
                                  clinicalCriticality: nullableString(roomForm.clinicalCriticality)
                                })
                              }, token)
                            : apiRequest("/api/locations/rooms", {
                                method: "POST",
                                body: JSON.stringify({
                                  facilityId: selectedFacilityId,
                                  buildingId: selectedBuildingId,
                                  floorId: selectedFloorId,
                                  zoneId: nullableString(roomForm.zoneId),
                                  name: roomForm.name,
                                  code: nullableString(roomForm.code),
                                  roomNumber: nullableString(roomForm.roomNumber),
                                  roomType: nullableString(roomForm.roomType),
                                  clinicalCriticality: nullableString(roomForm.clinicalCriticality)
                                })
                              }, token),
                        selectedRoomId ? "Room updated." : "Room created."
                      );
                    }}
                  >
                    <Field label="Room Name">
                      <TextInput value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} required disabled={!selectedFloorId} />
                    </Field>
                    <Field label="Code">
                      <TextInput value={roomForm.code} onChange={(event) => setRoomForm({ ...roomForm, code: event.target.value })} disabled={!selectedFloorId} />
                    </Field>
                    <Field label="Room Number">
                      <TextInput value={roomForm.roomNumber} onChange={(event) => setRoomForm({ ...roomForm, roomNumber: event.target.value })} disabled={!selectedFloorId} />
                    </Field>
                    <Field label="Room Type">
                      <TextInput value={roomForm.roomType} onChange={(event) => setRoomForm({ ...roomForm, roomType: event.target.value })} disabled={!selectedFloorId} />
                    </Field>
                    <Field label="Zone">
                      <SelectInput value={roomForm.zoneId} onChange={(event) => setRoomForm({ ...roomForm, zoneId: event.target.value })} disabled={!selectedFloorId}>
                        <option value="">No zone</option>
                        {filteredZones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Clinical Criticality">
                      <SelectInput value={roomForm.clinicalCriticality} onChange={(event) => setRoomForm({ ...roomForm, clinicalCriticality: event.target.value })} disabled={!selectedFloorId}>
                        <option value="">None</option>
                        <option value="low">Low</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </SelectInput>
                    </Field>
                    <div className="fi-form-actions">
                      <Button type="submit" disabled={!hasWriteAccess || !selectedFloorId}>
                        {selectedRoomId ? "Save Room" : "Create Room"}
                      </Button>
                      {selectedRoomId ? (
                        <Button
                          type="button"
                          variant="danger"
                          disabled={!hasWriteAccess}
                          onClick={() => {
                            if (window.confirm("Archive this room?")) {
                              void runMutation(
                                () => apiRequest(`/api/locations/rooms/${selectedRoomId}/archive`, { method: "POST" }, token),
                                "Room archived."
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
            </div>
          </div>
        </SectionCard>

        {selectedRoom ? (
          <SectionCard title="Selected Room Detail" description="Current room metadata">
            <DefinitionList
              items={[
                { label: "Room", value: selectedRoom.name },
                { label: "Room Number", value: selectedRoom.roomNumber ?? "Not set" },
                { label: "Type", value: selectedRoom.roomType ?? "Unspecified" },
                { label: "Criticality", value: selectedRoom.clinicalCriticality ?? "None" }
              ]}
            />
          </SectionCard>
        ) : null}
      </div>

      {loading ? <p className="fi-muted">Loading hierarchy...</p> : null}
    </div>
  );
}
