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
import { wifiBandValues } from "@facility/domain";
import { ApiError, apiRequest } from "../../app/api";
import { parseWifiScanCsv } from "./csv";
import { WifiScanCanvas } from "./WifiScanCanvas";

interface Summary {
  facilities: number;
  sessions: number;
  samples: number;
  accessPoints: number;
}

interface FacilityRecord {
  id: string;
  name: string;
  code: string | null;
  status?: string;
}

interface BuildingRecord {
  id: string;
  facilityId: string;
  name: string;
  code: string | null;
  status?: string;
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
  planImageUrl: string | null;
  status?: string;
}

interface ZoneRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  name: string;
  code: string | null;
  status?: string;
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
  status?: string;
}

interface AccessPointRecord {
  id: string;
  facilityId: string;
  buildingId: string | null;
  floorId: string | null;
  zoneId: string | null;
  roomId: string | null;
  name: string;
  code: string | null;
  model: string | null;
  macAddress: string | null;
  geometry: unknown;
  status: string;
  wifiSampleCount: number;
}

interface SessionRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  roomId: string | null;
  collectorUserId: string | null;
  collectorDisplayName: string | null;
  collectorDeviceLabel: string | null;
  name: string;
  code: string | null;
  source: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  notes: string | null;
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface SampleCoordinate {
  x: number;
  y: number;
}

interface SampleRecord {
  id: string;
  wifiScanSessionId: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  roomId: string | null;
  accessPointId: string | null;
  accessPointName: string | null;
  accessPointCode: string | null;
  ssid: string;
  bssid: string;
  rssi: number;
  frequencyMHz: number | null;
  channel: number | null;
  band: string;
  sampledAt: string;
  coordinate: SampleCoordinate | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface BootstrapPayload {
  summary: Summary;
  selection: {
    facilityId: string | null;
    buildingId: string | null;
    floorId: string | null;
  };
  lists: {
    facilities: FacilityRecord[];
    buildings: BuildingRecord[];
    floors: FloorRecord[];
    zones: ZoneRecord[];
    rooms: RoomRecord[];
    accessPoints: AccessPointRecord[];
    sessions: SessionRecord[];
    samples: SampleRecord[];
  };
  floorContext: {
    planImageUrl: string | null;
    canvasWidth: number | null;
    canvasHeight: number | null;
  } | null;
}

interface SessionFormState {
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string;
  roomId: string;
  collectorUserId: string;
  collectorDeviceLabel: string;
  name: string;
  code: string;
  source: string;
  startedAt: string;
  endedAt: string;
  status: string;
  notes: string;
}

interface SampleFormState {
  wifiScanSessionId: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string;
  roomId: string;
  accessPointId: string;
  ssid: string;
  bssid: string;
  rssi: string;
  frequencyMHz: string;
  channel: string;
  band: string;
  sampledAt: string;
  coordinateX: string;
  coordinateY: string;
  status: string;
}

const bandOptions = wifiBandValues.map((value) => ({
  value,
  label: value === "2.4ghz" ? "2.4 GHz" : value === "5ghz" ? "5 GHz" : value === "6ghz" ? "6 GHz" : "Unknown"
}));

const sessionSourceOptions = [
  { value: "manual", label: "Manual" },
  { value: "csv-import", label: "CSV import" },
  { value: "android-companion", label: "Android companion" }
] as const;

const blankSessionForm: SessionFormState = {
  facilityId: "",
  buildingId: "",
  floorId: "",
  zoneId: "",
  roomId: "",
  collectorUserId: "",
  collectorDeviceLabel: "",
  name: "",
  code: "",
  source: "manual",
  startedAt: "",
  endedAt: "",
  status: "active",
  notes: ""
};

const blankSampleForm: SampleFormState = {
  wifiScanSessionId: "",
  facilityId: "",
  buildingId: "",
  floorId: "",
  zoneId: "",
  roomId: "",
  accessPointId: "",
  ssid: "",
  bssid: "",
  rssi: "",
  frequencyMHz: "",
  channel: "",
  band: "unknown",
  sampledAt: "",
  coordinateX: "",
  coordinateY: "",
  status: "active"
};

function nullableString(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function nullableNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function toLocalDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return value.trim() === "" ? null : new Date(value).toISOString();
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
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

function bandTone(band: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (band === "2.4ghz") {
    return "warning";
  }
  if (band === "5ghz") {
    return "info";
  }
  if (band === "6ghz") {
    return "success";
  }
  return "neutral";
}

function rssiTone(rssi: number): "success" | "warning" | "danger" | "info" | "neutral" {
  if (rssi >= -55) {
    return "success";
  }
  if (rssi >= -65) {
    return "info";
  }
  if (rssi >= -75) {
    return "warning";
  }
  return "danger";
}

function textLabel(record: { name?: string; code?: string | null; title?: string }) {
  const base = record.name ?? record.title ?? "";
  return record.code ? `${base} (${record.code})` : base;
}

function coordinateLabel(coordinate: SampleCoordinate | null | undefined) {
  return coordinate ? `${Math.round(coordinate.x)}, ${Math.round(coordinate.y)}` : "Not set";
}

function sourceLabel(source: string) {
  if (source === "csv-import") {
    return "CSV import";
  }
  if (source === "android-companion") {
    return "Android companion";
  }
  return "Manual";
}

function sampleLabel(sample: SampleRecord) {
  return `${sample.ssid} / ${sample.bssid}`;
}

interface ParsedImportState {
  rows: ReturnType<typeof parseWifiScanCsv>["rows"];
  issues: string[];
  columns: string[];
}

export function WifiPage({
  token,
  hasWriteAccess
}: {
  token: string;
  hasWriteAccess: boolean;
}) {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [sessionForm, setSessionForm] = useState<SessionFormState>(blankSessionForm);
  const [sampleForm, setSampleForm] = useState<SampleFormState>(blankSampleForm);
  const [csvText, setCsvText] = useState("");
  const [importPreview, setImportPreview] = useState<ParsedImportState>({ rows: [], issues: [], columns: [] });

  async function loadBootstrap(floorId?: string) {
    const query = floorId ? `?floorId=${encodeURIComponent(floorId)}` : "";
    const response = await apiRequest<{ data: BootstrapPayload }>(`/api/wifi/bootstrap${query}`, {}, token);
    setData(response.data);
    setSelectedFacilityId(response.data.selection.facilityId ?? "");
    setSelectedBuildingId(response.data.selection.buildingId ?? "");
    setSelectedFloorId(response.data.selection.floorId ?? "");
  }

  useEffect(() => {
    setLoading(true);
    loadBootstrap()
      .catch((error: unknown) => {
        setMessage(error instanceof ApiError ? error.message : "Unable to load Wi-Fi workspace.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const facilities = data?.lists.facilities ?? [];
  const buildings = data?.lists.buildings ?? [];
  const floors = data?.lists.floors ?? [];
  const zones = data?.lists.zones ?? [];
  const rooms = data?.lists.rooms ?? [];
  const accessPoints = data?.lists.accessPoints ?? [];
  const sessions = data?.lists.sessions ?? [];
  const samples = data?.lists.samples ?? [];
  const floorContext = data?.floorContext ?? null;

  const selectedFacility = facilities.find((record) => record.id === selectedFacilityId) ?? null;
  const selectedBuilding = buildings.find((record) => record.id === selectedBuildingId) ?? null;
  const selectedFloor = floors.find((record) => record.id === selectedFloorId) ?? null;
  const selectedSession = sessions.find((record) => record.id === selectedSessionId) ?? null;
  const selectedSample = samples.find((record) => record.id === selectedSampleId) ?? null;

  const filteredBuildings = useMemo(
    () => buildings.filter((record) => !selectedFacilityId || record.facilityId === selectedFacilityId),
    [buildings, selectedFacilityId]
  );
  const filteredFloors = useMemo(
    () => floors.filter((record) => !selectedBuildingId || record.buildingId === selectedBuildingId),
    [floors, selectedBuildingId]
  );
  const filteredZones = useMemo(
    () => zones.filter((record) => !selectedFloorId || record.floorId === selectedFloorId),
    [selectedFloorId, zones]
  );
  const filteredRooms = useMemo(
    () => rooms.filter((record) => !selectedFloorId || record.floorId === selectedFloorId),
    [rooms, selectedFloorId]
  );
  const filteredAccessPoints = useMemo(
    () => accessPoints.filter((record) => !selectedFloorId || record.floorId === selectedFloorId),
    [accessPoints, selectedFloorId]
  );
  const filteredSessions = useMemo(
    () => sessions.filter((record) => !selectedFloorId || record.floorId === selectedFloorId),
    [sessions, selectedFloorId]
  );
  const floorSamples = useMemo(
    () => samples.filter((record) => !selectedFloorId || record.floorId === selectedFloorId),
    [samples, selectedFloorId]
  );
  const sessionSamples = useMemo(
    () => samples.filter((record) => !selectedSessionId || record.wifiScanSessionId === selectedSessionId),
    [samples, selectedSessionId]
  );
  const currentFloorContext = floorContext ?? {
    planImageUrl: selectedFloor?.planImageUrl ?? null,
    canvasWidth: selectedFloor?.canvasWidth ?? 1200,
    canvasHeight: selectedFloor?.canvasHeight ?? 800
  };

  useEffect(() => {
    if (!selectedFacilityId && facilities.length > 0) {
      setSelectedFacilityId(facilities[0]?.id ?? "");
    }
  }, [facilities, selectedFacilityId]);

  useEffect(() => {
    if (selectedFacilityId && filteredBuildings.length > 0 && !filteredBuildings.some((record) => record.id === selectedBuildingId)) {
      setSelectedBuildingId(filteredBuildings[0]?.id ?? "");
      setSelectedFloorId("");
      setSelectedSessionId("");
      setSelectedSampleId("");
    }
    if (selectedFacilityId && filteredBuildings.length === 0) {
      setSelectedBuildingId("");
      setSelectedFloorId("");
      setSelectedSessionId("");
      setSelectedSampleId("");
    }
  }, [filteredBuildings, selectedBuildingId, selectedFacilityId]);

  useEffect(() => {
    if (selectedBuildingId && filteredFloors.length > 0 && !filteredFloors.some((record) => record.id === selectedFloorId)) {
      setSelectedFloorId(filteredFloors[0]?.id ?? "");
      setSelectedSessionId("");
      setSelectedSampleId("");
    }
    if (selectedBuildingId && filteredFloors.length === 0) {
      setSelectedFloorId("");
      setSelectedSessionId("");
      setSelectedSampleId("");
    }
  }, [filteredFloors, selectedBuildingId, selectedFloorId]);

  useEffect(() => {
    if (selectedFloorId && filteredSessions.length > 0 && !filteredSessions.some((record) => record.id === selectedSessionId)) {
      setSelectedSessionId(filteredSessions[0]?.id ?? "");
      setSelectedSampleId("");
    }
    if (selectedFloorId && filteredSessions.length === 0) {
      setSelectedSessionId("");
      setSelectedSampleId("");
    }
  }, [filteredSessions, selectedFloorId, selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId && sessionSamples.length > 0 && !sessionSamples.some((record) => record.id === selectedSampleId)) {
      setSelectedSampleId(sessionSamples[0]?.id ?? "");
    }
    if (selectedSessionId && sessionSamples.length === 0) {
      setSelectedSampleId("");
    }
  }, [selectedSampleId, selectedSessionId, sessionSamples]);

  useEffect(() => {
    if (selectedSession) {
      setSessionForm({
        facilityId: selectedSession.facilityId,
        buildingId: selectedSession.buildingId,
        floorId: selectedSession.floorId,
        zoneId: selectedSession.zoneId ?? "",
        roomId: selectedSession.roomId ?? "",
        collectorUserId: selectedSession.collectorUserId ?? "",
        collectorDeviceLabel: selectedSession.collectorDeviceLabel ?? "",
        name: selectedSession.name,
        code: selectedSession.code ?? "",
        source: selectedSession.source,
        startedAt: toLocalDateTime(selectedSession.startedAt),
        endedAt: toLocalDateTime(selectedSession.endedAt),
        status: selectedSession.status,
        notes: selectedSession.notes ?? ""
      });
    } else {
      setSessionForm({
        ...blankSessionForm,
        facilityId: selectedFacilityId,
        buildingId: selectedBuildingId,
        floorId: selectedFloorId
      });
    }
  }, [selectedBuildingId, selectedFacilityId, selectedFloorId, selectedSession]);

  useEffect(() => {
    if (selectedSample) {
      setSampleForm({
        wifiScanSessionId: selectedSample.wifiScanSessionId,
        facilityId: selectedSample.facilityId,
        buildingId: selectedSample.buildingId,
        floorId: selectedSample.floorId,
        zoneId: selectedSample.zoneId ?? "",
        roomId: selectedSample.roomId ?? "",
        accessPointId: selectedSample.accessPointId ?? "",
        ssid: selectedSample.ssid,
        bssid: selectedSample.bssid,
        rssi: selectedSample.rssi.toString(),
        frequencyMHz: selectedSample.frequencyMHz?.toString() ?? "",
        channel: selectedSample.channel?.toString() ?? "",
        band: selectedSample.band,
        sampledAt: toLocalDateTime(selectedSample.sampledAt),
        coordinateX: selectedSample.coordinate?.x?.toString() ?? "",
        coordinateY: selectedSample.coordinate?.y?.toString() ?? "",
        status: selectedSample.status
      });
    } else {
      setSampleForm({
        ...blankSampleForm,
        wifiScanSessionId: selectedSessionId,
        facilityId: selectedFacilityId,
        buildingId: selectedBuildingId,
        floorId: selectedFloorId
      });
    }
  }, [selectedBuildingId, selectedFacilityId, selectedFloorId, selectedSample, selectedSessionId]);

  useEffect(() => {
    if (selectedFloorId) {
      void loadBootstrap(selectedFloorId).catch((error: unknown) => {
        setMessage(error instanceof ApiError ? error.message : "Unable to refresh the Wi-Fi workspace.");
      });
    }
  }, [selectedFloorId]);

  async function runMutation<T>(work: () => Promise<T>, successMessage: string) {
    try {
      await work();
      await loadBootstrap(selectedFloorId || undefined);
      setMessage(successMessage);
    } catch (error: unknown) {
      setMessage(error instanceof ApiError ? error.message : "Unable to save Wi-Fi changes.");
    }
  }

  function previewCsv() {
    const result = parseWifiScanCsv(csvText);
    setImportPreview(result);
    if (result.issues.length === 0) {
      setMessage(`Parsed ${result.rows.length} sample rows from CSV.`);
    } else {
      setMessage(result.issues[0] ?? "CSV preview failed.");
    }
  }

  const selectedSessionSamples = selectedSessionId ? sessionSamples : floorSamples;
  const currentCanvasWidth = currentFloorContext.canvasWidth ?? 1200;
  const currentCanvasHeight = currentFloorContext.canvasHeight ?? 800;
  const currentCanvasImageUrl = currentFloorContext.planImageUrl ?? null;

  if (loading) {
    return <PanelMessage tone="info" title="Loading Wi-Fi workspace">Fetching Wi-Fi sessions, samples, and floor context.</PanelMessage>;
  }

  if (message && !data) {
    return <PanelMessage tone="warning" title="Wi-Fi workspace unavailable">{message}</PanelMessage>;
  }

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Wi-Fi Scan Capture"
        description="Structured Wi-Fi sessions, sample capture, and floor-level coverage previews tied to facility context."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSelectedFacilityId(facilities[0]?.id ?? "");
              setSelectedBuildingId("");
              setSelectedFloorId("");
              setSelectedSessionId("");
              setSelectedSampleId("");
            }}
          >
            Reset context
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: "Facilities", value: facilities.length || data?.summary.facilities || 0 },
          { label: "Sessions", value: sessions.length || data?.summary.sessions || 0 },
          { label: "Samples", value: samples.length || data?.summary.samples || 0, tone: "warning" },
          { label: "Access points", value: accessPoints.length || data?.summary.accessPoints || 0 }
        ]}
      />

      {message ? (
        <PanelMessage tone={message.toLowerCase().includes("unable") ? "warning" : "info"} title="Wi-Fi status">
          {message}
        </PanelMessage>
      ) : null}

      {!hasWriteAccess ? (
        <PanelMessage tone="info" title="Read-only access">
          You can review Wi-Fi records and coverage context, but create, edit, import, and archive actions are disabled.
        </PanelMessage>
      ) : null}

      <SectionCard title="Facility Context" description="Choose the facility, building, and floor that define the active scan workspace.">
        <div className="fi-form-grid">
          <Field label="Facility">
            <SelectInput
              value={selectedFacilityId}
              onChange={(event) => {
                setSelectedFacilityId(event.target.value);
                setSelectedBuildingId("");
                setSelectedFloorId("");
                setSelectedSessionId("");
                setSelectedSampleId("");
              }}
            >
              <option value="">Select a facility</option>
              {facilities.map((record) => (
                <option key={record.id} value={record.id}>
                  {textLabel(record)}
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
                setSelectedSessionId("");
                setSelectedSampleId("");
              }}
              disabled={!selectedFacilityId}
            >
              <option value="">Select a building</option>
              {filteredBuildings.map((record) => (
                <option key={record.id} value={record.id}>
                  {textLabel(record)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Floor">
            <SelectInput
              value={selectedFloorId}
              onChange={(event) => {
                setSelectedFloorId(event.target.value);
                setSelectedSessionId("");
                setSelectedSampleId("");
              }}
              disabled={!selectedBuildingId}
            >
              <option value="">Select a floor</option>
              {filteredFloors.map((record) => (
                <option key={record.id} value={record.id}>
                  {textLabel(record)} - Level {record.floorNumber}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <DefinitionList
          items={[
            { label: "Facility", value: selectedFacility ? textLabel(selectedFacility) : "Not selected" },
            { label: "Building", value: selectedBuilding ? textLabel(selectedBuilding) : "Not selected" },
            { label: "Floor", value: selectedFloor ? textLabel(selectedFloor) : "Not selected" },
            { label: "Canvas", value: `${currentCanvasWidth} x ${currentCanvasHeight}` },
            { label: "Plan image", value: currentCanvasImageUrl ?? "Not set" }
          ]}
        />
      </SectionCard>

      <SectionCard title="Floor Scan Preview" description="Show sample points and nearby access points against the active floor canvas.">
        {selectedFloorId ? (
          <WifiScanCanvas
            width={currentCanvasWidth}
            height={currentCanvasHeight}
            backgroundImageUrl={currentCanvasImageUrl}
            accessPoints={filteredAccessPoints.map((record) => ({
              id: record.id,
              label: textLabel(record),
              geometry: record.geometry
            }))}
            samples={floorSamples
              .filter((sample) => sample.coordinate)
              .map((sample) => ({
                id: sample.id,
                label: sample.ssid,
                rssi: sample.rssi,
                coordinate: sample.coordinate
              }))}
            selectedSampleId={selectedSampleId}
            title="Floor scan preview"
            subtitle="Sample coordinates are drawn on the selected floor workspace."
          />
        ) : (
          <EmptyState title="Select a floor to preview scans" description="Pick a facility, building, and floor to render sample coordinates." />
        )}
      </SectionCard>

      <SectionCard title="Scan Sessions" description="Manage scan sessions with collector, device, and time-window metadata.">
        <div className="fi-two-column">
          <DataTable
            rows={filteredSessions}
            onRowClick={(record) => setSelectedSessionId(record.id)}
            empty={<EmptyState title="No scan sessions" description={selectedFloorId ? "Create the first scan session for this floor." : "Select a floor first."} />}
            columns={[
              { key: "name", header: "Session", render: (record) => record.name },
              {
                key: "context",
                header: "Context",
                render: (record) => (
                  <div style={{ display: "grid", gap: "0.1rem" }}>
                    <span>{textLabel(floors.find((floor) => floor.id === record.floorId) ?? { name: "Floor" })}</span>
                    <span style={{ color: "#64748b", fontSize: "0.82rem" }}>{sourceLabel(record.source)}</span>
                  </div>
                )
              },
              { key: "collector", header: "Collector", render: (record) => record.collectorDisplayName ?? record.collectorDeviceLabel ?? "Not set" },
              { key: "samples", header: "Samples", render: (record) => record.sampleCount },
              { key: "started", header: "Started", render: (record) => formatDateTime(record.startedAt) },
              { key: "status", header: "Status", render: (record) => <Badge tone={statusTone(record.status)}>{record.status}</Badge> }
            ]}
          />

          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedFloorId) {
                setMessage("Select a floor before managing scan sessions.");
                return;
              }

              const payload = {
                facilityId: selectedFacilityId,
                buildingId: selectedBuildingId,
                floorId: selectedFloorId,
                zoneId: nullableString(sessionForm.zoneId),
                roomId: nullableString(sessionForm.roomId),
                collectorUserId: nullableString(sessionForm.collectorUserId),
                collectorDeviceLabel: nullableString(sessionForm.collectorDeviceLabel),
                name: sessionForm.name,
                code: nullableString(sessionForm.code),
                source: sessionForm.source,
                startedAt: toIsoDateTime(sessionForm.startedAt),
                endedAt: toIsoDateTime(sessionForm.endedAt),
                status: sessionForm.status,
                notes: nullableString(sessionForm.notes)
              };

              void runMutation(
                () =>
                  selectedSessionId
                    ? apiRequest(`/api/wifi/sessions/${selectedSessionId}`, { method: "PATCH", body: JSON.stringify(payload) }, token)
                    : apiRequest("/api/wifi/sessions", { method: "POST", body: JSON.stringify(payload) }, token),
                selectedSessionId ? "Scan session updated." : "Scan session created."
              );
            }}
          >
            <Field label="Name">
              <TextInput value={sessionForm.name} onChange={(event) => setSessionForm({ ...sessionForm, name: event.target.value })} required disabled={!selectedFloorId || !hasWriteAccess} />
            </Field>
            <Field label="Code">
              <TextInput value={sessionForm.code} onChange={(event) => setSessionForm({ ...sessionForm, code: event.target.value })} disabled={!selectedFloorId || !hasWriteAccess} />
            </Field>
            <Field label="Source">
              <SelectInput value={sessionForm.source} onChange={(event) => setSessionForm({ ...sessionForm, source: event.target.value })} disabled={!selectedFloorId || !hasWriteAccess}>
                {sessionSourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Collector user ID">
              <TextInput value={sessionForm.collectorUserId} onChange={(event) => setSessionForm({ ...sessionForm, collectorUserId: event.target.value })} disabled={!selectedFloorId || !hasWriteAccess} />
            </Field>
            <Field label="Collector device label">
              <TextInput value={sessionForm.collectorDeviceLabel} onChange={(event) => setSessionForm({ ...sessionForm, collectorDeviceLabel: event.target.value })} disabled={!selectedFloorId || !hasWriteAccess} />
            </Field>
            <Field label="Zone">
              <SelectInput value={sessionForm.zoneId} onChange={(event) => setSessionForm({ ...sessionForm, zoneId: event.target.value, roomId: "" })} disabled={!selectedFloorId || !hasWriteAccess}>
                <option value="">No zone</option>
                {filteredZones.map((record) => (
                  <option key={record.id} value={record.id}>
                    {textLabel(record)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Room">
              <SelectInput value={sessionForm.roomId} onChange={(event) => setSessionForm({ ...sessionForm, roomId: event.target.value })} disabled={!selectedFloorId || !hasWriteAccess}>
                <option value="">No room</option>
                {filteredRooms
                  .filter((record) => !sessionForm.zoneId || record.zoneId === sessionForm.zoneId)
                  .map((record) => (
                    <option key={record.id} value={record.id}>
                      {textLabel(record)}
                    </option>
                  ))}
              </SelectInput>
            </Field>
            <Field label="Start time">
              <TextInput type="datetime-local" value={sessionForm.startedAt} onChange={(event) => setSessionForm({ ...sessionForm, startedAt: event.target.value })} required disabled={!selectedFloorId || !hasWriteAccess} />
            </Field>
            <Field label="End time">
              <TextInput type="datetime-local" value={sessionForm.endedAt} onChange={(event) => setSessionForm({ ...sessionForm, endedAt: event.target.value })} disabled={!selectedFloorId || !hasWriteAccess} />
            </Field>
            <Field label="Status">
              <SelectInput value={sessionForm.status} onChange={(event) => setSessionForm({ ...sessionForm, status: event.target.value })} disabled={!selectedFloorId || !hasWriteAccess}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <Field label="Notes">
              <TextareaInput value={sessionForm.notes} onChange={(event) => setSessionForm({ ...sessionForm, notes: event.target.value })} rows={4} disabled={!selectedFloorId || !hasWriteAccess} />
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!selectedFloorId || !hasWriteAccess}>
                {selectedSessionId ? "Save session" : "Create session"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedSessionId("");
                  setSessionForm({
                    ...blankSessionForm,
                    facilityId: selectedFacilityId,
                    buildingId: selectedBuildingId,
                    floorId: selectedFloorId
                  });
                }}
              >
                New session
              </Button>
              {selectedSessionId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this scan session?")) {
                      void runMutation(
                        () => apiRequest(`/api/wifi/sessions/${selectedSessionId}/archive`, { method: "POST" }, token),
                        "Scan session archived."
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

      <SectionCard title="Scan Samples" description="Capture SSID, RSSI, channel, and coordinate data for the selected session.">
        <div className="fi-two-column">
          <DataTable
            rows={selectedSessionSamples}
            onRowClick={(record) => setSelectedSampleId(record.id)}
            empty={<EmptyState title="No scan samples" description={selectedSessionId ? "Add the first sample for this session." : "Select a session first."} />}
            columns={[
              { key: "ssid", header: "SSID", render: (record) => sampleLabel(record) },
              { key: "rssi", header: "RSSI", render: (record) => <Badge tone={rssiTone(record.rssi)}>{`${record.rssi} dBm`}</Badge> },
              { key: "band", header: "Band", render: (record) => <Badge tone={bandTone(record.band)}>{record.band}</Badge> },
              { key: "coordinate", header: "Coordinate", render: (record) => coordinateLabel(record.coordinate) },
              { key: "ap", header: "Access point", render: (record) => record.accessPointName ?? record.accessPointCode ?? "Not set" }
            ]}
          />

          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedSessionId) {
                setMessage("Select a scan session before managing samples.");
                return;
              }

              const coordinateX = nullableNumber(sampleForm.coordinateX);
              const coordinateY = nullableNumber(sampleForm.coordinateY);
              const payload = {
                wifiScanSessionId: selectedSessionId,
                facilityId: selectedFacilityId,
                buildingId: selectedBuildingId,
                floorId: selectedFloorId,
                zoneId: nullableString(sampleForm.zoneId),
                roomId: nullableString(sampleForm.roomId),
                accessPointId: nullableString(sampleForm.accessPointId),
                ssid: sampleForm.ssid,
                bssid: sampleForm.bssid,
                rssi: Number(sampleForm.rssi),
                frequencyMHz: nullableNumber(sampleForm.frequencyMHz),
                channel: nullableNumber(sampleForm.channel),
                band: sampleForm.band,
                sampledAt: toIsoDateTime(sampleForm.sampledAt),
                coordinate: coordinateX !== null && coordinateY !== null ? { x: coordinateX, y: coordinateY } : null,
                status: sampleForm.status
              };

              void runMutation(
                () =>
                  selectedSampleId
                    ? apiRequest(`/api/wifi/samples/${selectedSampleId}`, { method: "PATCH", body: JSON.stringify(payload) }, token)
                    : apiRequest("/api/wifi/samples", { method: "POST", body: JSON.stringify(payload) }, token),
                selectedSampleId ? "Scan sample updated." : "Scan sample created."
              );
            }}
          >
            <Field label="SSID">
              <TextInput value={sampleForm.ssid} onChange={(event) => setSampleForm({ ...sampleForm, ssid: event.target.value })} required disabled={!selectedSessionId || !hasWriteAccess} />
            </Field>
            <Field label="BSSID">
              <TextInput value={sampleForm.bssid} onChange={(event) => setSampleForm({ ...sampleForm, bssid: event.target.value })} required disabled={!selectedSessionId || !hasWriteAccess} />
            </Field>
            <Field label="RSSI">
              <TextInput type="number" value={sampleForm.rssi} onChange={(event) => setSampleForm({ ...sampleForm, rssi: event.target.value })} required disabled={!selectedSessionId || !hasWriteAccess} />
            </Field>
            <Field label="Band">
              <SelectInput value={sampleForm.band} onChange={(event) => setSampleForm({ ...sampleForm, band: event.target.value })} disabled={!selectedSessionId || !hasWriteAccess}>
                {bandOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Frequency MHz">
              <TextInput type="number" value={sampleForm.frequencyMHz} onChange={(event) => setSampleForm({ ...sampleForm, frequencyMHz: event.target.value })} disabled={!selectedSessionId || !hasWriteAccess} />
            </Field>
            <Field label="Channel">
              <TextInput type="number" value={sampleForm.channel} onChange={(event) => setSampleForm({ ...sampleForm, channel: event.target.value })} disabled={!selectedSessionId || !hasWriteAccess} />
            </Field>
            <Field label="Sampled at">
              <TextInput type="datetime-local" value={sampleForm.sampledAt} onChange={(event) => setSampleForm({ ...sampleForm, sampledAt: event.target.value })} required disabled={!selectedSessionId || !hasWriteAccess} />
            </Field>
            <Field label="Coordinate X">
              <TextInput type="number" value={sampleForm.coordinateX} onChange={(event) => setSampleForm({ ...sampleForm, coordinateX: event.target.value })} disabled={!selectedSessionId || !hasWriteAccess} />
            </Field>
            <Field label="Coordinate Y">
              <TextInput type="number" value={sampleForm.coordinateY} onChange={(event) => setSampleForm({ ...sampleForm, coordinateY: event.target.value })} disabled={!selectedSessionId || !hasWriteAccess} />
            </Field>
            <Field label="Zone">
              <SelectInput value={sampleForm.zoneId} onChange={(event) => setSampleForm({ ...sampleForm, zoneId: event.target.value, roomId: "" })} disabled={!selectedSessionId || !hasWriteAccess}>
                <option value="">No zone</option>
                {filteredZones.map((record) => (
                  <option key={record.id} value={record.id}>
                    {textLabel(record)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Room">
              <SelectInput value={sampleForm.roomId} onChange={(event) => setSampleForm({ ...sampleForm, roomId: event.target.value })} disabled={!selectedSessionId || !hasWriteAccess}>
                <option value="">No room</option>
                {filteredRooms
                  .filter((record) => !sampleForm.zoneId || record.zoneId === sampleForm.zoneId)
                  .map((record) => (
                    <option key={record.id} value={record.id}>
                      {textLabel(record)}
                    </option>
                  ))}
              </SelectInput>
            </Field>
            <Field label="Access point">
              <SelectInput value={sampleForm.accessPointId} onChange={(event) => setSampleForm({ ...sampleForm, accessPointId: event.target.value })} disabled={!selectedSessionId || !hasWriteAccess}>
                <option value="">No access point</option>
                {filteredAccessPoints.map((record) => (
                  <option key={record.id} value={record.id}>
                    {textLabel(record)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={sampleForm.status} onChange={(event) => setSampleForm({ ...sampleForm, status: event.target.value })} disabled={!selectedSessionId || !hasWriteAccess}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!selectedSessionId || !hasWriteAccess}>
                {selectedSampleId ? "Save sample" : "Create sample"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedSampleId("");
                  setSampleForm({
                    ...blankSampleForm,
                    wifiScanSessionId: selectedSessionId,
                    facilityId: selectedFacilityId,
                    buildingId: selectedBuildingId,
                    floorId: selectedFloorId
                  });
                }}
              >
                New sample
              </Button>
              {selectedSampleId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this scan sample?")) {
                      void runMutation(
                        () => apiRequest(`/api/wifi/samples/${selectedSampleId}/archive`, { method: "POST" }, token),
                        "Scan sample archived."
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

      <SectionCard title="CSV Import" description="Paste scan rows, preview them on the client, then import structured samples into the selected session.">
        <div className="fi-two-column">
          <div className="fi-page-stack">
            <Field label="Paste CSV">
              <TextareaInput
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                rows={10}
                placeholder={`ssid,bssid,rssi,frequencyMHz,channel,band,sampledAt,x,y,zoneId,roomId,accessPointId\nFacilitySecure,AA:BB:CC:DD:EE:01,-61,5180,36,5ghz,2026-03-29T15:16:00.000Z,200,220,,,`}
                disabled={!selectedSessionId || !hasWriteAccess}
              />
            </Field>
            <div className="fi-form-actions">
              <Button type="button" variant="secondary" disabled={!selectedSessionId || !hasWriteAccess} onClick={previewCsv}>
                Preview rows
              </Button>
              <Button
                type="button"
                disabled={!selectedSessionId || !hasWriteAccess || importPreview.rows.length === 0 || importPreview.issues.length > 0}
                onClick={() => {
                  void runMutation(
                    () =>
                      apiRequest(
                        "/api/wifi/samples/import",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            wifiScanSessionId: selectedSessionId,
                            rows: importPreview.rows
                          })
                        },
                        token
                      ),
                    `Imported ${importPreview.rows.length} Wi-Fi samples.`
                  );
                }}
              >
                Import samples
              </Button>
            </div>
          </div>

          <div className="fi-page-stack">
            <DefinitionList
              items={[
                { label: "Preview rows", value: importPreview.rows.length },
                { label: "Issues", value: importPreview.issues.length },
                { label: "Columns", value: importPreview.columns.length > 0 ? importPreview.columns.join(", ") : "Not parsed yet" }
              ]}
            />
            {importPreview.issues.length > 0 ? (
              <PanelMessage tone="warning" title="CSV validation">
                {importPreview.issues[0]}
              </PanelMessage>
            ) : null}
            <DataTable
              rows={importPreview.rows}
              empty={<EmptyState title="No parsed rows" description="Preview CSV rows to see structured samples before importing." />}
              columns={[
                { key: "ssid", header: "SSID", render: (record) => record.ssid },
                { key: "bssid", header: "BSSID", render: (record) => record.bssid },
                { key: "rssi", header: "RSSI", render: (record) => `${record.rssi} dBm` },
                { key: "band", header: "Band", render: (record) => <Badge tone={bandTone(record.band)}>{record.band}</Badge> },
                { key: "coordinate", header: "Coordinate", render: (record) => coordinateLabel(record.coordinate) }
              ]}
            />
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
