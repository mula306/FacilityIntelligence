import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryPage } from "./InventoryPage";
import { apiRequest } from "../../app/api";

vi.mock("../../app/api", () => ({
  apiRequest: vi.fn()
}));

describe("InventoryPage", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockResolvedValue({
      data: {
        summary: {
          deviceTypes: 1,
          devices: 1,
          facilities: 1,
          buildings: 1,
          floors: 1,
          zones: 1,
          rooms: 1
        },
        lists: {
          deviceTypes: [
            {
              id: "device-type-1",
              name: "Workstation",
              code: "WS",
              notes: "Primary nursing station desktop",
              manufacturer: "Acme",
              status: "active",
              createdAt: "2026-03-29T00:00:00.000Z",
              updatedAt: "2026-03-29T00:00:00.000Z",
              archivedAt: null,
              deviceCount: 1
            }
          ],
          devices: [
            {
              id: "device-1",
              name: "Nursing Station 1",
              code: "NS-1",
              facilityId: "facility-1",
              facilityName: "Main Hospital",
              buildingId: "building-1",
              buildingName: "Tower A",
              floorId: "floor-1",
              floorName: "Level 2",
              zoneId: "zone-1",
              zoneName: "North Wing",
              roomId: "room-1",
              roomName: "Room 204",
              deviceTypeId: "device-type-1",
              deviceTypeName: "Workstation",
              hostname: "NS-1",
              serialNumber: "SN-204",
              assetTag: "AT-204",
              ipAddress: "10.0.0.24",
              macAddress: "00:11:22:33:44:55",
              lifecycleState: "in-service",
              ownerContactId: null,
              notes: "Mounted at the nursing desk",
              status: "active",
              createdAt: "2026-03-29T00:00:00.000Z",
              updatedAt: "2026-03-29T00:00:00.000Z",
              archivedAt: null,
              archivedBy: null
            }
          ],
          facilities: [{ id: "facility-1", name: "Main Hospital" }],
          buildings: [{ id: "building-1", facilityId: "facility-1", name: "Tower A" }],
          floors: [{ id: "floor-1", facilityId: "facility-1", buildingId: "building-1", name: "Level 2" }],
          zones: [{ id: "zone-1", facilityId: "facility-1", buildingId: "building-1", floorId: "floor-1", name: "North Wing" }],
          rooms: [
            {
              id: "room-1",
              facilityId: "facility-1",
              buildingId: "building-1",
              floorId: "floor-1",
              zoneId: "zone-1",
              name: "Room 204"
            }
          ]
        }
      }
    });
  });

  it("renders inventory tables and editable forms", async () => {
    render(<InventoryPage token="token" hasReadAccess hasWriteAccess />);

    expect(await screen.findByRole("heading", { name: /device and computer inventory/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /device types/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /devices/i })).toBeInTheDocument();
    expect(screen.getAllByText("Workstation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nursing Station 1").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /create device type/i })).toBeEnabled();

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/api/inventory/bootstrap", {}, "token");
    });
  });
});
