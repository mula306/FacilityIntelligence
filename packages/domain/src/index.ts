export const entityStatusValues = ["active", "inactive", "archived"] as const;
export const riskLevelValues = ["low", "moderate", "high", "critical"] as const;
export const coverageBandValues = ["excellent", "good", "fair", "poor", "dead-zone"] as const;
export const coverageAssessmentScopeValues = ["facility", "floor", "zone", "room"] as const;
export const connectivitySourceValues = ["manual", "import", "scan", "controller", "system"] as const;
export const wifiBandValues = ["2.4ghz", "5ghz", "6ghz", "unknown"] as const;

export type EntityStatus = (typeof entityStatusValues)[number];
export type RiskLevel = (typeof riskLevelValues)[number];
export type CoverageBand = (typeof coverageBandValues)[number];
export type CoverageAssessmentScope = (typeof coverageAssessmentScopeValues)[number];
export type ConnectivitySource = (typeof connectivitySourceValues)[number];
export type WifiBand = (typeof wifiBandValues)[number];
export type Identifier = string;
export type IsoDateTime = string;

export interface AuditFields {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  createdBy: Identifier | null;
  updatedBy: Identifier | null;
  archivedAt: IsoDateTime | null;
  archivedBy: Identifier | null;
}

export interface BaseEntity extends AuditFields {
  id: Identifier;
  status: EntityStatus;
}

export interface NamedEntity extends BaseEntity {
  name: string;
  code: string | null;
  notes: string | null;
}

export interface PointCoordinate {
  x: number;
  y: number;
}

export interface SpatialGeometry {
  type: "point" | "polygon" | "polyline" | "bounds";
  points: PointCoordinate[];
}

export interface Facility extends NamedEntity {
  shortName: string | null;
  facilityType: string | null;
  campusName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
  timezone: string | null;
}

export interface Building extends NamedEntity {
  facilityId: Identifier;
  buildingType: string | null;
}

export interface Floor extends NamedEntity {
  facilityId: Identifier;
  buildingId: Identifier;
  floorNumber: number;
  planImageUrl: string | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
}

export interface Zone extends NamedEntity {
  facilityId: Identifier;
  buildingId: Identifier;
  floorId: Identifier;
  zoneType: string | null;
  geometry: SpatialGeometry | null;
}

export interface Room extends NamedEntity {
  facilityId: Identifier;
  buildingId: Identifier;
  floorId: Identifier;
  zoneId: Identifier | null;
  roomNumber: string | null;
  roomType: string | null;
  clinicalCriticality: RiskLevel | null;
  geometry: SpatialGeometry | null;
}

export interface Contact extends NamedEntity {
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  organization: string | null;
}

export interface ContactRole extends NamedEntity {
  description: string | null;
}

export interface FacilityContactAssignment extends BaseEntity {
  facilityId: Identifier;
  buildingId: Identifier | null;
  floorId: Identifier | null;
  zoneId: Identifier | null;
  roomId: Identifier | null;
  contactId: Identifier;
  contactRoleId: Identifier;
  escalationPriority: number | null;
  isPrimary: boolean;
}

export interface ServiceArea extends NamedEntity {
  facilityId: Identifier;
  buildingId: Identifier | null;
  floorId: Identifier | null;
}

export interface HoursOfOperation extends BaseEntity {
  facilityId: Identifier;
  serviceAreaId: Identifier | null;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  overnight: boolean;
  effectiveFrom: IsoDateTime | null;
  effectiveTo: IsoDateTime | null;
}

export interface DeviceType extends NamedEntity {
  manufacturer: string | null;
}

export interface Device extends NamedEntity {
  facilityId: Identifier;
  buildingId: Identifier | null;
  floorId: Identifier | null;
  zoneId: Identifier | null;
  roomId: Identifier | null;
  deviceTypeId: Identifier;
  hostname: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  lifecycleState: string | null;
  ownerContactId: Identifier | null;
}

export interface NetworkCircuit extends NamedEntity {
  facilityId: Identifier;
  providerName: string | null;
  circuitIdentifier: string | null;
  bandwidthDownMbps: string | null;
  bandwidthUpMbps: string | null;
  serviceLevel: string | null;
}

export interface NetworkProfile extends NamedEntity {
  facilityId: Identifier;
  networkType: string | null;
  vlanName: string | null;
  subnetCidr: string | null;
}

export interface AccessPoint extends NamedEntity {
  facilityId: Identifier;
  buildingId: Identifier | null;
  floorId: Identifier | null;
  zoneId: Identifier | null;
  roomId: Identifier | null;
  networkProfileId: Identifier | null;
  model: string | null;
  macAddress: string | null;
  geometry: SpatialGeometry | null;
}

export interface ConnectivityMeasurement extends BaseEntity {
  facilityId: Identifier;
  networkCircuitId: Identifier | null;
  accessPointId: Identifier | null;
  source: ConnectivitySource;
  measuredAt: IsoDateTime;
  downloadMbps: string | null;
  uploadMbps: string | null;
  latencyMs: string | null;
  packetLossPct: string | null;
  notes: string | null;
}

export interface WifiScanSession extends NamedEntity {
  facilityId: Identifier;
  buildingId: Identifier;
  floorId: Identifier;
  zoneId: Identifier | null;
  roomId: Identifier | null;
  collectorUserId: Identifier | null;
  collectorDeviceLabel: string | null;
  startedAt: IsoDateTime;
  endedAt: IsoDateTime | null;
  source: "manual" | "csv-import" | "android-companion";
}

export interface WifiScanSample extends BaseEntity {
  wifiScanSessionId: Identifier;
  facilityId: Identifier;
  buildingId: Identifier;
  floorId: Identifier;
  zoneId: Identifier | null;
  roomId: Identifier | null;
  accessPointId: Identifier | null;
  ssid: string;
  bssid: string;
  rssi: number;
  frequencyMHz: number | null;
  channel: number | null;
  band: WifiBand;
  sampledAt: IsoDateTime;
  coordinate: PointCoordinate | null;
}

export interface CoverageAssessment extends BaseEntity {
  scope: CoverageAssessmentScope;
  facilityId: Identifier;
  buildingId: Identifier | null;
  floorId: Identifier | null;
  zoneId: Identifier | null;
  roomId: Identifier | null;
  wifiScanSessionId: Identifier | null;
  band: CoverageBand;
  sampleCount: number;
  averageRssi: string | null;
  strongestRssi: number | null;
  weakestRssi: number | null;
  coverageScore: string | null;
  confidenceScore: string | null;
  deadZoneSampleCount: number;
  poorSampleCount: number;
  scoreReason: string | null;
  aggregatedAt: IsoDateTime;
}

export interface Incident extends NamedEntity {
  facilityId: Identifier;
  buildingId: Identifier | null;
  floorId: Identifier | null;
  zoneId: Identifier | null;
  roomId: Identifier | null;
  incidentType: string | null;
  severity: RiskLevel;
  reportedAt: IsoDateTime;
  resolvedAt: IsoDateTime | null;
  resolutionSummary: string | null;
}

export interface RiskItem extends NamedEntity {
  facilityId: Identifier;
  buildingId: Identifier | null;
  floorId: Identifier | null;
  zoneId: Identifier | null;
  roomId: Identifier | null;
  category: string;
  severity: RiskLevel;
  score: string | null;
  scoreReason: string | null;
  sourceType: string | null;
  sourceReferenceId: Identifier | null;
  isSystemGenerated: boolean;
}

export interface ReadinessScore extends BaseEntity {
  facilityId: Identifier;
  buildingId: Identifier | null;
  floorId: Identifier | null;
  calculatedAt: IsoDateTime;
  overallScore: string;
  infrastructureScore: string | null;
  coverageScore: string | null;
  supportScore: string | null;
  calculationVersion: string | null;
  scoreDetails: Record<string, unknown> | null;
  coverageAssessmentCount: number;
  activeIncidentCount: number;
  activeRiskItemCount: number;
}

export interface Role extends NamedEntity {
  description: string | null;
  permissions: string[];
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  roleIds: Identifier[];
  isEnabled: boolean;
  lastLoginAt: IsoDateTime | null;
}

export interface AuditLog extends BaseEntity {
  actorUserId: Identifier | null;
  action: string;
  entityType: string;
  entityId: Identifier | null;
  summary: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
}
