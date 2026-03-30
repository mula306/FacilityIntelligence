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
  TextareaInput,
  TextInput
} from "@facility/ui";
import { ApiError, apiRequest } from "../../app/api";

interface Summary {
  facilities: number;
  networkCircuits: number;
  networkProfiles: number;
  accessPoints: number;
  connectivityMeasurements: number;
}

interface FacilityRecord {
  id: string;
  name: string;
  code: string | null;
}

interface CircuitRecord {
  id: string;
  facilityId: string;
  facilityName: string | null;
  facilityCode: string | null;
  name: string;
  code: string | null;
  providerName: string | null;
  circuitIdentifier: string | null;
  bandwidthDownMbps: string | null;
  bandwidthUpMbps: string | null;
  serviceLevel: string | null;
  status: string;
  notes: string | null;
  measurementCount: number;
}

interface ProfileRecord {
  id: string;
  facilityId: string;
  facilityName: string | null;
  facilityCode: string | null;
  name: string;
  code: string | null;
  networkType: string | null;
  vlanName: string | null;
  subnetCidr: string | null;
  status: string;
  notes: string | null;
  accessPointCount: number;
}

interface AccessPointRecord {
  id: string;
  facilityId: string;
  facilityName: string | null;
  facilityCode: string | null;
  buildingId: string | null;
  buildingName: string | null;
  floorId: string | null;
  floorName: string | null;
  floorNumber: number | null;
  zoneId: string | null;
  zoneName: string | null;
  roomId: string | null;
  roomName: string | null;
  networkProfileId: string | null;
  networkProfileName: string | null;
  name: string;
  code: string | null;
  model: string | null;
  macAddress: string | null;
  geometry: unknown;
  status: string;
  notes: string | null;
  measurementCount: number;
  wifiSampleCount: number;
}

interface MeasurementRecord {
  id: string;
  facilityId: string;
  facilityName: string | null;
  facilityCode: string | null;
  networkCircuitId: string | null;
  networkCircuitName: string | null;
  accessPointId: string | null;
  accessPointName: string | null;
  source: string;
  measuredAt: string;
  downloadMbps: string | null;
  uploadMbps: string | null;
  latencyMs: string | null;
  packetLossPct: string | null;
  notes: string | null;
  status: string;
}

interface BootstrapPayload {
  summary: Summary;
  lists: {
    facilities: FacilityRecord[];
    circuits: CircuitRecord[];
    profiles: ProfileRecord[];
    accessPoints: AccessPointRecord[];
    measurements: MeasurementRecord[];
  };
  locations: {
    buildings: Array<{ id: string; facilityId: string; name: string; code: string | null }>;
    floors: Array<{ id: string; facilityId: string; buildingId: string; name: string; code: string | null; floorNumber: number }>;
    zones: Array<{ id: string; facilityId: string; buildingId: string; floorId: string; name: string; code: string | null }>;
    rooms: Array<{ id: string; facilityId: string; buildingId: string; floorId: string; zoneId: string | null; name: string; code: string | null; roomNumber: string | null }>;
  };
}

interface CircuitFormState {
  facilityId: string;
  name: string;
  code: string;
  providerName: string;
  circuitIdentifier: string;
  bandwidthDownMbps: string;
  bandwidthUpMbps: string;
  serviceLevel: string;
  status: string;
  notes: string;
}

interface ProfileFormState {
  facilityId: string;
  name: string;
  code: string;
  networkType: string;
  vlanName: string;
  subnetCidr: string;
  status: string;
  notes: string;
}

interface AccessPointFormState {
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string;
  roomId: string;
  networkProfileId: string;
  name: string;
  code: string;
  model: string;
  macAddress: string;
  geometry: string;
  status: string;
  notes: string;
}

interface MeasurementFormState {
  facilityId: string;
  networkCircuitId: string;
  accessPointId: string;
  source: string;
  measuredAt: string;
  downloadMbps: string;
  uploadMbps: string;
  latencyMs: string;
  packetLossPct: string;
  status: string;
  notes: string;
}

const blankCircuitForm = (facilityId = ""): CircuitFormState => ({
  facilityId,
  name: "",
  code: "",
  providerName: "",
  circuitIdentifier: "",
  bandwidthDownMbps: "",
  bandwidthUpMbps: "",
  serviceLevel: "",
  status: "active",
  notes: ""
});

const blankProfileForm = (facilityId = ""): ProfileFormState => ({
  facilityId,
  name: "",
  code: "",
  networkType: "",
  vlanName: "",
  subnetCidr: "",
  status: "active",
  notes: ""
});

const blankAccessPointForm = (facilityId = ""): AccessPointFormState => ({
  facilityId,
  buildingId: "",
  floorId: "",
  zoneId: "",
  roomId: "",
  networkProfileId: "",
  name: "",
  code: "",
  model: "",
  macAddress: "",
  geometry: "",
  status: "active",
  notes: ""
});

const blankMeasurementForm = (facilityId = ""): MeasurementFormState => ({
  facilityId,
  networkCircuitId: "",
  accessPointId: "",
  source: "manual",
  measuredAt: "",
  downloadMbps: "",
  uploadMbps: "",
  latencyMs: "",
  packetLossPct: "",
  status: "active",
  notes: ""
});

function nullableString(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function nullableNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    throw new Error("Invalid numeric value.");
  }

  return parsed;
}

function isoToDatetimeLocal(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

function datetimeLocalToIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid measurement timestamp.");
  }

  return parsed.toISOString();
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

function parseGeometry(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  return JSON.parse(trimmed);
}

function listFacilityLabel(record: { name: string; code: string | null }) {
  return record.code ? `${record.name} (${record.code})` : record.name;
}

export function NetworkPage({
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
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedAccessPointId, setSelectedAccessPointId] = useState<string>("");
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string>("");
  const [circuitForm, setCircuitForm] = useState<CircuitFormState>(blankCircuitForm());
  const [profileForm, setProfileForm] = useState<ProfileFormState>(blankProfileForm());
  const [accessPointForm, setAccessPointForm] = useState<AccessPointFormState>(blankAccessPointForm());
  const [measurementForm, setMeasurementForm] = useState<MeasurementFormState>(blankMeasurementForm());

  async function loadBootstrap() {
    const response = await apiRequest<{ data: BootstrapPayload }>("/api/network/bootstrap", {}, token);
    setData(response.data);
  }

  useEffect(() => {
    loadBootstrap()
      .catch((error) => {
        setMessage(error instanceof ApiError ? error.message : "Unable to load network records.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const facilities = data?.lists.facilities ?? [];
  const circuits = data?.lists.circuits ?? [];
  const profiles = data?.lists.profiles ?? [];
  const accessPoints = data?.lists.accessPoints ?? [];
  const measurements = data?.lists.measurements ?? [];
  const locations = data?.locations ?? { buildings: [], floors: [], zones: [], rooms: [] };

  const selectedFacility = facilities.find((record) => record.id === selectedFacilityId) ?? null;
  const selectedCircuit = circuits.find((record) => record.id === selectedCircuitId) ?? null;
  const selectedProfile = profiles.find((record) => record.id === selectedProfileId) ?? null;
  const selectedAccessPoint = accessPoints.find((record) => record.id === selectedAccessPointId) ?? null;
  const selectedMeasurement = measurements.find((record) => record.id === selectedMeasurementId) ?? null;

  const filteredCircuits = useMemo(
    () => circuits.filter((record) => !selectedFacilityId || record.facilityId === selectedFacilityId),
    [circuits, selectedFacilityId]
  );
  const filteredProfiles = useMemo(
    () => profiles.filter((record) => !selectedFacilityId || record.facilityId === selectedFacilityId),
    [profiles, selectedFacilityId]
  );
  const filteredAccessPoints = useMemo(
    () => accessPoints.filter((record) => !selectedFacilityId || record.facilityId === selectedFacilityId),
    [accessPoints, selectedFacilityId]
  );
  const filteredMeasurements = useMemo(
    () => measurements.filter((record) => !selectedFacilityId || record.facilityId === selectedFacilityId),
    [measurements, selectedFacilityId]
  );

  const accessPointFacilityId = accessPointForm.facilityId || selectedFacilityId;
  const accessPointBuildings = locations.buildings.filter((record) => !accessPointFacilityId || record.facilityId === accessPointFacilityId);
  const accessPointFloors = locations.floors.filter((record) => !accessPointFacilityId || record.facilityId === accessPointFacilityId);
  const accessPointZones = locations.zones.filter(
    (record) => (!accessPointFacilityId || record.facilityId === accessPointFacilityId) && (!accessPointForm.floorId || record.floorId === accessPointForm.floorId)
  );
  const accessPointRooms = locations.rooms.filter(
    (record) => (!accessPointFacilityId || record.facilityId === accessPointFacilityId) && (!accessPointForm.floorId || record.floorId === accessPointForm.floorId)
  );

  const measurementFacilityId = measurementForm.facilityId || selectedFacilityId;
  const measurementCircuits = circuits.filter((record) => !measurementFacilityId || record.facilityId === measurementFacilityId);
  const measurementAccessPoints = accessPoints.filter((record) => !measurementFacilityId || record.facilityId === measurementFacilityId);

  async function runMutation<T>(work: () => Promise<T>, successMessage: string) {
    try {
      await work();
      await loadBootstrap();
      setMessage(successMessage);
    } catch (error: unknown) {
      setMessage(error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to save network changes.");
    }
  }

  function selectCircuit(record: CircuitRecord) {
    setSelectedFacilityId(record.facilityId);
    setSelectedCircuitId(record.id);
    setCircuitForm({
      facilityId: record.facilityId,
      name: record.name,
      code: record.code ?? "",
      providerName: record.providerName ?? "",
      circuitIdentifier: record.circuitIdentifier ?? "",
      bandwidthDownMbps: record.bandwidthDownMbps ?? "",
      bandwidthUpMbps: record.bandwidthUpMbps ?? "",
      serviceLevel: record.serviceLevel ?? "",
      status: record.status,
      notes: record.notes ?? ""
    });
  }

  function selectProfile(record: ProfileRecord) {
    setSelectedFacilityId(record.facilityId);
    setSelectedProfileId(record.id);
    setProfileForm({
      facilityId: record.facilityId,
      name: record.name,
      code: record.code ?? "",
      networkType: record.networkType ?? "",
      vlanName: record.vlanName ?? "",
      subnetCidr: record.subnetCidr ?? "",
      status: record.status,
      notes: record.notes ?? ""
    });
  }

  function selectAccessPoint(record: AccessPointRecord) {
    setSelectedFacilityId(record.facilityId);
    setSelectedAccessPointId(record.id);
    setAccessPointForm({
      facilityId: record.facilityId,
      buildingId: record.buildingId ?? "",
      floorId: record.floorId ?? "",
      zoneId: record.zoneId ?? "",
      roomId: record.roomId ?? "",
      networkProfileId: record.networkProfileId ?? "",
      name: record.name,
      code: record.code ?? "",
      model: record.model ?? "",
      macAddress: record.macAddress ?? "",
      geometry: record.geometry ? JSON.stringify(record.geometry, null, 2) : "",
      status: record.status,
      notes: record.notes ?? ""
    });
  }

  function selectMeasurement(record: MeasurementRecord) {
    setSelectedFacilityId(record.facilityId);
    setSelectedMeasurementId(record.id);
    setMeasurementForm({
      facilityId: record.facilityId,
      networkCircuitId: record.networkCircuitId ?? "",
      accessPointId: record.accessPointId ?? "",
      source: record.source,
      measuredAt: isoToDatetimeLocal(record.measuredAt),
      downloadMbps: record.downloadMbps ?? "",
      uploadMbps: record.uploadMbps ?? "",
      latencyMs: record.latencyMs ?? "",
      packetLossPct: record.packetLossPct ?? "",
      status: record.status,
      notes: record.notes ?? ""
    });
  }

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Network and Connectivity"
        description="Circuit, profile, access point, and measured performance administration tied to facility context."
        actions={
          hasWriteAccess ? (
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedCircuitId("");
                setSelectedProfileId("");
                setSelectedAccessPointId("");
                setSelectedMeasurementId("");
                setCircuitForm(blankCircuitForm(selectedFacilityId));
                setProfileForm(blankProfileForm(selectedFacilityId));
                setAccessPointForm(blankAccessPointForm(selectedFacilityId));
                setMeasurementForm(blankMeasurementForm(selectedFacilityId));
                setMessage("Editors reset for a new network record.");
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

      {!hasWriteAccess ? (
        <PanelMessage tone="info" title="Read-only access">
          You have `network:read` access. `network:write` is required to create, edit, or archive network records.
        </PanelMessage>
      ) : null}

      <StatStrip
        items={[
          { label: "Facilities", value: data?.summary.facilities ?? 0 },
          { label: "Circuits", value: data?.summary.networkCircuits ?? 0 },
          { label: "Profiles", value: data?.summary.networkProfiles ?? 0 },
          { label: "Access Points", value: data?.summary.accessPoints ?? 0 },
          { label: "Measurements", value: data?.summary.connectivityMeasurements ?? 0 }
        ]}
      />

      <SectionCard title="Selected Context" description="Current facility and entity focus">
        <div className="fi-badge-row">
          <Badge tone={selectedFacility ? "success" : "neutral"}>Facility: {selectedFacility ? listFacilityLabel(selectedFacility) : "None"}</Badge>
          <Badge tone={selectedCircuit ? "success" : "neutral"}>Circuit: {selectedCircuit?.name ?? "None"}</Badge>
          <Badge tone={selectedProfile ? "success" : "neutral"}>Profile: {selectedProfile?.name ?? "None"}</Badge>
          <Badge tone={selectedAccessPoint ? "success" : "neutral"}>Access Point: {selectedAccessPoint?.name ?? "None"}</Badge>
          <Badge tone={selectedMeasurement ? "success" : "neutral"}>Measurement: {selectedMeasurement?.id.slice(0, 8) ?? "None"}</Badge>
        </div>
      </SectionCard>

      <SectionCard title="Network Circuits" description="Facility circuits and carrier details">
        <div className="fi-admin-grid">
          <DataTable
            rows={filteredCircuits}
            onRowClick={selectCircuit}
            empty={<EmptyState title="No circuits found" description="Create the first network circuit for the selected facility." />}
            columns={[
              { key: "name", header: "Circuit", render: (row) => row.name },
              { key: "facility", header: "Facility", render: (row) => row.facilityName ?? row.facilityCode ?? "Unknown" },
              { key: "provider", header: "Provider", render: (row) => row.providerName ?? "Unspecified" },
              {
                key: "bandwidth",
                header: "Bandwidth",
                render: (row) => `${row.bandwidthDownMbps ?? "?"} / ${row.bandwidthUpMbps ?? "?"} Mbps`
              },
              { key: "measurements", header: "Measurements", render: (row) => row.measurementCount },
              { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge> }
            ]}
          />
          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();

              const facilityId = nullableString(circuitForm.facilityId);
              if (!facilityId) {
                setMessage("Select a facility before saving a circuit.");
                return;
              }

              void runMutation(
                () =>
                  selectedCircuitId
                    ? apiRequest(
                        `/api/network/circuits/${selectedCircuitId}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            name: circuitForm.name,
                            code: nullableString(circuitForm.code),
                            providerName: nullableString(circuitForm.providerName),
                            circuitIdentifier: nullableString(circuitForm.circuitIdentifier),
                            bandwidthDownMbps: nullableNumber(circuitForm.bandwidthDownMbps),
                            bandwidthUpMbps: nullableNumber(circuitForm.bandwidthUpMbps),
                            serviceLevel: nullableString(circuitForm.serviceLevel),
                            status: circuitForm.status,
                            notes: nullableString(circuitForm.notes)
                          })
                        },
                        token
                      )
                    : apiRequest(
                        "/api/network/circuits",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            facilityId,
                            name: circuitForm.name,
                            code: nullableString(circuitForm.code),
                            providerName: nullableString(circuitForm.providerName),
                            circuitIdentifier: nullableString(circuitForm.circuitIdentifier),
                            bandwidthDownMbps: nullableNumber(circuitForm.bandwidthDownMbps),
                            bandwidthUpMbps: nullableNumber(circuitForm.bandwidthUpMbps),
                            serviceLevel: nullableString(circuitForm.serviceLevel),
                            status: circuitForm.status,
                            notes: nullableString(circuitForm.notes)
                          })
                        },
                        token
                      ),
                selectedCircuitId ? "Circuit updated." : "Circuit created."
              );
            }}
          >
            <Field label="Facility">
              <SelectInput
                value={circuitForm.facilityId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedFacilityId(value);
                  setCircuitForm({ ...circuitForm, facilityId: value });
                }}
                disabled={!hasWriteAccess}
                required
              >
                <option value="">Select a facility</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {listFacilityLabel(facility)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Circuit Name">
              <TextInput value={circuitForm.name} onChange={(event) => setCircuitForm({ ...circuitForm, name: event.target.value })} required disabled={!hasWriteAccess} />
            </Field>
            <Field label="Code">
              <TextInput value={circuitForm.code} onChange={(event) => setCircuitForm({ ...circuitForm, code: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Provider">
              <TextInput value={circuitForm.providerName} onChange={(event) => setCircuitForm({ ...circuitForm, providerName: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Circuit Identifier">
              <TextInput value={circuitForm.circuitIdentifier} onChange={(event) => setCircuitForm({ ...circuitForm, circuitIdentifier: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Down Mbps">
              <TextInput value={circuitForm.bandwidthDownMbps} onChange={(event) => setCircuitForm({ ...circuitForm, bandwidthDownMbps: event.target.value })} type="number" min="0" step="0.1" disabled={!hasWriteAccess} />
            </Field>
            <Field label="Up Mbps">
              <TextInput value={circuitForm.bandwidthUpMbps} onChange={(event) => setCircuitForm({ ...circuitForm, bandwidthUpMbps: event.target.value })} type="number" min="0" step="0.1" disabled={!hasWriteAccess} />
            </Field>
            <Field label="Service Level">
              <TextInput value={circuitForm.serviceLevel} onChange={(event) => setCircuitForm({ ...circuitForm, serviceLevel: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Status">
              <SelectInput value={circuitForm.status} onChange={(event) => setCircuitForm({ ...circuitForm, status: event.target.value })} disabled={!hasWriteAccess}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <Field label="Notes">
              <TextareaInput value={circuitForm.notes} onChange={(event) => setCircuitForm({ ...circuitForm, notes: event.target.value })} rows={3} disabled={!hasWriteAccess} />
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess}>
                {selectedCircuitId ? "Save Circuit" : "Create Circuit"}
              </Button>
              {selectedCircuitId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this circuit?")) {
                      void runMutation(
                        () => apiRequest(`/api/network/circuits/${selectedCircuitId}/archive`, { method: "POST" }, token),
                        "Circuit archived."
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
        {selectedCircuit ? (
          <DefinitionList
            items={[
              { label: "Facility", value: selectedCircuit.facilityName ?? "Unknown" },
              { label: "Provider", value: selectedCircuit.providerName ?? "Unspecified" },
              { label: "Bandwidth", value: `${selectedCircuit.bandwidthDownMbps ?? "?"} / ${selectedCircuit.bandwidthUpMbps ?? "?"} Mbps` },
              { label: "Measurements", value: selectedCircuit.measurementCount },
              { label: "Status", value: selectedCircuit.status }
            ]}
          />
        ) : null}
      </SectionCard>
      <SectionCard title="Network Profiles" description="Logical Wi-Fi and VLAN profiles">
        <div className="fi-admin-grid">
          <DataTable
            rows={filteredProfiles}
            onRowClick={selectProfile}
            empty={<EmptyState title="No profiles found" description="Create the first profile for the selected facility." />}
            columns={[
              { key: "name", header: "Profile", render: (row) => row.name },
              { key: "facility", header: "Facility", render: (row) => row.facilityName ?? row.facilityCode ?? "Unknown" },
              { key: "networkType", header: "Network Type", render: (row) => row.networkType ?? "Unspecified" },
              { key: "vlanName", header: "VLAN", render: (row) => row.vlanName ?? "Not set" },
              { key: "apCount", header: "Access Points", render: (row) => row.accessPointCount },
              { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge> }
            ]}
          />
          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();

              const facilityId = nullableString(profileForm.facilityId);
              if (!facilityId) {
                setMessage("Select a facility before saving a profile.");
                return;
              }

              void runMutation(
                () =>
                  selectedProfileId
                    ? apiRequest(
                        `/api/network/profiles/${selectedProfileId}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            name: profileForm.name,
                            code: nullableString(profileForm.code),
                            networkType: nullableString(profileForm.networkType),
                            vlanName: nullableString(profileForm.vlanName),
                            subnetCidr: nullableString(profileForm.subnetCidr),
                            status: profileForm.status,
                            notes: nullableString(profileForm.notes)
                          })
                        },
                        token
                      )
                    : apiRequest(
                        "/api/network/profiles",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            facilityId,
                            name: profileForm.name,
                            code: nullableString(profileForm.code),
                            networkType: nullableString(profileForm.networkType),
                            vlanName: nullableString(profileForm.vlanName),
                            subnetCidr: nullableString(profileForm.subnetCidr),
                            status: profileForm.status,
                            notes: nullableString(profileForm.notes)
                          })
                        },
                        token
                      ),
                selectedProfileId ? "Profile updated." : "Profile created."
              );
            }}
          >
            <Field label="Facility">
              <SelectInput
                value={profileForm.facilityId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedFacilityId(value);
                  setProfileForm({ ...profileForm, facilityId: value });
                }}
                disabled={!hasWriteAccess}
                required
              >
                <option value="">Select a facility</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {listFacilityLabel(facility)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Profile Name">
              <TextInput value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} required disabled={!hasWriteAccess} />
            </Field>
            <Field label="Code">
              <TextInput value={profileForm.code} onChange={(event) => setProfileForm({ ...profileForm, code: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Network Type">
              <TextInput value={profileForm.networkType} onChange={(event) => setProfileForm({ ...profileForm, networkType: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="VLAN Name">
              <TextInput value={profileForm.vlanName} onChange={(event) => setProfileForm({ ...profileForm, vlanName: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Subnet CIDR">
              <TextInput value={profileForm.subnetCidr} onChange={(event) => setProfileForm({ ...profileForm, subnetCidr: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Status">
              <SelectInput value={profileForm.status} onChange={(event) => setProfileForm({ ...profileForm, status: event.target.value })} disabled={!hasWriteAccess}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <Field label="Notes">
              <TextareaInput value={profileForm.notes} onChange={(event) => setProfileForm({ ...profileForm, notes: event.target.value })} rows={3} disabled={!hasWriteAccess} />
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess}>
                {selectedProfileId ? "Save Profile" : "Create Profile"}
              </Button>
              {selectedProfileId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this profile?")) {
                      void runMutation(
                        () => apiRequest(`/api/network/profiles/${selectedProfileId}/archive`, { method: "POST" }, token),
                        "Profile archived."
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
        {selectedProfile ? (
          <DefinitionList
            items={[
              { label: "Facility", value: selectedProfile.facilityName ?? "Unknown" },
              { label: "Network Type", value: selectedProfile.networkType ?? "Unspecified" },
              { label: "VLAN", value: selectedProfile.vlanName ?? "Not set" },
              { label: "Access Points", value: selectedProfile.accessPointCount },
              { label: "Status", value: selectedProfile.status }
            ]}
          />
        ) : null}
      </SectionCard>
      <SectionCard title="Access Points" description="Physical APs tied to floors, zones, and rooms">
        <div className="fi-admin-grid">
          <DataTable
            rows={filteredAccessPoints}
            onRowClick={selectAccessPoint}
            empty={<EmptyState title="No access points found" description="Create the first access point for the selected facility." />}
            columns={[
              { key: "name", header: "Access Point", render: (row) => row.name },
              { key: "facility", header: "Facility", render: (row) => row.facilityName ?? row.facilityCode ?? "Unknown" },
              { key: "location", header: "Location", render: (row) => row.floorName ?? row.zoneName ?? row.roomName ?? "Unassigned" },
              { key: "profile", header: "Profile", render: (row) => row.networkProfileName ?? "Not set" },
              { key: "measurements", header: "Measurements", render: (row) => row.measurementCount },
              { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge> }
            ]}
          />
          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();

              const facilityId = nullableString(accessPointForm.facilityId);
              if (!facilityId) {
                setMessage("Select a facility before saving an access point.");
                return;
              }

              let geometry: unknown = null;
              try {
                geometry = parseGeometry(accessPointForm.geometry);
              } catch (error: unknown) {
                setMessage(error instanceof Error ? error.message : "Geometry must be valid JSON.");
                return;
              }

              void runMutation(
                () =>
                  selectedAccessPointId
                    ? apiRequest(
                        `/api/network/access-points/${selectedAccessPointId}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            buildingId: nullableString(accessPointForm.buildingId),
                            floorId: nullableString(accessPointForm.floorId),
                            zoneId: nullableString(accessPointForm.zoneId),
                            roomId: nullableString(accessPointForm.roomId),
                            networkProfileId: nullableString(accessPointForm.networkProfileId),
                            name: accessPointForm.name,
                            code: nullableString(accessPointForm.code),
                            model: nullableString(accessPointForm.model),
                            macAddress: nullableString(accessPointForm.macAddress),
                            geometry,
                            status: accessPointForm.status,
                            notes: nullableString(accessPointForm.notes)
                          })
                        },
                        token
                      )
                    : apiRequest(
                        "/api/network/access-points",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            facilityId,
                            buildingId: nullableString(accessPointForm.buildingId),
                            floorId: nullableString(accessPointForm.floorId),
                            zoneId: nullableString(accessPointForm.zoneId),
                            roomId: nullableString(accessPointForm.roomId),
                            networkProfileId: nullableString(accessPointForm.networkProfileId),
                            name: accessPointForm.name,
                            code: nullableString(accessPointForm.code),
                            model: nullableString(accessPointForm.model),
                            macAddress: nullableString(accessPointForm.macAddress),
                            geometry,
                            status: accessPointForm.status,
                            notes: nullableString(accessPointForm.notes)
                          })
                        },
                        token
                      ),
                selectedAccessPointId ? "Access point updated." : "Access point created."
              );
            }}
          >
            <Field label="Facility">
              <SelectInput
                value={accessPointForm.facilityId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedFacilityId(value);
                  setAccessPointForm({
                    ...accessPointForm,
                    facilityId: value,
                    buildingId: "",
                    floorId: "",
                    zoneId: "",
                    roomId: ""
                  });
                }}
                disabled={!hasWriteAccess}
                required
              >
                <option value="">Select a facility</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {listFacilityLabel(facility)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Building">
              <SelectInput
                value={accessPointForm.buildingId}
                onChange={(event) =>
                  setAccessPointForm({
                    ...accessPointForm,
                    buildingId: event.target.value,
                    floorId: "",
                    zoneId: "",
                    roomId: ""
                  })
                }
                disabled={!hasWriteAccess || !accessPointFacilityId}
              >
                <option value="">No building</option>
                {accessPointBuildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Floor">
              <SelectInput
                value={accessPointForm.floorId}
                onChange={(event) =>
                  setAccessPointForm({
                    ...accessPointForm,
                    floorId: event.target.value,
                    zoneId: "",
                    roomId: ""
                  })
                }
                disabled={!hasWriteAccess || !accessPointFacilityId}
              >
                <option value="">No floor</option>
                {accessPointFloors
                  .filter((floor) => !accessPointForm.buildingId || floor.buildingId === accessPointForm.buildingId)
                  .map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name} {floor.floorNumber !== null ? `(L${floor.floorNumber})` : ""}
                    </option>
                  ))}
              </SelectInput>
            </Field>
            <Field label="Zone">
              <SelectInput
                value={accessPointForm.zoneId}
                onChange={(event) => setAccessPointForm({ ...accessPointForm, zoneId: event.target.value })}
                disabled={!hasWriteAccess || !accessPointForm.floorId}
              >
                <option value="">No zone</option>
                {accessPointZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Room">
              <SelectInput
                value={accessPointForm.roomId}
                onChange={(event) => setAccessPointForm({ ...accessPointForm, roomId: event.target.value })}
                disabled={!hasWriteAccess || !accessPointForm.floorId}
              >
                <option value="">No room</option>
                {accessPointRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.roomNumber ? `${room.roomNumber} - ${room.name}` : room.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Network Profile">
              <SelectInput
                value={accessPointForm.networkProfileId}
                onChange={(event) => setAccessPointForm({ ...accessPointForm, networkProfileId: event.target.value })}
                disabled={!hasWriteAccess || !accessPointFacilityId}
              >
                <option value="">No profile</option>
                {profiles
                  .filter((profile) => !accessPointFacilityId || profile.facilityId === accessPointFacilityId)
                  .map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
              </SelectInput>
            </Field>
            <Field label="Access Point Name">
              <TextInput value={accessPointForm.name} onChange={(event) => setAccessPointForm({ ...accessPointForm, name: event.target.value })} required disabled={!hasWriteAccess} />
            </Field>
            <Field label="Code">
              <TextInput value={accessPointForm.code} onChange={(event) => setAccessPointForm({ ...accessPointForm, code: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Model">
              <TextInput value={accessPointForm.model} onChange={(event) => setAccessPointForm({ ...accessPointForm, model: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="MAC Address">
              <TextInput value={accessPointForm.macAddress} onChange={(event) => setAccessPointForm({ ...accessPointForm, macAddress: event.target.value })} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Geometry JSON">
              <TextareaInput value={accessPointForm.geometry} onChange={(event) => setAccessPointForm({ ...accessPointForm, geometry: event.target.value })} rows={4} disabled={!hasWriteAccess} />
            </Field>
            <Field label="Status">
              <SelectInput value={accessPointForm.status} onChange={(event) => setAccessPointForm({ ...accessPointForm, status: event.target.value })} disabled={!hasWriteAccess}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <Field label="Notes">
              <TextareaInput value={accessPointForm.notes} onChange={(event) => setAccessPointForm({ ...accessPointForm, notes: event.target.value })} rows={3} disabled={!hasWriteAccess} />
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess}>
                {selectedAccessPointId ? "Save Access Point" : "Create Access Point"}
              </Button>
              {selectedAccessPointId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this access point?")) {
                      void runMutation(
                        () => apiRequest(`/api/network/access-points/${selectedAccessPointId}/archive`, { method: "POST" }, token),
                        "Access point archived."
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
        {selectedAccessPoint ? (
          <DefinitionList
            items={[
              { label: "Facility", value: selectedAccessPoint.facilityName ?? "Unknown" },
              { label: "Building", value: selectedAccessPoint.buildingName ?? "Not set" },
              { label: "Floor", value: selectedAccessPoint.floorName ?? "Not set" },
              { label: "Room", value: selectedAccessPoint.roomName ?? "Not set" },
              { label: "Profile", value: selectedAccessPoint.networkProfileName ?? "Not set" },
              { label: "Measurements", value: selectedAccessPoint.measurementCount },
              { label: "Wi-Fi Samples", value: selectedAccessPoint.wifiSampleCount },
              { label: "Status", value: selectedAccessPoint.status }
            ]}
          />
        ) : null}
      </SectionCard>
      <SectionCard title="Connectivity Measurements" description="Observed performance values by facility and collection context">
        <div className="fi-admin-grid">
          <DataTable
            rows={filteredMeasurements}
            onRowClick={selectMeasurement}
            empty={<EmptyState title="No measurements found" description="Create the first connectivity measurement for the selected facility." />}
            columns={[
              { key: "measuredAt", header: "Measured", render: (row) => formatDateTime(row.measuredAt) },
              { key: "facility", header: "Facility", render: (row) => row.facilityName ?? row.facilityCode ?? "Unknown" },
              { key: "source", header: "Source", render: (row) => <Badge tone="info">{row.source}</Badge> },
              {
                key: "speed",
                header: "Speed",
                render: (row) => `${row.downloadMbps ?? "?"} / ${row.uploadMbps ?? "?"} Mbps`
              },
              { key: "latency", header: "Latency", render: (row) => `${row.latencyMs ?? "?"} ms` },
              { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge> }
            ]}
          />
          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();

              const facilityId = nullableString(measurementForm.facilityId);
              if (!facilityId) {
                setMessage("Select a facility before saving a measurement.");
                return;
              }

              let measuredAt: string;
              try {
                measuredAt = datetimeLocalToIso(measurementForm.measuredAt);
              } catch (error: unknown) {
                setMessage(error instanceof Error ? error.message : "Invalid measurement timestamp.");
                return;
              }

              void runMutation(
                () =>
                  selectedMeasurementId
                    ? apiRequest(
                        `/api/network/measurements/${selectedMeasurementId}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            networkCircuitId: nullableString(measurementForm.networkCircuitId),
                            accessPointId: nullableString(measurementForm.accessPointId),
                            source: measurementForm.source,
                            measuredAt,
                            downloadMbps: nullableNumber(measurementForm.downloadMbps),
                            uploadMbps: nullableNumber(measurementForm.uploadMbps),
                            latencyMs: nullableNumber(measurementForm.latencyMs),
                            packetLossPct: nullableNumber(measurementForm.packetLossPct),
                            status: measurementForm.status,
                            notes: nullableString(measurementForm.notes)
                          })
                        },
                        token
                      )
                    : apiRequest(
                        "/api/network/measurements",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            facilityId,
                            networkCircuitId: nullableString(measurementForm.networkCircuitId),
                            accessPointId: nullableString(measurementForm.accessPointId),
                            source: measurementForm.source,
                            measuredAt,
                            downloadMbps: nullableNumber(measurementForm.downloadMbps),
                            uploadMbps: nullableNumber(measurementForm.uploadMbps),
                            latencyMs: nullableNumber(measurementForm.latencyMs),
                            packetLossPct: nullableNumber(measurementForm.packetLossPct),
                            status: measurementForm.status,
                            notes: nullableString(measurementForm.notes)
                          })
                        },
                        token
                      ),
                selectedMeasurementId ? "Measurement updated." : "Measurement created."
              );
            }}
          >
            <Field label="Facility">
              <SelectInput
                value={measurementForm.facilityId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedFacilityId(value);
                  setMeasurementForm({
                    ...measurementForm,
                    facilityId: value,
                    networkCircuitId: "",
                    accessPointId: ""
                  });
                }}
                disabled={!hasWriteAccess}
                required
              >
                <option value="">Select a facility</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {listFacilityLabel(facility)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Network Circuit">
              <SelectInput
                value={measurementForm.networkCircuitId}
                onChange={(event) => setMeasurementForm({ ...measurementForm, networkCircuitId: event.target.value })}
                disabled={!hasWriteAccess || !measurementFacilityId}
              >
                <option value="">No circuit</option>
                {measurementCircuits.map((circuit) => (
                  <option key={circuit.id} value={circuit.id}>
                    {circuit.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Access Point">
              <SelectInput
                value={measurementForm.accessPointId}
                onChange={(event) => setMeasurementForm({ ...measurementForm, accessPointId: event.target.value })}
                disabled={!hasWriteAccess || !measurementFacilityId}
              >
                <option value="">No access point</option>
                {measurementAccessPoints.map((accessPoint) => (
                  <option key={accessPoint.id} value={accessPoint.id}>
                    {accessPoint.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Source">
              <SelectInput value={measurementForm.source} onChange={(event) => setMeasurementForm({ ...measurementForm, source: event.target.value })} disabled={!hasWriteAccess}>
                <option value="manual">Manual</option>
                <option value="import">Import</option>
                <option value="scan">Scan</option>
                <option value="controller">Controller</option>
                <option value="system">System</option>
              </SelectInput>
            </Field>
            <Field label="Measured At">
              <TextInput value={measurementForm.measuredAt} onChange={(event) => setMeasurementForm({ ...measurementForm, measuredAt: event.target.value })} type="datetime-local" required disabled={!hasWriteAccess} />
            </Field>
            <Field label="Download Mbps">
              <TextInput value={measurementForm.downloadMbps} onChange={(event) => setMeasurementForm({ ...measurementForm, downloadMbps: event.target.value })} type="number" min="0" step="0.1" disabled={!hasWriteAccess} />
            </Field>
            <Field label="Upload Mbps">
              <TextInput value={measurementForm.uploadMbps} onChange={(event) => setMeasurementForm({ ...measurementForm, uploadMbps: event.target.value })} type="number" min="0" step="0.1" disabled={!hasWriteAccess} />
            </Field>
            <Field label="Latency ms">
              <TextInput value={measurementForm.latencyMs} onChange={(event) => setMeasurementForm({ ...measurementForm, latencyMs: event.target.value })} type="number" min="0" step="0.1" disabled={!hasWriteAccess} />
            </Field>
            <Field label="Packet Loss %">
              <TextInput value={measurementForm.packetLossPct} onChange={(event) => setMeasurementForm({ ...measurementForm, packetLossPct: event.target.value })} type="number" min="0" max="100" step="0.1" disabled={!hasWriteAccess} />
            </Field>
            <Field label="Status">
              <SelectInput value={measurementForm.status} onChange={(event) => setMeasurementForm({ ...measurementForm, status: event.target.value })} disabled={!hasWriteAccess}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <Field label="Notes">
              <TextareaInput value={measurementForm.notes} onChange={(event) => setMeasurementForm({ ...measurementForm, notes: event.target.value })} rows={3} disabled={!hasWriteAccess} />
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess}>
                {selectedMeasurementId ? "Save Measurement" : "Create Measurement"}
              </Button>
              {selectedMeasurementId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this measurement?")) {
                      void runMutation(
                        () => apiRequest(`/api/network/measurements/${selectedMeasurementId}/archive`, { method: "POST" }, token),
                        "Measurement archived."
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
        {selectedMeasurement ? (
          <DefinitionList
            items={[
              { label: "Facility", value: selectedMeasurement.facilityName ?? "Unknown" },
              { label: "Circuit", value: selectedMeasurement.networkCircuitName ?? "Not set" },
              { label: "Access Point", value: selectedMeasurement.accessPointName ?? "Not set" },
              { label: "Measured At", value: formatDateTime(selectedMeasurement.measuredAt) },
              { label: "Download / Upload", value: `${selectedMeasurement.downloadMbps ?? "?"} / ${selectedMeasurement.uploadMbps ?? "?"} Mbps` },
              { label: "Latency", value: `${selectedMeasurement.latencyMs ?? "?"} ms` },
              { label: "Packet Loss", value: `${selectedMeasurement.packetLossPct ?? "?"}%` },
              { label: "Status", value: selectedMeasurement.status }
            ]}
          />
        ) : null}
      </SectionCard>

      {loading ? <p className="fi-muted">Loading network records...</p> : null}
    </div>
  );
}
