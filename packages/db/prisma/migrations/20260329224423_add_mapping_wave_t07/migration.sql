-- CreateTable
CREATE TABLE "FloorPlanVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "floorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "versionLabel" TEXT,
    "assetUrl" TEXT,
    "canvasWidth" INTEGER,
    "canvasHeight" INTEGER,
    "source" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" DATETIME,
    "archivedBy" TEXT,
    CONSTRAINT "FloorPlanVersion_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapAnnotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "floorId" TEXT NOT NULL,
    "floorPlanVersionId" TEXT,
    "zoneId" TEXT,
    "roomId" TEXT,
    "title" TEXT NOT NULL,
    "annotationType" TEXT NOT NULL,
    "severity" TEXT,
    "geometryJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" DATETIME,
    "archivedBy" TEXT,
    CONSTRAINT "MapAnnotation_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MapAnnotation_floorPlanVersionId_fkey" FOREIGN KEY ("floorPlanVersionId") REFERENCES "FloorPlanVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MapAnnotation_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MapAnnotation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FloorPlanVersion_floorId_isCurrent_idx" ON "FloorPlanVersion"("floorId", "isCurrent");

-- CreateIndex
CREATE INDEX "MapAnnotation_floorId_annotationType_idx" ON "MapAnnotation"("floorId", "annotationType");
