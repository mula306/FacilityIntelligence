-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "incidentType" TEXT;
ALTER TABLE "Incident" ADD COLUMN "resolutionSummary" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReadinessScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "buildingId" TEXT,
    "floorId" TEXT,
    "calculatedAt" DATETIME NOT NULL,
    "overallScore" DECIMAL NOT NULL,
    "infrastructureScore" DECIMAL,
    "coverageScore" DECIMAL,
    "supportScore" DECIMAL,
    "calculationVersion" TEXT DEFAULT 't10-v1',
    "scoreDetailsJson" TEXT,
    "coverageAssessmentCount" INTEGER NOT NULL DEFAULT 0,
    "activeIncidentCount" INTEGER NOT NULL DEFAULT 0,
    "activeRiskItemCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" DATETIME,
    "archivedBy" TEXT,
    CONSTRAINT "ReadinessScore_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ReadinessScore" ("archivedAt", "archivedBy", "buildingId", "calculatedAt", "coverageScore", "createdAt", "createdBy", "facilityId", "floorId", "id", "infrastructureScore", "overallScore", "status", "supportScore", "updatedAt", "updatedBy") SELECT "archivedAt", "archivedBy", "buildingId", "calculatedAt", "coverageScore", "createdAt", "createdBy", "facilityId", "floorId", "id", "infrastructureScore", "overallScore", "status", "supportScore", "updatedAt", "updatedBy" FROM "ReadinessScore";
DROP TABLE "ReadinessScore";
ALTER TABLE "new_ReadinessScore" RENAME TO "ReadinessScore";
CREATE INDEX "ReadinessScore_facilityId_calculatedAt_idx" ON "ReadinessScore"("facilityId", "calculatedAt");
CREATE INDEX "ReadinessScore_floorId_calculatedAt_idx" ON "ReadinessScore"("floorId", "calculatedAt");
CREATE TABLE "new_RiskItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "buildingId" TEXT,
    "floorId" TEXT,
    "zoneId" TEXT,
    "roomId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "score" DECIMAL,
    "scoreReason" TEXT,
    "sourceType" TEXT,
    "sourceReferenceId" TEXT,
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" DATETIME,
    "archivedBy" TEXT,
    CONSTRAINT "RiskItem_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RiskItem" ("archivedAt", "archivedBy", "buildingId", "category", "code", "createdAt", "createdBy", "facilityId", "floorId", "id", "name", "notes", "roomId", "score", "severity", "status", "updatedAt", "updatedBy", "zoneId") SELECT "archivedAt", "archivedBy", "buildingId", "category", "code", "createdAt", "createdBy", "facilityId", "floorId", "id", "name", "notes", "roomId", "score", "severity", "status", "updatedAt", "updatedBy", "zoneId" FROM "RiskItem";
DROP TABLE "RiskItem";
ALTER TABLE "new_RiskItem" RENAME TO "RiskItem";
CREATE INDEX "RiskItem_facilityId_status_severity_idx" ON "RiskItem"("facilityId", "status", "severity");
CREATE INDEX "RiskItem_floorId_status_severity_idx" ON "RiskItem"("floorId", "status", "severity");
CREATE INDEX "RiskItem_sourceType_sourceReferenceId_idx" ON "RiskItem"("sourceType", "sourceReferenceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Incident_facilityId_status_reportedAt_idx" ON "Incident"("facilityId", "status", "reportedAt");

-- CreateIndex
CREATE INDEX "Incident_floorId_status_reportedAt_idx" ON "Incident"("floorId", "status", "reportedAt");
