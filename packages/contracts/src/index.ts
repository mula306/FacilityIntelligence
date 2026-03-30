import {
  coverageAssessmentScopeValues,
  connectivitySourceValues,
  coverageBandValues,
  entityStatusValues,
  riskLevelValues,
  wifiBandValues
} from "@facility/domain";
import { z } from "zod";

export const identifierSchema = z.string().uuid();
export const entityStatusSchema = z.enum(entityStatusValues);
export const riskLevelSchema = z.enum(riskLevelValues);
export const wifiBandSchema = z.enum(wifiBandValues);
export const coverageBandSchema = z.enum(coverageBandValues);
export const coverageAssessmentScopeSchema = z.enum(coverageAssessmentScopeValues);
export const connectivitySourceSchema = z.enum(connectivitySourceValues);
export const floorPlanSourceSchema = z.enum(["url", "upload", "manual-canvas", "import"]);
export const mapAnnotationTypeSchema = z.enum(["note", "warning", "workflow", "entrance", "restricted-area", "coverage-gap"]);
export const wifiScanSourceSchema = z.enum(["manual", "csv-import", "android-companion"]);
export const riskItemSourceSchema = z.enum(["manual", "coverage-assessment", "connectivity-measurement", "device-inventory", "readiness-rule"]);
export const dayOfWeekSchema = z.number().int().min(0).max(6);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
  sortBy: z.string().trim().max(100).optional(),
  sortDirection: z.enum(["asc", "desc"]).default("asc")
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export const archiveCommandSchema = z.object({
  reason: z.string().trim().max(500).optional()
});

export const auditRecordSchema = z.object({
  id: identifierSchema,
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().uuid().nullable(),
  summary: z.string().min(1),
  createdAt: z.string().datetime(),
  actorUserId: z.string().uuid().nullable()
});

export const roleSchema = z.object({
  id: identifierSchema,
  name: z.string().min(1),
  code: z.string().nullable(),
  description: z.string().nullable(),
  status: entityStatusSchema,
  permissions: z.array(z.string().min(1))
});

export const authUserSchema = z.object({
  id: identifierSchema,
  email: z.string().email(),
  displayName: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  status: entityStatusSchema,
  roleIds: z.array(identifierSchema),
  roles: z.array(roleSchema),
  lastLoginAt: z.string().datetime().nullable()
});

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  user: authUserSchema
});

const namedEntityInput = {
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: entityStatusSchema.default("active")
};

export const facilityInputSchema = z.object({
  ...namedEntityInput,
  shortName: z.string().trim().max(60).nullable().optional(),
  facilityType: z.string().trim().max(80).nullable().optional(),
  campusName: z.string().trim().max(120).nullable().optional(),
  addressLine1: z.string().trim().max(120).nullable().optional(),
  addressLine2: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  region: z.string().trim().max(80).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  countryCode: z.string().trim().max(10).nullable().optional(),
  timezone: z.string().trim().max(60).nullable().optional()
});

export const buildingInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingType: z.string().trim().max(80).nullable().optional()
});

export const floorInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingId: identifierSchema,
  floorNumber: z.number().int().min(-10).max(200),
  planImageUrl: z.string().url().nullable().optional(),
  canvasWidth: z.number().int().positive().nullable().optional(),
  canvasHeight: z.number().int().positive().nullable().optional()
});

export const pointCoordinateSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const spatialGeometrySchema = z.object({
  type: z.enum(["point", "polygon", "polyline", "bounds"]),
  points: z.array(pointCoordinateSchema).min(1)
});

export const zoneInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingId: identifierSchema,
  floorId: identifierSchema,
  zoneType: z.string().trim().max(80).nullable().optional(),
  geometry: spatialGeometrySchema.nullable().optional()
});

export const roomInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingId: identifierSchema,
  floorId: identifierSchema,
  zoneId: identifierSchema.nullable().optional(),
  roomNumber: z.string().trim().max(40).nullable().optional(),
  roomType: z.string().trim().max(80).nullable().optional(),
  clinicalCriticality: riskLevelSchema.nullable().optional(),
  geometry: spatialGeometrySchema.nullable().optional()
});

export const serviceAreaInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingId: identifierSchema.nullable().optional(),
  floorId: identifierSchema.nullable().optional()
});

export const hoursOfOperationInputSchema = z.object({
  facilityId: identifierSchema,
  serviceAreaId: identifierSchema.nullable().optional(),
  dayOfWeek: dayOfWeekSchema,
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  overnight: z.boolean().default(false),
  effectiveFrom: z.string().datetime().nullable().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
  status: entityStatusSchema.default("active")
});

export const contactInputSchema = z.object({
  ...namedEntityInput,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  title: z.string().trim().max(120).nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  phone: z.string().trim().max(40).nullable().optional(),
  mobilePhone: z.string().trim().max(40).nullable().optional(),
  organization: z.string().trim().max(120).nullable().optional()
});

export const contactRoleInputSchema = z.object({
  ...namedEntityInput,
  description: z.string().trim().max(300).nullable().optional()
});

export const facilityContactAssignmentInputSchema = z.object({
  facilityId: identifierSchema,
  buildingId: identifierSchema.nullable().optional(),
  floorId: identifierSchema.nullable().optional(),
  zoneId: identifierSchema.nullable().optional(),
  roomId: identifierSchema.nullable().optional(),
  contactId: identifierSchema,
  contactRoleId: identifierSchema,
  escalationPriority: z.number().int().min(1).max(99).nullable().optional(),
  isPrimary: z.boolean().default(false),
  status: entityStatusSchema.default("active")
});

export const deviceTypeInputSchema = z.object({
  ...namedEntityInput,
  manufacturer: z.string().trim().max(120).nullable().optional()
});

export const deviceInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingId: identifierSchema.nullable().optional(),
  floorId: identifierSchema.nullable().optional(),
  zoneId: identifierSchema.nullable().optional(),
  roomId: identifierSchema.nullable().optional(),
  deviceTypeId: identifierSchema,
  hostname: z.string().trim().max(120).nullable().optional(),
  serialNumber: z.string().trim().max(120).nullable().optional(),
  assetTag: z.string().trim().max(120).nullable().optional(),
  ipAddress: z.string().trim().max(80).nullable().optional(),
  macAddress: z.string().trim().max(80).nullable().optional(),
  lifecycleState: z.string().trim().max(80).nullable().optional(),
  ownerContactId: identifierSchema.nullable().optional()
});

export const networkCircuitInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  providerName: z.string().trim().max(120).nullable().optional(),
  circuitIdentifier: z.string().trim().max(120).nullable().optional(),
  bandwidthDownMbps: z.number().nonnegative().nullable().optional(),
  bandwidthUpMbps: z.number().nonnegative().nullable().optional(),
  serviceLevel: z.string().trim().max(120).nullable().optional()
});

export const networkProfileInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  networkType: z.string().trim().max(80).nullable().optional(),
  vlanName: z.string().trim().max(80).nullable().optional(),
  subnetCidr: z.string().trim().max(80).nullable().optional()
});

export const accessPointInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingId: identifierSchema.nullable().optional(),
  floorId: identifierSchema.nullable().optional(),
  zoneId: identifierSchema.nullable().optional(),
  roomId: identifierSchema.nullable().optional(),
  networkProfileId: identifierSchema.nullable().optional(),
  model: z.string().trim().max(120).nullable().optional(),
  macAddress: z.string().trim().max(80).nullable().optional(),
  geometry: spatialGeometrySchema.nullable().optional()
});

export const connectivityMeasurementInputSchema = z.object({
  facilityId: identifierSchema,
  networkCircuitId: identifierSchema.nullable().optional(),
  accessPointId: identifierSchema.nullable().optional(),
  source: connectivitySourceSchema.default("manual"),
  measuredAt: z.string().datetime(),
  downloadMbps: z.number().nonnegative().nullable().optional(),
  uploadMbps: z.number().nonnegative().nullable().optional(),
  latencyMs: z.number().nonnegative().nullable().optional(),
  packetLossPct: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: entityStatusSchema.default("active")
});

export const floorCanvasInputSchema = z.object({
  planImageUrl: z.string().url().nullable().optional(),
  canvasWidth: z.number().int().positive().nullable().optional(),
  canvasHeight: z.number().int().positive().nullable().optional()
});

export const floorPlanVersionInputSchema = z.object({
  floorId: identifierSchema,
  name: z.string().trim().min(1).max(120),
  versionLabel: z.string().trim().max(80).nullable().optional(),
  assetUrl: z.string().url().nullable().optional(),
  canvasWidth: z.number().int().positive().nullable().optional(),
  canvasHeight: z.number().int().positive().nullable().optional(),
  source: floorPlanSourceSchema.default("manual-canvas"),
  isCurrent: z.boolean().default(true),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: entityStatusSchema.default("active")
});

export const mapAnnotationInputSchema = z.object({
  floorId: identifierSchema,
  floorPlanVersionId: identifierSchema.nullable().optional(),
  zoneId: identifierSchema.nullable().optional(),
  roomId: identifierSchema.nullable().optional(),
  title: z.string().trim().min(1).max(120),
  annotationType: mapAnnotationTypeSchema.default("note"),
  severity: riskLevelSchema.nullable().optional(),
  geometry: spatialGeometrySchema,
  notes: z.string().trim().max(1000).nullable().optional(),
  status: entityStatusSchema.default("active")
});

export const spatialGeometryUpdateInputSchema = z.object({
  geometry: spatialGeometrySchema.nullable()
});

export const locationHierarchySummarySchema = z.object({
  facilities: z.number().int().nonnegative(),
  buildings: z.number().int().nonnegative(),
  floors: z.number().int().nonnegative(),
  zones: z.number().int().nonnegative(),
  rooms: z.number().int().nonnegative()
});

export const wifiScanSessionInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingId: identifierSchema,
  floorId: identifierSchema,
  zoneId: identifierSchema.nullable().optional(),
  roomId: identifierSchema.nullable().optional(),
  collectorUserId: identifierSchema.nullable().optional(),
  collectorDeviceLabel: z.string().trim().max(120).nullable().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable().optional(),
  source: wifiScanSourceSchema
});

export const wifiScanSampleInputSchema = z.object({
  wifiScanSessionId: identifierSchema,
  facilityId: identifierSchema,
  buildingId: identifierSchema,
  floorId: identifierSchema,
  zoneId: identifierSchema.nullable().optional(),
  roomId: identifierSchema.nullable().optional(),
  accessPointId: identifierSchema.nullable().optional(),
  ssid: z.string().trim().min(1).max(100),
  bssid: z.string().trim().min(1).max(64),
  rssi: z.number().int().min(-120).max(0),
  frequencyMHz: z.number().int().positive().nullable().optional(),
  channel: z.number().int().positive().nullable().optional(),
  band: wifiBandSchema,
  sampledAt: z.string().datetime(),
  coordinate: pointCoordinateSchema.nullable().optional(),
  status: entityStatusSchema.default("active")
});

export const wifiScanSampleImportRowSchema = z.object({
  zoneId: identifierSchema.nullable().optional(),
  roomId: identifierSchema.nullable().optional(),
  accessPointId: identifierSchema.nullable().optional(),
  ssid: z.string().trim().min(1).max(100),
  bssid: z.string().trim().min(1).max(64),
  rssi: z.number().int().min(-120).max(0),
  frequencyMHz: z.number().int().positive().nullable().optional(),
  channel: z.number().int().positive().nullable().optional(),
  band: wifiBandSchema,
  sampledAt: z.string().datetime(),
  coordinate: pointCoordinateSchema.nullable().optional(),
  status: entityStatusSchema.default("active")
});

export const wifiScanSampleImportInputSchema = z.object({
  wifiScanSessionId: identifierSchema,
  rows: z.array(wifiScanSampleImportRowSchema).min(1)
});

export const coverageAggregationCommandSchema = z.object({
  facilityId: identifierSchema,
  buildingId: identifierSchema.nullable().optional(),
  floorId: identifierSchema.nullable().optional(),
  wifiScanSessionId: identifierSchema.nullable().optional(),
  createDeadZoneAnnotations: z.boolean().default(false)
});

export const deadZoneAnnotationCommandSchema = z.object({
  floorId: identifierSchema,
  wifiScanSessionId: identifierSchema.nullable().optional(),
  floorPlanVersionId: identifierSchema.nullable().optional(),
  minimumBand: z.enum(["poor", "dead-zone"]).default("poor"),
  replaceExisting: z.boolean().default(true)
});

export const incidentInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingId: identifierSchema.nullable().optional(),
  floorId: identifierSchema.nullable().optional(),
  zoneId: identifierSchema.nullable().optional(),
  roomId: identifierSchema.nullable().optional(),
  incidentType: z.string().trim().max(80).nullable().optional(),
  severity: riskLevelSchema,
  reportedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable().optional(),
  resolutionSummary: z.string().trim().max(1000).nullable().optional()
});

export const riskItemInputSchema = z.object({
  ...namedEntityInput,
  facilityId: identifierSchema,
  buildingId: identifierSchema.nullable().optional(),
  floorId: identifierSchema.nullable().optional(),
  zoneId: identifierSchema.nullable().optional(),
  roomId: identifierSchema.nullable().optional(),
  category: z.string().trim().min(1).max(80),
  severity: riskLevelSchema,
  score: z.number().min(0).max(100).nullable().optional(),
  scoreReason: z.string().trim().max(1000).nullable().optional(),
  sourceType: riskItemSourceSchema.default("manual"),
  sourceReferenceId: identifierSchema.nullable().optional(),
  isSystemGenerated: z.boolean().default(false)
});

export const readinessRecalculationCommandSchema = z.object({
  facilityId: identifierSchema,
  buildingId: identifierSchema.nullable().optional(),
  floorId: identifierSchema.nullable().optional(),
  archiveExistingSystemRiskItems: z.boolean().default(true)
});

export type LoginInput = z.infer<typeof loginInputSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type FacilityInput = z.infer<typeof facilityInputSchema>;
export type BuildingInput = z.infer<typeof buildingInputSchema>;
export type FloorInput = z.infer<typeof floorInputSchema>;
export type ZoneInput = z.infer<typeof zoneInputSchema>;
export type RoomInput = z.infer<typeof roomInputSchema>;
export type ServiceAreaInput = z.infer<typeof serviceAreaInputSchema>;
export type HoursOfOperationInput = z.infer<typeof hoursOfOperationInputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type ContactRoleInput = z.infer<typeof contactRoleInputSchema>;
export type FacilityContactAssignmentInput = z.infer<typeof facilityContactAssignmentInputSchema>;
export type DeviceTypeInput = z.infer<typeof deviceTypeInputSchema>;
export type DeviceInput = z.infer<typeof deviceInputSchema>;
export type NetworkCircuitInput = z.infer<typeof networkCircuitInputSchema>;
export type NetworkProfileInput = z.infer<typeof networkProfileInputSchema>;
export type AccessPointInput = z.infer<typeof accessPointInputSchema>;
export type ConnectivityMeasurementInput = z.infer<typeof connectivityMeasurementInputSchema>;
export type FloorCanvasInput = z.infer<typeof floorCanvasInputSchema>;
export type FloorPlanVersionInput = z.infer<typeof floorPlanVersionInputSchema>;
export type MapAnnotationInput = z.infer<typeof mapAnnotationInputSchema>;
export type SpatialGeometryUpdateInput = z.infer<typeof spatialGeometryUpdateInputSchema>;
export type WifiScanSessionInput = z.infer<typeof wifiScanSessionInputSchema>;
export type WifiScanSampleInput = z.infer<typeof wifiScanSampleInputSchema>;
export type WifiScanSampleImportRowInput = z.infer<typeof wifiScanSampleImportRowSchema>;
export type WifiScanSampleImportInput = z.infer<typeof wifiScanSampleImportInputSchema>;
export type CoverageAggregationCommandInput = z.infer<typeof coverageAggregationCommandSchema>;
export type DeadZoneAnnotationCommandInput = z.infer<typeof deadZoneAnnotationCommandSchema>;
export type IncidentInput = z.infer<typeof incidentInputSchema>;
export type RiskItemInput = z.infer<typeof riskItemInputSchema>;
export type ReadinessRecalculationCommandInput = z.infer<typeof readinessRecalculationCommandSchema>;
