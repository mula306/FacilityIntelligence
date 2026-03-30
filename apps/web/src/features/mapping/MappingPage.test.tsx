import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../app/api";
import { MappingPage } from "./MappingPage";

vi.mock("../../app/api", () => ({
  ApiError: class MockApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
  apiRequest: vi.fn()
}));

const mockedApiRequest = vi.mocked(apiRequest);

describe("MappingPage", () => {
  it("renders the mapping workspace with summary, plan versions, annotations, and geometry tools", async () => {
    mockedApiRequest.mockResolvedValue({
      data: {
        summary: {
          facilities: 1,
          buildings: 1,
          floors: 1,
          floorPlanVersions: 2,
          annotations: 1,
          zones: 1,
          rooms: 1
        },
        selection: {
          facilityId: "facility-a",
          buildingId: "building-a",
          floorId: "floor-a"
        },
        lists: {
          facilities: [{ id: "facility-a", name: "North Campus", code: "NC", status: "active" }],
          buildings: [{ id: "building-a", facilityId: "facility-a", name: "Main Wing", code: "MW", status: "active" }],
          floors: [
            {
              id: "floor-a",
              facilityId: "facility-a",
              buildingId: "building-a",
              name: "Level 1",
              code: "L1",
              floorNumber: 1,
              canvasWidth: 1200,
              canvasHeight: 800,
              planImageUrl: "https://example.com/floor.png",
              status: "active"
            }
          ],
          floorPlanVersions: [
            {
              id: "plan-a",
              floorId: "floor-a",
              floorName: "Level 1",
              floorCode: "L1",
              name: "As Built",
              versionLabel: "v1",
              assetUrl: "https://example.com/plan-a.png",
              canvasWidth: 1200,
              canvasHeight: 800,
              source: "upload",
              isCurrent: true,
              status: "active",
              notes: "Current source of truth.",
              createdAt: "2026-03-29T12:00:00.000Z",
              updatedAt: "2026-03-29T12:00:00.000Z",
              archivedAt: null
            },
            {
              id: "plan-b",
              floorId: "floor-a",
              floorName: "Level 1",
              floorCode: "L1",
              name: "Legacy Draft",
              versionLabel: "v0",
              assetUrl: null,
              canvasWidth: 1180,
              canvasHeight: 790,
              source: "import",
              isCurrent: false,
              status: "inactive",
              notes: null,
              createdAt: "2026-03-01T12:00:00.000Z",
              updatedAt: "2026-03-01T12:00:00.000Z",
              archivedAt: null
            }
          ],
          annotations: [
            {
              id: "annotation-a",
              floorId: "floor-a",
              floorName: "Level 1",
              floorCode: "L1",
              floorPlanVersionId: "plan-a",
              floorPlanVersionName: "As Built",
              floorPlanVersionLabel: "v1",
              zoneId: "zone-a",
              zoneName: "East Clinical Zone",
              roomId: "room-a",
              roomName: "Operating Room 12",
              roomNumber: "12",
              title: "Coverage gap in corridor",
              annotationType: "coverage-gap",
              severity: "high",
              geometry: {
                type: "polygon",
                points: [
                  { x: 120, y: 120 },
                  { x: 240, y: 120 },
                  { x: 240, y: 220 },
                  { x: 120, y: 220 }
                ]
              },
              status: "active",
              notes: "Needs follow-up.",
              createdAt: "2026-03-29T12:00:00.000Z",
              updatedAt: "2026-03-29T12:00:00.000Z",
              archivedAt: null
            }
          ],
          zones: [
            {
              id: "zone-a",
              facilityId: "facility-a",
              buildingId: "building-a",
              floorId: "floor-a",
              name: "East Clinical Zone",
              code: "ECZ",
              status: "active",
              geometry: {
                type: "polygon",
                points: [
                  { x: 50, y: 50 },
                  { x: 250, y: 50 },
                  { x: 250, y: 200 },
                  { x: 50, y: 200 }
                ]
              }
            }
          ],
          rooms: [
            {
              id: "room-a",
              facilityId: "facility-a",
              buildingId: "building-a",
              floorId: "floor-a",
              zoneId: "zone-a",
              name: "Operating Room 12",
              code: "OR12",
              roomNumber: "12",
              status: "active",
              geometry: {
                type: "polygon",
                points: [
                  { x: 300, y: 90 },
                  { x: 420, y: 90 },
                  { x: 420, y: 200 },
                  { x: 300, y: 200 }
                ]
              }
            }
          ]
        }
      }
    });

    render(<MappingPage token="token" hasWriteAccess={false} />);

    expect(await screen.findByRole("heading", { name: /mapping and spatial intelligence/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^floor canvas$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^floor plan versions$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^annotations$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^geometry workspace$/i })).toBeInTheDocument();
    expect(screen.getByText(/^Facilities$/i)).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /floor canvas preview/i })).toBeInTheDocument();
    expect((await screen.findAllByRole("img", { name: /floor canvas geometry editor/i })).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/^As Built$/i, { selector: "td" })).toBeInTheDocument();
    expect(screen.getByText(/Coverage gap in corridor/i, { selector: "td" })).toBeInTheDocument();
    expect(screen.getByText(/Use a point for a precise issue/i)).toBeInTheDocument();
    expect(mockedApiRequest).toHaveBeenCalledWith("/api/mapping/bootstrap", {}, "token");
  });
});
