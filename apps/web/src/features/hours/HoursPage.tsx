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

interface FacilityRecord {
  id: string;
  name: string;
  status: string;
  code: string | null;
}

interface BuildingRecord {
  id: string;
  name: string;
  status: string;
  facilityId: string;
  code: string | null;
}

interface FloorRecord {
  id: string;
  name: string;
  status: string;
  facilityId: string;
  buildingId: string;
  code: string | null;
  floorNumber: number;
}

interface LocationBootstrap {
  summary: {
    facilities: number;
    buildings: number;
    floors: number;
    zones: number;
    rooms: number;
  };
  lists: {
    facilities: FacilityRecord[];
    buildings: BuildingRecord[];
    floors: FloorRecord[];
  };
}

interface ServiceAreaRecord {
  id: string;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  name: string;
  code: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface HoursRecord {
  id: string;
  facilityId: string;
  serviceAreaId: string | null;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  overnight: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface HoursBootstrap {
  summary: {
    serviceAreas: number;
    hours: number;
    overnightHours: number;
  };
  lists: {
    serviceAreas: ServiceAreaRecord[];
    hours: HoursRecord[];
  };
}

interface ServiceAreaFormState {
  name: string;
  code: string;
  notes: string;
  buildingId: string;
  floorId: string;
  status: string;
}

interface HoursFormState {
  serviceAreaId: string;
  dayOfWeek: string;
  opensAt: string;
  closesAt: string;
  overnight: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
}

const blankServiceAreaForm: ServiceAreaFormState = {
  name: "",
  code: "",
  notes: "",
  buildingId: "",
  floorId: "",
  status: "active"
};

const blankHoursForm: HoursFormState = {
  serviceAreaId: "",
  dayOfWeek: "1",
  opensAt: "08:00",
  closesAt: "17:00",
  overnight: false,
  effectiveFrom: "",
  effectiveTo: "",
  status: "active"
};

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
];

function emptyToNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function toIsoDateTime(value: string) {
  return value.trim() === "" ? null : new Date(value).toISOString();
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "active") {
    return "success";
  }
  if (status === "inactive") {
    return "warning";
  }
  if (status === "archived") {
    return "danger";
  }
  return "neutral";
}

function dayLabel(dayOfWeek: number) {
  return WEEKDAY_OPTIONS.find((option) => option.value === dayOfWeek)?.label ?? `Day ${dayOfWeek}`;
}

export function HoursPage({
  token,
  hasWriteAccess
}: {
  token: string;
  hasWriteAccess: boolean;
}) {
  const [locationData, setLocationData] = useState<LocationBootstrap | null>(null);
  const [hoursData, setHoursData] = useState<HoursBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedServiceAreaId, setSelectedServiceAreaId] = useState("");
  const [selectedHoursId, setSelectedHoursId] = useState("");
  const [serviceAreaForm, setServiceAreaForm] = useState<ServiceAreaFormState>(blankServiceAreaForm);
  const [hoursForm, setHoursForm] = useState<HoursFormState>(blankHoursForm);

  useEffect(() => {
    Promise.all([
      apiRequest<{ data: LocationBootstrap }>("/api/locations/bootstrap", {}, token),
      apiRequest<{ data: HoursBootstrap }>("/api/hours/bootstrap", {}, token)
    ])
      .then(([locationResponse, hoursResponse]) => {
        setLocationData(locationResponse.data);
        setHoursData(hoursResponse.data);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof ApiError ? error.message : "Unable to load hours workspace.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selectedFacilityId && locationData?.lists.facilities.length) {
      setSelectedFacilityId(locationData.lists.facilities[0]?.id ?? "");
    }
  }, [locationData, selectedFacilityId]);

  const facilities = locationData?.lists.facilities ?? [];
  const buildings = locationData?.lists.buildings ?? [];
  const floors = locationData?.lists.floors ?? [];
  const serviceAreas = hoursData?.lists.serviceAreas ?? [];
  const hours = hoursData?.lists.hours ?? [];

  const filteredBuildings = useMemo(
    () => buildings.filter((building) => building.facilityId === selectedFacilityId),
    [buildings, selectedFacilityId]
  );
  const filteredFloors = useMemo(
    () => floors.filter((floor) => floor.buildingId === selectedBuildingId),
    [floors, selectedBuildingId]
  );
  const filteredServiceAreas = useMemo(
    () => serviceAreas.filter((serviceArea) => serviceArea.facilityId === selectedFacilityId),
    [serviceAreas, selectedFacilityId]
  );
  const filteredHours = useMemo(
    () =>
      hours.filter((record) =>
        selectedServiceAreaId ? record.serviceAreaId === selectedServiceAreaId : record.facilityId === selectedFacilityId
      ),
    [hours, selectedFacilityId, selectedServiceAreaId]
  );

  const selectedFacility = facilities.find((record) => record.id === selectedFacilityId) ?? null;
  const selectedBuilding = filteredBuildings.find((record) => record.id === selectedBuildingId) ?? null;
  const selectedFloor = filteredFloors.find((record) => record.id === selectedFloorId) ?? null;
  const selectedServiceArea = filteredServiceAreas.find((record) => record.id === selectedServiceAreaId) ?? null;
  const selectedHours = hours.find((record) => record.id === selectedHoursId) ?? null;

  function resetWorkspace() {
    setSelectedFacilityId(facilities[0]?.id ?? "");
    setSelectedBuildingId("");
    setSelectedFloorId("");
    setSelectedServiceAreaId("");
    setSelectedHoursId("");
    setServiceAreaForm(blankServiceAreaForm);
    setHoursForm(blankHoursForm);
    setMessage("Forms reset for a new hours entry.");
  }

  function selectServiceArea(record: ServiceAreaRecord) {
    setSelectedFacilityId(record.facilityId);
    setSelectedBuildingId(record.buildingId ?? "");
    setSelectedFloorId(record.floorId ?? "");
    setSelectedServiceAreaId(record.id);
    setSelectedHoursId("");
    setServiceAreaForm({
      name: record.name,
      code: record.code ?? "",
      notes: record.notes ?? "",
      buildingId: record.buildingId ?? "",
      floorId: record.floorId ?? "",
      status: record.status
    });
  }

  function selectHours(record: HoursRecord) {
    const serviceArea = serviceAreas.find((candidate) => candidate.id === record.serviceAreaId) ?? null;

    setSelectedFacilityId(record.facilityId);
    setSelectedServiceAreaId(record.serviceAreaId ?? "");
    setSelectedBuildingId(serviceArea?.buildingId ?? "");
    setSelectedFloorId(serviceArea?.floorId ?? "");
    setSelectedHoursId(record.id);
    setHoursForm({
      serviceAreaId: record.serviceAreaId ?? "",
      dayOfWeek: String(record.dayOfWeek),
      opensAt: record.opensAt,
      closesAt: record.closesAt,
      overnight: record.overnight,
      effectiveFrom: toDateTimeLocal(record.effectiveFrom),
      effectiveTo: toDateTimeLocal(record.effectiveTo),
      status: record.status
    });
  }

  async function runMutation<T>(work: () => Promise<T>, successMessage: string) {
    try {
      await work();
      const [locationResponse, hoursResponse] = await Promise.all([
        apiRequest<{ data: LocationBootstrap }>("/api/locations/bootstrap", {}, token),
        apiRequest<{ data: HoursBootstrap }>("/api/hours/bootstrap", {}, token)
      ]);
      setLocationData(locationResponse.data);
      setHoursData(hoursResponse.data);
      setMessage(successMessage);
    } catch (error: unknown) {
      setMessage(error instanceof ApiError ? error.message : "Unable to save hours data.");
    }
  }

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Hours and Service Areas"
        description="Facility-first hours management with structured service areas and overlap validation."
        actions={
          hasWriteAccess ? (
            <Button variant="secondary" onClick={resetWorkspace}>
              Reset Editors
            </Button>
          ) : null
        }
      />

      <PanelMessage tone="info" title="Permission assumptions">
        Read access uses <strong>hours:read</strong>. Edits and archives require <strong>hours:write</strong>.
      </PanelMessage>

      {message ? (
        <PanelMessage tone="info" title="Workspace message">
          {message}
        </PanelMessage>
      ) : null}

      <StatStrip
        items={[
          { label: "Facilities", value: locationData?.summary.facilities ?? 0 },
          { label: "Buildings", value: locationData?.summary.buildings ?? 0 },
          { label: "Floors", value: locationData?.summary.floors ?? 0 },
          { label: "Service Areas", value: hoursData?.summary.serviceAreas ?? 0 },
          { label: "Hours Windows", value: hoursData?.summary.hours ?? 0 },
          { label: "Overnight", value: hoursData?.summary.overnightHours ?? 0 }
        ]}
      />

      <SectionCard title="Location Context" description="Select the facility and scope that hours belong to">
        <div className="fi-admin-grid">
          <Field label="Facility">
            <SelectInput
              value={selectedFacilityId}
              onChange={(event) => {
                setSelectedFacilityId(event.target.value);
                setSelectedBuildingId("");
                setSelectedFloorId("");
                setSelectedServiceAreaId("");
                setSelectedHoursId("");
                setServiceAreaForm(blankServiceAreaForm);
                setHoursForm(blankHoursForm);
              }}
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
              value={selectedBuildingId}
              onChange={(event) => {
                setSelectedBuildingId(event.target.value);
                setSelectedFloorId("");
                setSelectedServiceAreaId("");
                setSelectedHoursId("");
                setServiceAreaForm((current) => ({ ...current, buildingId: event.target.value, floorId: "" }));
              }}
              disabled={!selectedFacilityId}
            >
              <option value="">All buildings</option>
              {filteredBuildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Floor">
            <SelectInput
              value={selectedFloorId}
              onChange={(event) => {
                setSelectedFloorId(event.target.value);
                setSelectedServiceAreaId("");
                setSelectedHoursId("");
                setServiceAreaForm((current) => ({ ...current, floorId: event.target.value }));
              }}
              disabled={!selectedBuildingId}
            >
              <option value="">All floors</option>
              {filteredFloors.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Service Areas" description="Scoped spaces that group hours by facility, building, and floor">
        <div className="fi-admin-grid">
          <DataTable
            rows={filteredServiceAreas}
            onRowClick={selectServiceArea}
            empty={
              <EmptyState
                title="No service areas in scope"
                description={selectedFacility ? "Create the first service area for this facility." : "Select a facility first."}
              />
            }
            columns={[
              { key: "name", header: "Service Area", render: (row) => row.name },
              {
                key: "scope",
                header: "Scope",
                render: (row) =>
                  [row.buildingId ? "Building linked" : "Facility only", row.floorId ? "Floor linked" : "No floor"].join(" / ")
              },
              { key: "status", header: "Status", render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> }
            ]}
          />

          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();

              if (!selectedFacilityId) {
                setMessage("Select a facility before saving a service area.");
                return;
              }

              void runMutation(
                () =>
                  selectedServiceAreaId
                    ? apiRequest(
                        `/api/hours/service-areas/${selectedServiceAreaId}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            name: serviceAreaForm.name,
                            code: emptyToNull(serviceAreaForm.code),
                            notes: emptyToNull(serviceAreaForm.notes),
                            buildingId: emptyToNull(serviceAreaForm.buildingId),
                            floorId: emptyToNull(serviceAreaForm.floorId),
                            status: serviceAreaForm.status
                          })
                        },
                        token
                      )
                    : apiRequest(
                        "/api/hours/service-areas",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            facilityId: selectedFacilityId,
                            name: serviceAreaForm.name,
                            code: emptyToNull(serviceAreaForm.code),
                            notes: emptyToNull(serviceAreaForm.notes),
                            buildingId: emptyToNull(serviceAreaForm.buildingId),
                            floorId: emptyToNull(serviceAreaForm.floorId),
                            status: serviceAreaForm.status
                          })
                        },
                        token
                      ),
                selectedServiceAreaId ? "Service area updated." : "Service area created."
              );
            }}
          >
            <Field label="Service Area Name">
              <TextInput
                value={serviceAreaForm.name}
                onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, name: event.target.value })}
                required
                disabled={!selectedFacilityId}
              />
            </Field>
            <Field label="Code">
              <TextInput
                value={serviceAreaForm.code}
                onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, code: event.target.value })}
                disabled={!selectedFacilityId}
              />
            </Field>
            <Field label="Notes">
              <TextareaInput
                value={serviceAreaForm.notes}
                onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, notes: event.target.value })}
                disabled={!selectedFacilityId}
                rows={4}
              />
            </Field>
            <Field label="Building">
              <SelectInput
                value={serviceAreaForm.buildingId}
                onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, buildingId: event.target.value, floorId: "" })}
                disabled={!selectedFacilityId}
              >
                <option value="">Facility only</option>
                {filteredBuildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Floor">
              <SelectInput
                value={serviceAreaForm.floorId}
                onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, floorId: event.target.value })}
                disabled={!selectedFacilityId || !serviceAreaForm.buildingId}
              >
                <option value="">No floor</option>
                {filteredFloors
                  .filter((floor) => floor.buildingId === serviceAreaForm.buildingId)
                  .map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput
                value={serviceAreaForm.status}
                onChange={(event) => setServiceAreaForm({ ...serviceAreaForm, status: event.target.value })}
                disabled={!selectedFacilityId}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess || !selectedFacilityId}>
                {selectedServiceAreaId ? "Save Service Area" : "Create Service Area"}
              </Button>
              {selectedServiceAreaId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this service area? Hours must be archived first.")) {
                      void runMutation(
                        () =>
                          apiRequest(`/api/hours/service-areas/${selectedServiceAreaId}/archive`, { method: "POST" }, token),
                        "Service area archived."
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

      {selectedServiceArea ? (
        <SectionCard title="Selected Service Area" description="Current detail snapshot">
          <DefinitionList
            items={[
              { label: "Name", value: selectedServiceArea.name },
              {
                label: "Scope",
                value: [selectedBuilding?.name ?? "Facility only", selectedFloor?.name ?? "No floor"].join(" / ")
              },
              {
                label: "Status",
                value: <Badge tone={statusTone(selectedServiceArea.status)}>{selectedServiceArea.status}</Badge>
              },
              { label: "Notes", value: selectedServiceArea.notes ?? "No notes" }
            ]}
          />
        </SectionCard>
      ) : null}

      <SectionCard title="Hours" description="Daily operational windows with overlap and overnight validation">
        <div className="fi-admin-grid">
          <DataTable
            rows={filteredHours}
            onRowClick={selectHours}
            empty={
              <EmptyState
                title="No hours in scope"
                description={
                  selectedFacility
                    ? "Create the first hours window for the selected facility or service area."
                    : "Select a facility first."
                }
              />
            }
            columns={[
              { key: "day", header: "Day", render: (row) => dayLabel(row.dayOfWeek) },
              { key: "window", header: "Window", render: (row) => `${row.opensAt} - ${row.closesAt}` },
              { key: "overnight", header: "Overnight", render: (row) => (row.overnight ? "Yes" : "No") },
              { key: "status", header: "Status", render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> }
            ]}
          />

          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();

              if (!selectedFacilityId) {
                setMessage("Select a facility before saving hours.");
                return;
              }

              void runMutation(
                () =>
                  selectedHoursId
                    ? apiRequest(
                        `/api/hours/hours/${selectedHoursId}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            serviceAreaId: emptyToNull(hoursForm.serviceAreaId),
                            dayOfWeek: Number(hoursForm.dayOfWeek),
                            opensAt: hoursForm.opensAt,
                            closesAt: hoursForm.closesAt,
                            overnight: hoursForm.overnight,
                            effectiveFrom: toIsoDateTime(hoursForm.effectiveFrom),
                            effectiveTo: toIsoDateTime(hoursForm.effectiveTo),
                            status: hoursForm.status
                          })
                        },
                        token
                      )
                    : apiRequest(
                        "/api/hours/hours",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            facilityId: selectedFacilityId,
                            serviceAreaId: emptyToNull(hoursForm.serviceAreaId),
                            dayOfWeek: Number(hoursForm.dayOfWeek),
                            opensAt: hoursForm.opensAt,
                            closesAt: hoursForm.closesAt,
                            overnight: hoursForm.overnight,
                            effectiveFrom: toIsoDateTime(hoursForm.effectiveFrom),
                            effectiveTo: toIsoDateTime(hoursForm.effectiveTo),
                            status: hoursForm.status
                          })
                        },
                        token
                      ),
                selectedHoursId ? "Hours updated." : "Hours created."
              );
            }}
          >
            <Field label="Service Area">
              <SelectInput
                value={hoursForm.serviceAreaId}
                onChange={(event) => setHoursForm({ ...hoursForm, serviceAreaId: event.target.value })}
                disabled={!selectedFacilityId}
              >
                <option value="">Facility level hours</option>
                {filteredServiceAreas.map((serviceArea) => (
                  <option key={serviceArea.id} value={serviceArea.id}>
                    {serviceArea.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Day of Week">
              <SelectInput
                value={hoursForm.dayOfWeek}
                onChange={(event) => setHoursForm({ ...hoursForm, dayOfWeek: event.target.value })}
                disabled={!selectedFacilityId}
              >
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Opens At">
              <TextInput
                type="time"
                value={hoursForm.opensAt}
                onChange={(event) => setHoursForm({ ...hoursForm, opensAt: event.target.value })}
                disabled={!selectedFacilityId}
                required
              />
            </Field>
            <Field label="Closes At">
              <TextInput
                type="time"
                value={hoursForm.closesAt}
                onChange={(event) => setHoursForm({ ...hoursForm, closesAt: event.target.value })}
                disabled={!selectedFacilityId}
                required
              />
            </Field>
            <Field label="Overnight">
              <SelectInput
                value={hoursForm.overnight ? "true" : "false"}
                onChange={(event) => setHoursForm({ ...hoursForm, overnight: event.target.value === "true" })}
                disabled={!selectedFacilityId}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </SelectInput>
            </Field>
            <Field label="Effective From">
              <TextInput
                type="datetime-local"
                value={hoursForm.effectiveFrom}
                onChange={(event) => setHoursForm({ ...hoursForm, effectiveFrom: event.target.value })}
                disabled={!selectedFacilityId}
              />
            </Field>
            <Field label="Effective To">
              <TextInput
                type="datetime-local"
                value={hoursForm.effectiveTo}
                onChange={(event) => setHoursForm({ ...hoursForm, effectiveTo: event.target.value })}
                disabled={!selectedFacilityId}
              />
            </Field>
            <Field label="Status">
              <SelectInput
                value={hoursForm.status}
                onChange={(event) => setHoursForm({ ...hoursForm, status: event.target.value })}
                disabled={!selectedFacilityId}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess || !selectedFacilityId}>
                {selectedHoursId ? "Save Hours" : "Create Hours Window"}
              </Button>
              {selectedHoursId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this hours window?")) {
                      void runMutation(
                        () => apiRequest(`/api/hours/hours/${selectedHoursId}/archive`, { method: "POST" }, token),
                        "Hours archived."
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

      {selectedHours ? (
        <SectionCard title="Selected Hours" description="Current schedule snapshot">
          <DefinitionList
            items={[
              { label: "Day", value: dayLabel(selectedHours.dayOfWeek) },
              { label: "Window", value: `${selectedHours.opensAt} - ${selectedHours.closesAt}` },
              { label: "Overnight", value: selectedHours.overnight ? "Yes" : "No" },
              { label: "Status", value: <Badge tone={statusTone(selectedHours.status)}>{selectedHours.status}</Badge> }
            ]}
          />
        </SectionCard>
      ) : null}

      {loading ? <p className="fi-muted">Loading hours workspace...</p> : null}
    </div>
  );
}
