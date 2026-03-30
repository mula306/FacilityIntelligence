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
import { FloorCanvas, GeometryCanvasEditor } from "./FloorCanvas";
import { createGeometry, geometryLabel, parseGeometry, stringifyGeometry, type GeometryData, type GeometryKind } from "./geometry";

interface Summary {
  facilities: number;
  buildings: number;
  floors: number;
  floorPlanVersions: number;
  annotations: number;
  zones: number;
  rooms: number;
}

interface FacilityRecord {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

interface BuildingRecord {
  id: string;
  facilityId: string;
  name: string;
  code: string | null;
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
  planImageUrl: string | null;
  status: string;
}

interface FloorPlanVersionRecord {
  id: string;
  floorId: string;
  floorName: string | null;
  floorCode: string | null;
  name: string;
  versionLabel: string | null;
  assetUrl: string | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
  source: string | null;
  isCurrent: boolean;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface AnnotationRecord {
  id: string;
  floorId: string;
  floorName: string | null;
  floorCode: string | null;
  floorPlanVersionId: string | null;
  floorPlanVersionName: string | null;
  floorPlanVersionLabel: string | null;
  zoneId: string | null;
  zoneName: string | null;
  roomId: string | null;
  roomName: string | null;
  roomNumber: string | null;
  title: string;
  annotationType: string;
  severity: string | null;
  geometry: unknown;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface ZoneRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  name: string;
  code: string | null;
  status: string;
  geometry: unknown;
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
  status: string;
  geometry: unknown;
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
    floorPlanVersions: FloorPlanVersionRecord[];
    annotations: AnnotationRecord[];
    zones: ZoneRecord[];
    rooms: RoomRecord[];
  };
}

interface FloorCanvasFormState {
  canvasWidth: string;
  canvasHeight: string;
  planImageUrl: string;
}

interface FloorPlanVersionFormState {
  name: string;
  versionLabel: string;
  assetUrl: string;
  canvasWidth: string;
  canvasHeight: string;
  source: string;
  notes: string;
  status: string;
  isCurrent: boolean;
}

interface AnnotationFormState {
  title: string;
  annotationType: string;
  severity: string;
  zoneId: string;
  roomId: string;
  floorPlanVersionId: string;
  notes: string;
  status: string;
}

type GeometryTarget = "zone" | "room" | "annotation";

const planSourceOptions = [
  { value: "manual-canvas", label: "Manual canvas" },
  { value: "upload", label: "Uploaded asset" },
  { value: "url", label: "External URL" },
  { value: "import", label: "Imported asset" }
] as const;

const annotationTypeOptions = [
  { value: "note", label: "Note" },
  { value: "warning", label: "Warning" },
  { value: "workflow", label: "Workflow" },
  { value: "entrance", label: "Entrance" },
  { value: "restricted-area", label: "Restricted area" },
  { value: "coverage-gap", label: "Coverage gap" }
] as const;

const severityOptions = [
  { value: "", label: "Not set" },
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" }
] as const;

const blankFloorCanvasForm: FloorCanvasFormState = { canvasWidth: "", canvasHeight: "", planImageUrl: "" };
const blankPlanVersionForm: FloorPlanVersionFormState = {
  name: "",
  versionLabel: "",
  assetUrl: "",
  canvasWidth: "",
  canvasHeight: "",
  source: "manual-canvas",
  notes: "",
  status: "active",
  isCurrent: true
};
const blankAnnotationForm: AnnotationFormState = {
  title: "",
  annotationType: "coverage-gap",
  severity: "moderate",
  zoneId: "",
  roomId: "",
  floorPlanVersionId: "",
  notes: "",
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
  if (Number.isNaN(parsed)) {
    throw new Error("Expected a numeric value.");
  }

  return parsed;
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

function severityTone(severity: string | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (severity === "low") {
    return "success";
  }
  if (severity === "moderate") {
    return "info";
  }
  if (severity === "high") {
    return "warning";
  }
  if (severity === "critical") {
    return "danger";
  }
  return "neutral";
}

function severityLabel(severity: string | null) {
  if (!severity) {
    return "Not set";
  }

  return severity === "moderate" ? "Moderate" : `${severity.charAt(0).toUpperCase()}${severity.slice(1)}`;
}

function defaultGeometryKind(target: GeometryTarget): GeometryKind {
  return target === "annotation" ? "point" : "polygon";
}

function targetLabel(target: GeometryTarget) {
  if (target === "zone") {
    return "Zone";
  }
  if (target === "room") {
    return "Room";
  }
  return "Annotation";
}

function recordStatus(record: { status: string; archivedAt?: string | null }) {
  return record.archivedAt ? "archived" : record.status;
}

function textLabel(record: { name?: string; title?: string; code?: string | null }) {
  const base = record.name ?? record.title ?? "";
  return record.code ? `${base} (${record.code})` : base;
}

function annotationScope(record: AnnotationRecord) {
  if (record.roomId) {
    return "Room";
  }
  if (record.zoneId) {
    return "Zone";
  }
  if (record.floorPlanVersionId) {
    return "Plan version";
  }
  return "Floor";
}

function annotationLocationLabel(record: AnnotationRecord) {
  if (record.roomName) {
    return record.roomNumber ? `${record.roomName} (${record.roomNumber})` : record.roomName;
  }
  if (record.zoneName) {
    return record.zoneName;
  }
  if (record.floorPlanVersionName) {
    return record.floorPlanVersionLabel
      ? `${record.floorPlanVersionName} (${record.floorPlanVersionLabel})`
      : record.floorPlanVersionName;
  }
  return record.floorName ?? "Floor-wide";
}

export function MappingPage({
  token,
  hasWriteAccess
}: {
  token: string;
  hasWriteAccess: boolean;
}) {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [workspaceFloorId, setWorkspaceFloorId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedPlanVersionId, setSelectedPlanVersionId] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState("");
  const [geometryTarget, setGeometryTarget] = useState<GeometryTarget>("zone");
  const [selectedGeometryId, setSelectedGeometryId] = useState("");
  const [floorCanvasForm, setFloorCanvasForm] = useState<FloorCanvasFormState>(blankFloorCanvasForm);
  const [planVersionForm, setPlanVersionForm] = useState<FloorPlanVersionFormState>(blankPlanVersionForm);
  const [annotationForm, setAnnotationForm] = useState<AnnotationFormState>(blankAnnotationForm);
  const [annotationGeometryDraft, setAnnotationGeometryDraft] = useState<GeometryData>(createGeometry(defaultGeometryKind("annotation")));
  const [geometryDraft, setGeometryDraft] = useState<GeometryData>(createGeometry(defaultGeometryKind("zone")));

  async function loadBootstrap(floorId?: string) {
    const query = floorId ? `?floorId=${encodeURIComponent(floorId)}` : "";
    const response = await apiRequest<{ data: BootstrapPayload }>(`/api/mapping/bootstrap${query}`, {}, token);
    setData(response.data);
    setWorkspaceFloorId(response.data.selection.floorId);
  }

  useEffect(() => {
    setLoading(true);
    loadBootstrap()
      .catch((error: unknown) => {
        setMessage(error instanceof ApiError ? error.message : "Unable to load mapping workspace.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selectedFloorId || selectedFloorId === workspaceFloorId) {
      return;
    }

    loadBootstrap(selectedFloorId).catch((error: unknown) => {
      setMessage(error instanceof ApiError ? error.message : "Unable to refresh the mapping workspace.");
    });
  }, [selectedFloorId, token, workspaceFloorId]);

  const facilities = data?.lists.facilities ?? [];
  const buildings = data?.lists.buildings ?? [];
  const floors = data?.lists.floors ?? [];
  const floorPlanVersions = data?.lists.floorPlanVersions ?? [];
  const annotations = data?.lists.annotations ?? [];
  const zones = data?.lists.zones ?? [];
  const rooms = data?.lists.rooms ?? [];

  const selectedFacility = facilities.find((record) => record.id === selectedFacilityId) ?? null;
  const selectedBuilding = buildings.find((record) => record.id === selectedBuildingId) ?? null;
  const selectedFloor = floors.find((record) => record.id === selectedFloorId) ?? null;
  const selectedPlanVersion = floorPlanVersions.find((record) => record.id === selectedPlanVersionId) ?? null;
  const selectedAnnotation = annotations.find((record) => record.id === selectedAnnotationId) ?? null;

  const filteredBuildings = useMemo(
    () => buildings.filter((record) => !selectedFacilityId || record.facilityId === selectedFacilityId),
    [buildings, selectedFacilityId]
  );
  const filteredFloors = useMemo(
    () => floors.filter((record) => !selectedBuildingId || record.buildingId === selectedBuildingId),
    [floors, selectedBuildingId]
  );
  const filteredPlanVersions = useMemo(
    () => (selectedFloorId ? floorPlanVersions.filter((record) => record.floorId === selectedFloorId) : []),
    [floorPlanVersions, selectedFloorId]
  );
  const filteredAnnotations = useMemo(
    () => (selectedFloorId ? annotations.filter((record) => record.floorId === selectedFloorId) : []),
    [annotations, selectedFloorId]
  );
  const filteredZones = useMemo(
    () => (selectedFloorId ? zones.filter((record) => record.floorId === selectedFloorId) : []),
    [selectedFloorId, zones]
  );
  const filteredRooms = useMemo(
    () => (selectedFloorId ? rooms.filter((record) => record.floorId === selectedFloorId) : []),
    [rooms, selectedFloorId]
  );

  const currentFloorVersions = useMemo(
    () => filteredPlanVersions.filter((record) => record.status !== "archived"),
    [filteredPlanVersions]
  );
  const currentFloorAnnotations = useMemo(
    () => filteredAnnotations.filter((record) => record.status !== "archived"),
    [filteredAnnotations]
  );

  const selectedGeometryRecord = useMemo(() => {
    if (geometryTarget === "zone") {
      return filteredZones.find((record) => record.id === selectedGeometryId) ?? null;
    }
    if (geometryTarget === "room") {
      return filteredRooms.find((record) => record.id === selectedGeometryId) ?? null;
    }
    return filteredAnnotations.find((record) => record.id === selectedGeometryId) ?? null;
  }, [filteredAnnotations, filteredRooms, filteredZones, geometryTarget, selectedGeometryId]);

  const floorCanvasWidth = selectedPlanVersion?.canvasWidth ?? selectedFloor?.canvasWidth ?? 1200;
  const floorCanvasHeight = selectedPlanVersion?.canvasHeight ?? selectedFloor?.canvasHeight ?? 800;
  const floorCanvasImageUrl = selectedPlanVersion?.assetUrl ?? selectedFloor?.planImageUrl ?? null;

  useEffect(() => {
    if (!selectedFacilityId && facilities.length > 0) {
      setSelectedFacilityId(facilities[0]?.id ?? "");
    }
  }, [facilities, selectedFacilityId]);

  useEffect(() => {
    if (selectedFacilityId && filteredBuildings.length > 0 && !filteredBuildings.some((record) => record.id === selectedBuildingId)) {
      setSelectedBuildingId(filteredBuildings[0]?.id ?? "");
      setSelectedFloorId("");
      setSelectedPlanVersionId("");
      setSelectedAnnotationId("");
      setSelectedGeometryId("");
    }
    if (selectedFacilityId && filteredBuildings.length === 0) {
      setSelectedBuildingId("");
      setSelectedFloorId("");
      setSelectedPlanVersionId("");
      setSelectedAnnotationId("");
      setSelectedGeometryId("");
    }
  }, [filteredBuildings, selectedBuildingId, selectedFacilityId]);

  useEffect(() => {
    if (selectedBuildingId && filteredFloors.length > 0 && !filteredFloors.some((record) => record.id === selectedFloorId)) {
      setSelectedFloorId(filteredFloors[0]?.id ?? "");
      setSelectedPlanVersionId("");
      setSelectedAnnotationId("");
      setSelectedGeometryId("");
    }
    if (selectedBuildingId && filteredFloors.length === 0) {
      setSelectedFloorId("");
      setSelectedPlanVersionId("");
      setSelectedAnnotationId("");
      setSelectedGeometryId("");
    }
  }, [filteredFloors, selectedBuildingId, selectedFloorId]);

  useEffect(() => {
    if (selectedFloorId && currentFloorVersions.length > 0 && !currentFloorVersions.some((record) => record.id === selectedPlanVersionId)) {
      setSelectedPlanVersionId(currentFloorVersions.find((record) => record.isCurrent)?.id ?? currentFloorVersions[0]?.id ?? "");
    }
    if (selectedFloorId && currentFloorVersions.length === 0) {
      setSelectedPlanVersionId("");
    }
  }, [currentFloorVersions, selectedFloorId, selectedPlanVersionId]);

  useEffect(() => {
    if (selectedFloorId && currentFloorAnnotations.length > 0 && !currentFloorAnnotations.some((record) => record.id === selectedAnnotationId)) {
      setSelectedAnnotationId(currentFloorAnnotations[0]?.id ?? "");
    }
    if (selectedFloorId && currentFloorAnnotations.length === 0) {
      setSelectedAnnotationId("");
    }
  }, [currentFloorAnnotations, selectedAnnotationId, selectedFloorId]);

  useEffect(() => {
    const next =
      geometryTarget === "zone"
        ? filteredZones.find((record) => record.id === selectedGeometryId) ?? filteredZones[0] ?? null
        : geometryTarget === "room"
          ? filteredRooms.find((record) => record.id === selectedGeometryId) ?? filteredRooms[0] ?? null
          : filteredAnnotations.find((record) => record.id === selectedGeometryId) ?? filteredAnnotations[0] ?? null;

    if (next && next.id !== selectedGeometryId) {
      setSelectedGeometryId(next.id);
    }
    if (!next) {
      setSelectedGeometryId("");
    }
  }, [filteredAnnotations, filteredRooms, filteredZones, geometryTarget, selectedGeometryId]);

  useEffect(() => {
    if (selectedFloor) {
      setFloorCanvasForm({
        canvasWidth: selectedFloor.canvasWidth?.toString() ?? "",
        canvasHeight: selectedFloor.canvasHeight?.toString() ?? "",
        planImageUrl: selectedFloor.planImageUrl ?? ""
      });
    } else {
      setFloorCanvasForm(blankFloorCanvasForm);
    }
  }, [selectedFloor]);

  useEffect(() => {
    if (selectedPlanVersion) {
      setPlanVersionForm({
        name: selectedPlanVersion.name,
        versionLabel: selectedPlanVersion.versionLabel ?? "",
        assetUrl: selectedPlanVersion.assetUrl ?? "",
        canvasWidth: selectedPlanVersion.canvasWidth?.toString() ?? "",
        canvasHeight: selectedPlanVersion.canvasHeight?.toString() ?? "",
        source: selectedPlanVersion.source ?? "manual-canvas",
        notes: selectedPlanVersion.notes ?? "",
        status: selectedPlanVersion.status,
        isCurrent: selectedPlanVersion.isCurrent
      });
    } else {
      setPlanVersionForm({
        ...blankPlanVersionForm,
        canvasWidth: selectedFloor?.canvasWidth?.toString() ?? "",
        canvasHeight: selectedFloor?.canvasHeight?.toString() ?? ""
      });
    }
  }, [selectedFloor, selectedPlanVersion]);

  useEffect(() => {
    if (selectedAnnotation) {
      setAnnotationForm({
        title: selectedAnnotation.title,
        annotationType: selectedAnnotation.annotationType,
        severity: selectedAnnotation.severity ?? "",
        zoneId: selectedAnnotation.zoneId ?? "",
        roomId: selectedAnnotation.roomId ?? "",
        floorPlanVersionId: selectedAnnotation.floorPlanVersionId ?? "",
        notes: selectedAnnotation.notes ?? "",
        status: selectedAnnotation.status
      });
      setAnnotationGeometryDraft(parseGeometry(selectedAnnotation.geometry) ?? createGeometry(defaultGeometryKind("annotation")));
    } else {
      setAnnotationForm(blankAnnotationForm);
      setAnnotationGeometryDraft(createGeometry(defaultGeometryKind("annotation")));
    }
  }, [selectedAnnotation]);

  useEffect(() => {
    if (selectedGeometryRecord) {
      setGeometryDraft(parseGeometry(selectedGeometryRecord.geometry) ?? createGeometry(defaultGeometryKind(geometryTarget)));
    } else {
      setGeometryDraft(createGeometry(defaultGeometryKind(geometryTarget)));
    }
  }, [geometryTarget, selectedGeometryRecord]);

  async function runMutation<T>(work: () => Promise<T>, successMessage: string) {
    try {
      await work();
      await loadBootstrap(selectedFloorId || undefined);
      setMessage(successMessage);
    } catch (error: unknown) {
      setMessage(error instanceof ApiError ? error.message : "Unable to save mapping changes.");
    }
  }

  const geometryRows = geometryTarget === "zone" ? filteredZones : geometryTarget === "room" ? filteredRooms : filteredAnnotations;
  const geometryLayers = [
    ...filteredZones.map((record) => ({
      id: `zone-${record.id}`,
      label: record.name,
      tone: record.id === selectedGeometryId && geometryTarget === "zone" ? ("selected" as const) : ("zone" as const),
      geometry: parseGeometry(record.geometry)
    })),
    ...filteredRooms.map((record) => ({
      id: `room-${record.id}`,
      label: record.name,
      tone: record.id === selectedGeometryId && geometryTarget === "room" ? ("selected" as const) : ("room" as const),
      geometry: parseGeometry(record.geometry)
    })),
    ...filteredAnnotations.map((record) => ({
      id: `annotation-${record.id}`,
      label: record.title,
      tone: record.id === selectedGeometryId && geometryTarget === "annotation" ? ("selected" as const) : ("annotation" as const),
      geometry: parseGeometry(record.geometry)
    }))
  ];

  if (loading) {
    return <PanelMessage tone="info" title="Loading mapping workspace">Fetching floor and spatial records.</PanelMessage>;
  }

  if (message && !data) {
    return <PanelMessage tone="warning" title="Mapping workspace unavailable">{message}</PanelMessage>;
  }

  return (
    <div className="fi-page-stack">
      <PageHeader
        title="Mapping and Spatial Intelligence"
        description="Floor-centered tools for plan versions, annotations, and room-level geometry."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSelectedFacilityId(facilities[0]?.id ?? "");
              setSelectedBuildingId("");
              setSelectedFloorId("");
              setSelectedPlanVersionId("");
              setSelectedAnnotationId("");
              setGeometryTarget("zone");
              setSelectedGeometryId("");
            }}
          >
            Reset context
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: "Facilities", value: facilities.length || data?.summary.facilities || 0 },
          { label: "Buildings", value: buildings.length || data?.summary.buildings || 0 },
          { label: "Floors", value: floors.length || data?.summary.floors || 0 },
          { label: "Plan versions", value: floorPlanVersions.length || data?.summary.floorPlanVersions || 0 },
          { label: "Annotations", value: annotations.length || data?.summary.annotations || 0, tone: "warning" },
          { label: "Zones", value: zones.length || data?.summary.zones || 0 },
          { label: "Rooms", value: rooms.length || data?.summary.rooms || 0 }
        ]}
      />

      {message ? (
        <PanelMessage tone={message.toLowerCase().includes("unable") ? "warning" : "info"} title="Mapping status">
          {message}
        </PanelMessage>
      ) : null}

      {!hasWriteAccess ? (
        <PanelMessage tone="info" title="Read-only access">
          You can review mapping records, but edits and archive actions are disabled.
        </PanelMessage>
      ) : null}

      <SectionCard title="Facility Context" description="Select the facility, building, and floor that define the active mapping workspace.">
        <div className="fi-form-grid">
          <Field label="Facility">
            <SelectInput value={selectedFacilityId} onChange={(event) => setSelectedFacilityId(event.target.value)}>
              <option value="">Select a facility</option>
              {facilities.map((record) => (
                <option key={record.id} value={record.id}>
                  {textLabel(record)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Building">
            <SelectInput value={selectedBuildingId} onChange={(event) => setSelectedBuildingId(event.target.value)} disabled={!selectedFacilityId}>
              <option value="">Select a building</option>
              {filteredBuildings.map((record) => (
                <option key={record.id} value={record.id}>
                  {textLabel(record)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Floor">
            <SelectInput value={selectedFloorId} onChange={(event) => setSelectedFloorId(event.target.value)} disabled={!selectedBuildingId}>
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
            { label: "Canvas size", value: `${floorCanvasWidth} x ${floorCanvasHeight}` },
            { label: "Plan image", value: floorCanvasImageUrl ?? "Not set" }
          ]}
        />
      </SectionCard>

      <SectionCard title="Floor Canvas" description="Preview the current floor context with zones, rooms, and annotations over the active plan.">
        {selectedFloor ? (
          <div className="fi-two-column">
            <div className="fi-page-stack">
              <DefinitionList
                items={[
                  { label: "Floor name", value: textLabel(selectedFloor) },
                  { label: "Level", value: selectedFloor.floorNumber },
                  { label: "Current version", value: selectedPlanVersion ? selectedPlanVersion.name : "Using floor default" },
                  { label: "Canvas width", value: selectedFloor.canvasWidth ?? "Not set" },
                  { label: "Canvas height", value: selectedFloor.canvasHeight ?? "Not set" }
                ]}
              />
              <form
                className="fi-form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedFloorId) {
                    return;
                  }

                  try {
                    const payload = {
                      canvasWidth: nullableNumber(floorCanvasForm.canvasWidth),
                      canvasHeight: nullableNumber(floorCanvasForm.canvasHeight),
                      planImageUrl: nullableString(floorCanvasForm.planImageUrl)
                    };

                    void runMutation(
                      () =>
                        apiRequest(
                          `/api/mapping/floors/${selectedFloorId}/canvas`,
                          {
                            method: "PATCH",
                            body: JSON.stringify(payload)
                          },
                          token
                        ),
                      "Floor canvas updated."
                    );
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Unable to prepare the floor canvas update.");
                  }
                }}
              >
                <Field label="Canvas width">
                  <TextInput
                    type="number"
                    value={floorCanvasForm.canvasWidth}
                    onChange={(event) => setFloorCanvasForm({ ...floorCanvasForm, canvasWidth: event.target.value })}
                    disabled={!hasWriteAccess}
                  />
                </Field>
                <Field label="Canvas height">
                  <TextInput
                    type="number"
                    value={floorCanvasForm.canvasHeight}
                    onChange={(event) => setFloorCanvasForm({ ...floorCanvasForm, canvasHeight: event.target.value })}
                    disabled={!hasWriteAccess}
                  />
                </Field>
                <Field label="Plan image URL">
                  <TextInput
                    value={floorCanvasForm.planImageUrl}
                    onChange={(event) => setFloorCanvasForm({ ...floorCanvasForm, planImageUrl: event.target.value })}
                    placeholder="https://..."
                    disabled={!hasWriteAccess}
                  />
                </Field>
                <div className="fi-form-actions">
                  <Button type="submit" disabled={!hasWriteAccess || !selectedFloorId}>
                    Save canvas
                  </Button>
                </div>
              </form>
            </div>
            <FloorCanvas
              width={floorCanvasWidth}
              height={floorCanvasHeight}
              backgroundImageUrl={floorCanvasImageUrl}
              title={textLabel(selectedFloor)}
              subtitle="Zones, rooms, and annotations are rendered against the current floor workspace."
              layers={geometryLayers}
            />
          </div>
        ) : (
          <EmptyState title="Select a floor to view the canvas" description="Choose a facility, building, and floor to inspect mapping records." />
        )}
      </SectionCard>

      <SectionCard title="Floor Plan Versions" description="Manage authoritative floor plan assets and keep one current version per floor.">
        <div className="fi-two-column">
          <DataTable
            rows={filteredPlanVersions}
            onRowClick={(record) => setSelectedPlanVersionId(record.id)}
            empty={<EmptyState title="No floor plan versions" description={selectedFloor ? "Create the first version for this floor." : "Select a floor first."} />}
            columns={[
              { key: "name", header: "Plan", render: (record) => record.name },
              {
                key: "state",
                header: "State",
                render: (record) => (
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    <Badge tone={record.isCurrent ? "success" : "neutral"}>{record.isCurrent ? "Current" : "Version"}</Badge>
                    <Badge tone={statusTone(recordStatus(record))}>{recordStatus(record)}</Badge>
                  </div>
                )
              },
              { key: "source", header: "Source", render: (record) => record.source ?? "Not set" },
              { key: "size", header: "Canvas", render: (record) => `${record.canvasWidth ?? "?"} x ${record.canvasHeight ?? "?"}` },
              { key: "updated", header: "Updated", render: (record) => formatDateTime(record.updatedAt) }
            ]}
          />
          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedFloor) {
                setMessage("Select a floor before managing plan versions.");
                return;
              }

              try {
                const payload = {
                  floorId: selectedFloor.id,
                  name: planVersionForm.name,
                  versionLabel: nullableString(planVersionForm.versionLabel),
                  assetUrl: nullableString(planVersionForm.assetUrl),
                  canvasWidth: nullableNumber(planVersionForm.canvasWidth),
                  canvasHeight: nullableNumber(planVersionForm.canvasHeight),
                  source: planVersionForm.source,
                  notes: nullableString(planVersionForm.notes),
                  status: planVersionForm.status,
                  isCurrent: planVersionForm.isCurrent
                };

                void runMutation(
                  () =>
                    selectedPlanVersionId
                      ? apiRequest(`/api/mapping/floor-plan-versions/${selectedPlanVersionId}`, { method: "PATCH", body: JSON.stringify(payload) }, token)
                      : apiRequest("/api/mapping/floor-plan-versions", { method: "POST", body: JSON.stringify(payload) }, token),
                  selectedPlanVersionId ? "Floor plan version updated." : "Floor plan version created."
                );
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Unable to prepare the floor plan version.");
              }
            }}
          >
            <Field label="Plan name">
              <TextInput
                value={planVersionForm.name}
                onChange={(event) => setPlanVersionForm({ ...planVersionForm, name: event.target.value })}
                required
                disabled={!selectedFloorId || !hasWriteAccess}
              />
            </Field>
            <Field label="Version label">
              <TextInput
                value={planVersionForm.versionLabel}
                onChange={(event) => setPlanVersionForm({ ...planVersionForm, versionLabel: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              />
            </Field>
            <Field label="Asset URL">
              <TextInput
                value={planVersionForm.assetUrl}
                onChange={(event) => setPlanVersionForm({ ...planVersionForm, assetUrl: event.target.value })}
                placeholder="https://..."
                disabled={!selectedFloorId || !hasWriteAccess}
              />
            </Field>
            <Field label="Canvas width">
              <TextInput
                type="number"
                value={planVersionForm.canvasWidth}
                onChange={(event) => setPlanVersionForm({ ...planVersionForm, canvasWidth: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              />
            </Field>
            <Field label="Canvas height">
              <TextInput
                type="number"
                value={planVersionForm.canvasHeight}
                onChange={(event) => setPlanVersionForm({ ...planVersionForm, canvasHeight: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              />
            </Field>
            <Field label="Source">
              <SelectInput
                value={planVersionForm.source}
                onChange={(event) => setPlanVersionForm({ ...planVersionForm, source: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              >
                {planSourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput
                value={planVersionForm.status}
                onChange={(event) => setPlanVersionForm({ ...planVersionForm, status: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <Field label="Current version">
              <SelectInput
                value={planVersionForm.isCurrent ? "true" : "false"}
                onChange={(event) => setPlanVersionForm({ ...planVersionForm, isCurrent: event.target.value === "true" })}
                disabled={!selectedFloorId || !hasWriteAccess}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </SelectInput>
            </Field>
            <Field label="Notes">
              <TextareaInput
                value={planVersionForm.notes}
                onChange={(event) => setPlanVersionForm({ ...planVersionForm, notes: event.target.value })}
                rows={4}
                disabled={!selectedFloorId || !hasWriteAccess}
              />
            </Field>
            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess || !selectedFloorId}>
                {selectedPlanVersionId ? "Save version" : "Create version"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedPlanVersionId("");
                  setPlanVersionForm({
                    ...blankPlanVersionForm,
                    canvasWidth: selectedFloor?.canvasWidth?.toString() ?? "",
                    canvasHeight: selectedFloor?.canvasHeight?.toString() ?? ""
                  });
                }}
              >
                New version
              </Button>
              {selectedPlanVersionId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this floor plan version?")) {
                      void runMutation(
                        () => apiRequest(`/api/mapping/floor-plan-versions/${selectedPlanVersionId}/archive`, { method: "POST" }, token),
                        "Floor plan version archived."
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

      <SectionCard title="Annotations" description="Track floor, zone, and room-level issues without detaching them from the mapped workspace.">
        <div className="fi-two-column">
          <DataTable
            rows={filteredAnnotations}
            onRowClick={(record) => setSelectedAnnotationId(record.id)}
            empty={<EmptyState title="No annotations" description={selectedFloor ? "Add the first annotation for this floor." : "Select a floor first."} />}
            columns={[
              { key: "title", header: "Annotation", render: (record) => record.title },
              { key: "type", header: "Type", render: (record) => record.annotationType },
              { key: "scope", header: "Scope", render: (record) => annotationScope(record) },
              { key: "location", header: "Location", render: (record) => annotationLocationLabel(record) },
              { key: "severity", header: "Severity", render: (record) => <Badge tone={severityTone(record.severity)}>{severityLabel(record.severity)}</Badge> }
            ]}
          />

          <form
            className="fi-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedFloor) {
                setMessage("Select a floor before managing annotations.");
                return;
              }

              const payload = {
                floorId: selectedFloor.id,
                floorPlanVersionId: nullableString(annotationForm.floorPlanVersionId),
                zoneId: nullableString(annotationForm.zoneId),
                roomId: nullableString(annotationForm.roomId),
                title: annotationForm.title,
                annotationType: annotationForm.annotationType,
                severity: nullableString(annotationForm.severity),
                geometry: annotationGeometryDraft.points.length > 0 ? annotationGeometryDraft : createGeometry(defaultGeometryKind("annotation")),
                status: annotationForm.status,
                notes: nullableString(annotationForm.notes)
              };

              void runMutation(
                () =>
                  selectedAnnotationId
                    ? apiRequest(`/api/mapping/annotations/${selectedAnnotationId}`, { method: "PATCH", body: JSON.stringify(payload) }, token)
                    : apiRequest("/api/mapping/annotations", { method: "POST", body: JSON.stringify(payload) }, token),
                selectedAnnotationId ? "Annotation updated." : "Annotation created."
              );
            }}
          >
            <Field label="Title">
              <TextInput
                value={annotationForm.title}
                onChange={(event) => setAnnotationForm({ ...annotationForm, title: event.target.value })}
                required
                disabled={!selectedFloorId || !hasWriteAccess}
              />
            </Field>
            <Field label="Annotation type">
              <SelectInput
                value={annotationForm.annotationType}
                onChange={(event) => setAnnotationForm({ ...annotationForm, annotationType: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              >
                {annotationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Severity">
              <SelectInput
                value={annotationForm.severity}
                onChange={(event) => setAnnotationForm({ ...annotationForm, severity: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              >
                {severityOptions.map((option) => (
                  <option key={option.value || "blank"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Zone">
              <SelectInput
                value={annotationForm.zoneId}
                onChange={(event) => setAnnotationForm({ ...annotationForm, zoneId: event.target.value, roomId: "" })}
                disabled={!selectedFloorId || !hasWriteAccess}
              >
                <option value="">No zone</option>
                {filteredZones.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Room">
              <SelectInput
                value={annotationForm.roomId}
                onChange={(event) => setAnnotationForm({ ...annotationForm, roomId: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              >
                <option value="">No room</option>
                {filteredRooms
                  .filter((record) => !annotationForm.zoneId || record.zoneId === annotationForm.zoneId)
                  .map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.roomNumber ? `${record.name} (${record.roomNumber})` : record.name}
                    </option>
                  ))}
              </SelectInput>
            </Field>
            <Field label="Plan version">
              <SelectInput
                value={annotationForm.floorPlanVersionId}
                onChange={(event) => setAnnotationForm({ ...annotationForm, floorPlanVersionId: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              >
                <option value="">Current floor context</option>
                {filteredPlanVersions.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.versionLabel ? `${record.name} (${record.versionLabel})` : record.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput
                value={annotationForm.status}
                onChange={(event) => setAnnotationForm({ ...annotationForm, status: event.target.value })}
                disabled={!selectedFloorId || !hasWriteAccess}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <Field label="Notes">
              <TextareaInput
                value={annotationForm.notes}
                onChange={(event) => setAnnotationForm({ ...annotationForm, notes: event.target.value })}
                rows={4}
                disabled={!selectedFloorId || !hasWriteAccess}
              />
            </Field>

            <GeometryCanvasEditor
              width={floorCanvasWidth}
              height={floorCanvasHeight}
              backgroundImageUrl={floorCanvasImageUrl}
              value={annotationGeometryDraft}
              layers={geometryLayers}
              onChange={setAnnotationGeometryDraft}
              title="Annotation geometry editor"
              hint="Use a point for a precise issue or a polygon for a larger affected area."
            />

            <SectionCard title="Annotation draft" description="The annotation geometry is stored as structured telemetry-ready map data.">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.82rem", color: "#334155" }}>
                {stringifyGeometry(annotationGeometryDraft) || "No annotation geometry drafted yet."}
              </pre>
            </SectionCard>

            <div className="fi-form-actions">
              <Button type="submit" disabled={!hasWriteAccess || !selectedFloorId}>
                {selectedAnnotationId ? "Save annotation" : "Create annotation"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedAnnotationId("");
                  setAnnotationForm(blankAnnotationForm);
                  setAnnotationGeometryDraft(createGeometry(defaultGeometryKind("annotation")));
                }}
              >
                New annotation
              </Button>
              {selectedAnnotationId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={!hasWriteAccess}
                  onClick={() => {
                    if (window.confirm("Archive this annotation?")) {
                      void runMutation(
                        () => apiRequest(`/api/mapping/annotations/${selectedAnnotationId}/archive`, { method: "POST" }, token),
                        "Annotation archived."
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

      <SectionCard
        title="Geometry Workspace"
        description="Maintain reusable zone and room boundaries, plus direct annotation shapes, on top of the current floor plan."
      >
        {selectedFloor ? (
          <div className="fi-two-column">
            <div className="fi-page-stack">
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Button type="button" variant={geometryTarget === "zone" ? "primary" : "secondary"} onClick={() => setGeometryTarget("zone")}>
                  Zones
                </Button>
                <Button type="button" variant={geometryTarget === "room" ? "primary" : "secondary"} onClick={() => setGeometryTarget("room")}>
                  Rooms
                </Button>
                <Button type="button" variant={geometryTarget === "annotation" ? "primary" : "secondary"} onClick={() => setGeometryTarget("annotation")}>
                  Annotations
                </Button>
              </div>

              <DataTable
                rows={geometryRows}
                onRowClick={(record: ZoneRecord | RoomRecord | AnnotationRecord) => setSelectedGeometryId(record.id)}
                empty={
                  <EmptyState
                    title={`No ${targetLabel(geometryTarget).toLowerCase()} geometry`}
                    description={selectedFloor ? `Add the first ${targetLabel(geometryTarget).toLowerCase()} shape for this floor.` : "Select a floor first."}
                  />
                }
                columns={[
                  {
                    key: "name",
                    header: targetLabel(geometryTarget),
                    render: (record: ZoneRecord | RoomRecord | AnnotationRecord) => ("title" in record ? record.title : record.name)
                  },
                  {
                    key: "geometry",
                    header: "Geometry",
                    render: (record: ZoneRecord | RoomRecord | AnnotationRecord) => geometryLabel(parseGeometry(record.geometry))
                  }
                ]}
              />

              <DefinitionList
                items={[
                  { label: "Target", value: targetLabel(geometryTarget) },
                  {
                    label: "Selected record",
                    value: selectedGeometryRecord ? ("title" in selectedGeometryRecord ? selectedGeometryRecord.title : selectedGeometryRecord.name) : "Not selected"
                  },
                  { label: "Geometry", value: geometryLabel(parseGeometry(selectedGeometryRecord?.geometry)) }
                ]}
              />
            </div>

            <div className="fi-page-stack">
              <GeometryCanvasEditor
                width={floorCanvasWidth}
                height={floorCanvasHeight}
                backgroundImageUrl={floorCanvasImageUrl}
                value={geometryDraft}
                layers={geometryLayers}
                onChange={setGeometryDraft}
                title={`${targetLabel(geometryTarget)} geometry editor`}
                hint="Click the canvas to add points, then save the shape back to the selected record."
              />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Button
                  type="button"
                  disabled={!hasWriteAccess || !selectedGeometryRecord}
                  onClick={() => {
                    if (!selectedGeometryRecord) {
                      return;
                    }

                    const endpoint =
                      geometryTarget === "zone"
                        ? `/api/mapping/zones/${selectedGeometryRecord.id}/geometry`
                        : geometryTarget === "room"
                          ? `/api/mapping/rooms/${selectedGeometryRecord.id}/geometry`
                          : `/api/mapping/annotations/${selectedGeometryRecord.id}`;

                    void runMutation(
                      () =>
                        apiRequest(
                          endpoint,
                          {
                            method: "PATCH",
                            body: JSON.stringify({ geometry: geometryDraft })
                          },
                          token
                        ),
                      `${targetLabel(geometryTarget)} geometry updated.`
                    );
                  }}
                >
                  Save geometry
                </Button>
                <Button type="button" variant="secondary" onClick={() => setGeometryDraft(createGeometry(defaultGeometryKind(geometryTarget)))}>
                  Clear draft
                </Button>
              </div>
              <SectionCard title="Draft geometry" description="The current editor payload is kept in a simple structured format.">
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.82rem", color: "#334155" }}>
                  {stringifyGeometry(geometryDraft) || "No geometry drafted yet."}
                </pre>
              </SectionCard>
            </div>
          </div>
        ) : (
          <EmptyState title="Select a floor to edit geometry" description="The geometry workspace is available once a floor is selected." />
        )}
      </SectionCard>
    </div>
  );
}
