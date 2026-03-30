/*
  Warnings:

  - Added the required column `scope` to the `CoverageAssessment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CoverageAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "buildingId" TEXT,
    "floorId" TEXT,
    "zoneId" TEXT,
    "roomId" TEXT,
    "wifiScanSessionId" TEXT,
    "band" TEXT NOT NULL,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "averageRssi" DECIMAL,
    "strongestRssi" INTEGER,
    "weakestRssi" INTEGER,
    "coverageScore" DECIMAL,
    "confidenceScore" DECIMAL,
    "deadZoneSampleCount" INTEGER NOT NULL DEFAULT 0,
    "poorSampleCount" INTEGER NOT NULL DEFAULT 0,
    "scoreReason" TEXT,
    "aggregatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" DATETIME,
    "archivedBy" TEXT,
    CONSTRAINT "CoverageAssessment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CoverageAssessment_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CoverageAssessment_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CoverageAssessment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CoverageAssessment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CoverageAssessment_wifiScanSessionId_fkey" FOREIGN KEY ("wifiScanSessionId") REFERENCES "WifiScanSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CoverageAssessment" ("archivedAt", "archivedBy", "band", "buildingId", "confidenceScore", "createdAt", "createdBy", "facilityId", "floorId", "id", "roomId", "scoreReason", "status", "updatedAt", "updatedBy", "wifiScanSessionId", "zoneId") SELECT "archivedAt", "archivedBy", "band", "buildingId", "confidenceScore", "createdAt", "createdBy", "facilityId", "floorId", "id", "roomId", "scoreReason", "status", "updatedAt", "updatedBy", "wifiScanSessionId", "zoneId" FROM "CoverageAssessment";
DROP TABLE "CoverageAssessment";
ALTER TABLE "new_CoverageAssessment" RENAME TO "CoverageAssessment";
CREATE INDEX "CoverageAssessment_facilityId_scope_aggregatedAt_idx" ON "CoverageAssessment"("facilityId", "scope", "aggregatedAt");
CREATE INDEX "CoverageAssessment_floorId_scope_aggregatedAt_idx" ON "CoverageAssessment"("floorId", "scope", "aggregatedAt");
CREATE INDEX "CoverageAssessment_zoneId_scope_aggregatedAt_idx" ON "CoverageAssessment"("zoneId", "scope", "aggregatedAt");
CREATE INDEX "CoverageAssessment_roomId_scope_aggregatedAt_idx" ON "CoverageAssessment"("roomId", "scope", "aggregatedAt");
CREATE INDEX "CoverageAssessment_wifiScanSessionId_aggregatedAt_idx" ON "CoverageAssessment"("wifiScanSessionId", "aggregatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
