-- CreateIndex
CREATE INDEX "WifiScanSample_wifiScanSessionId_sampledAt_idx" ON "WifiScanSample"("wifiScanSessionId", "sampledAt");

-- CreateIndex
CREATE INDEX "WifiScanSample_floorId_sampledAt_idx" ON "WifiScanSample"("floorId", "sampledAt");

-- CreateIndex
CREATE INDEX "WifiScanSession_facilityId_status_idx" ON "WifiScanSession"("facilityId", "status");

-- CreateIndex
CREATE INDEX "WifiScanSession_floorId_startedAt_idx" ON "WifiScanSession"("floorId", "startedAt");
