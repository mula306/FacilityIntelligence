export interface Summary {
  facilities: number;
  buildings: number;
  floors: number;
  zones: number;
  rooms: number;
  incidents: number;
  riskItems: number;
  activeIncidents: number;
  activeRiskItems: number;
  criticalRiskItems: number;
  manualRiskItems: number;
  systemRiskItems: number;
  readinessScores: number;
  recalculations: number;
  latestOverallScore: number | null;
}

export interface FacilityRecord {
  id: string;
  name: string;
  code: string | null;
}

export interface BuildingRecord {
  id: string;
  facilityId: string;
  name: string;
  code: string | null;
}

export interface FloorRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  name: string;
  code: string | null;
  floorNumber: number;
  planImageUrl?: string | null;
  canvasWidth?: number | null;
  canvasHeight?: number | null;
}

export interface ZoneRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  name: string;
  code: string | null;
}

export interface RoomRecord {
  id: string;
  facilityId: string;
  buildingId: string;
  floorId: string;
  zoneId: string | null;
  name: string;
  code: string | null;
  roomNumber: string | null;
  clinicalCriticality?: string | null;
}

export interface IncidentRecord {
  id: string;
  facilityId: string;
  facilityName: string | null;
  buildingId: string | null;
  buildingName: string | null;
  floorId: string | null;
  floorName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  roomId: string | null;
  roomName: string | null;
  roomNumber: string | null;
  name: string;
  code: string | null;
  status: string;
  severity: string;
  incidentType: string | null;
  reportedAt: string | null;
  resolvedAt: string | null;
  resolutionSummary: string | null;
  notes: string | null;
  archivedAt: string | null;
  updatedAt: string | null;
}

export interface RiskItemRecord {
  id: string;
  facilityId: string;
  facilityName: string | null;
  buildingId: string | null;
  buildingName: string | null;
  floorId: string | null;
  floorName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  roomId: string | null;
  roomName: string | null;
  roomNumber: string | null;
  name: string;
  code: string | null;
  category: string;
  severity: string;
  score: number | null;
  scoreReason: string | null;
  sourceType: string;
  sourceReferenceId: string | null;
  isSystemGenerated: boolean;
  status: string;
  notes: string | null;
  archivedAt: string | null;
  updatedAt: string | null;
}

export interface ReadinessScoreRecord {
  id: string;
  facilityId: string;
  facilityName: string | null;
  buildingId: string | null;
  buildingName: string | null;
  floorId: string | null;
  floorName: string | null;
  score: number | null;
  overallScore: number | null;
  calculationVersion: string | null;
  scoreDetails: unknown | null;
  coverageAssessmentCount: number;
  activeIncidentCount: number;
  activeRiskItemCount: number;
  recalculatedAt: string | null;
  calculatedAt: string | null;
  status: string;
}

export interface LocationBootstrap {
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
    zones: ZoneRecord[];
    rooms: RoomRecord[];
  };
}

export interface BootstrapPayload {
  summary: Summary;
  selection: {
    facilityId: string | null;
    buildingId: string | null;
    floorId: string | null;
  };
  currentFloorContext?: {
    planImageUrl: string | null;
    canvasWidth: number | null;
    canvasHeight: number | null;
  } | null;
  latestReadinessScore?: ReadinessScoreRecord | null;
  lists: {
    incidents: IncidentRecord[];
    riskItems: RiskItemRecord[];
    readinessScores: ReadinessScoreRecord[];
  };
}

export interface IncidentFormState {
  name: string;
  code: string;
  buildingId: string;
  floorId: string;
  zoneId: string;
  roomId: string;
  incidentType: string;
  severity: string;
  reportedAt: string;
  resolvedAt: string;
  resolutionSummary: string;
  notes: string;
  status: string;
}

export interface RiskItemFormState {
  name: string;
  code: string;
  buildingId: string;
  floorId: string;
  zoneId: string;
  roomId: string;
  category: string;
  severity: string;
  score: string;
  scoreReason: string;
  sourceType: string;
  sourceReferenceId: string;
  isSystemGenerated: boolean;
  notes: string;
  status: string;
}

export const blankIncidentForm: IncidentFormState = {
  name: "",
  code: "",
  buildingId: "",
  floorId: "",
  zoneId: "",
  roomId: "",
  incidentType: "",
  severity: "moderate",
  reportedAt: "",
  resolvedAt: "",
  resolutionSummary: "",
  notes: "",
  status: "active"
};

export const blankRiskItemForm: RiskItemFormState = {
  name: "",
  code: "",
  buildingId: "",
  floorId: "",
  zoneId: "",
  roomId: "",
  category: "",
  severity: "moderate",
  score: "",
  scoreReason: "",
  sourceType: "manual",
  sourceReferenceId: "",
  isSystemGenerated: false,
  notes: "",
  status: "active"
};

export function nullableString(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export function nullableNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const valueNumber = Number(trimmed);
  if (Number.isNaN(valueNumber)) {
    throw new Error("Expected a numeric value.");
  }

  return valueNumber;
}

export function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Expected a valid date and time.");
  }

  return parsed.toISOString();
}

export function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

export function toneForStatus(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
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

export function toneForSeverity(severity: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (severity === "critical") {
    return "danger";
  }
  if (severity === "high") {
    return "warning";
  }
  if (severity === "moderate") {
    return "info";
  }
  if (severity === "low") {
    return "success";
  }
  return "neutral";
}

export function scoreTone(score: number | null): "success" | "warning" | "danger" | "info" | "neutral" {
  if (score === null) {
    return "neutral";
  }
  if (score >= 85) {
    return "success";
  }
  if (score >= 70) {
    return "info";
  }
  if (score >= 50) {
    return "warning";
  }
  return "danger";
}

export function scoreLabel(score: number | null) {
  return score === null ? "Not calculated" : `${Math.round(score)} / 100`;
}

export function facilityLabel(record: { name: string; code: string | null }) {
  return record.code ? `${record.name} (${record.code})` : record.name;
}

export function detailLocationLabel(record: {
  facilityName: string | null;
  buildingName: string | null;
  floorName: string | null;
  zoneName: string | null;
  roomName: string | null;
  roomNumber: string | null;
}) {
  const room = record.roomName ? (record.roomNumber ? `${record.roomName} (${record.roomNumber})` : record.roomName) : null;
  return room ?? record.zoneName ?? record.floorName ?? record.buildingName ?? record.facilityName ?? "Facility";
}

export function toIncidentForm(record: IncidentRecord): IncidentFormState {
  return {
    name: record.name,
    code: record.code ?? "",
    buildingId: record.buildingId ?? "",
    floorId: record.floorId ?? "",
    zoneId: record.zoneId ?? "",
    roomId: record.roomId ?? "",
    incidentType: record.incidentType ?? "",
    severity: record.severity,
    reportedAt: toDateTimeLocal(record.reportedAt),
    resolvedAt: toDateTimeLocal(record.resolvedAt),
    resolutionSummary: record.resolutionSummary ?? "",
    notes: record.notes ?? "",
    status: record.status
  };
}

export function toRiskItemForm(record: RiskItemRecord): RiskItemFormState {
  return {
    name: record.name,
    code: record.code ?? "",
    buildingId: record.buildingId ?? "",
    floorId: record.floorId ?? "",
    zoneId: record.zoneId ?? "",
    roomId: record.roomId ?? "",
    category: record.category,
    severity: record.severity,
    score: record.score === null ? "" : String(record.score),
    scoreReason: record.scoreReason ?? "",
    sourceType: record.sourceType,
    sourceReferenceId: record.sourceReferenceId ?? "",
    isSystemGenerated: record.isSystemGenerated,
    notes: record.notes ?? "",
    status: record.status
  };
}

export function formatScoreDetails(value: unknown) {
  if (!value) {
    return "No score details are available for this readiness record.";
  }

  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
