import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../app/api";
import { ReadinessPage } from "./ReadinessPage";

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

describe("ReadinessPage", () => {
  it("renders the readiness workspace with summary, scores, incidents, and risk items", async () => {
    mockedApiRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/locations/bootstrap")) {
        return {
          data: {
            summary: { facilities: 1, buildings: 1, floors: 1 },
            lists: {
              facilities: [{ id: "facility-a", name: "North Campus", code: "NC" }],
              buildings: [{ id: "building-a", facilityId: "facility-a", name: "Main Wing", code: "MW" }],
              floors: [{ id: "floor-a", facilityId: "facility-a", buildingId: "building-a", name: "Level 1", code: "L1", floorNumber: 1 }]
            }
          }
        };
      }

      return {
        data: {
          summary: {
            facilities: 1,
            readinessScores: 1,
            activeIncidents: 1,
            activeRiskItems: 1,
            criticalRiskItems: 1,
            recalculations: 1
          },
          selection: { facilityId: "facility-a", buildingId: "building-a", floorId: "floor-a" },
          lists: {
            incidents: [
              {
                id: "incident-a",
                facilityId: "facility-a",
                facilityName: "North Campus",
                buildingId: "building-a",
                buildingName: "Main Wing",
                floorId: "floor-a",
                floorName: "Level 1",
                zoneId: null,
                zoneName: null,
                roomId: "room-a",
                roomName: "ICU 101",
                roomNumber: "101",
                name: "Network outage in ICU 101",
                code: "INC-1",
                status: "active",
                severity: "high",
                incidentType: "network",
                reportedAt: "2026-03-29T16:00:00.000Z",
                resolvedAt: null,
                resolutionSummary: null,
                notes: "Investigating access point health.",
                archivedAt: null,
                updatedAt: "2026-03-29T16:05:00.000Z"
              }
            ],
            riskItems: [
              {
                id: "risk-a",
                facilityId: "facility-a",
                facilityName: "North Campus",
                buildingId: "building-a",
                buildingName: "Main Wing",
                floorId: "floor-a",
                floorName: "Level 1",
                zoneId: null,
                zoneName: null,
                roomId: "room-a",
                roomName: "ICU 101",
                roomNumber: "101",
                name: "Intermittent coverage gap",
                code: "RISK-1",
                category: "Wi-Fi",
                severity: "critical",
                score: 34,
                scoreReason: "Coverage assessment and incident review indicate a persistent dead zone.",
                sourceType: "manual",
                sourceReferenceId: null,
                isSystemGenerated: false,
                status: "active",
                notes: "Manual follow-up required.",
                archivedAt: null,
                updatedAt: "2026-03-29T16:05:00.000Z"
              }
            ],
            readinessScores: [
              {
                id: "score-a",
                facilityId: "facility-a",
                facilityName: "North Campus",
                buildingId: "building-a",
                buildingName: "Main Wing",
                floorId: "floor-a",
                floorName: "Level 1",
                score: 72,
                calculationVersion: "v1",
                scoreDetails: "Coverage is stable but active incident and risk volume require attention.",
                coverageAssessmentCount: 2,
                activeIncidentCount: 1,
                activeRiskItemCount: 1,
                recalculatedAt: "2026-03-29T16:10:00.000Z",
                status: "active"
              }
            ]
          }
        }
      };
    });

    render(<ReadinessPage token="token" hasWriteAccess={false} />);

    expect(await screen.findByRole("heading", { name: /risk and readiness/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^readiness overview$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^readiness scores$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^incidents$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^manual risk items$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^operational reporting$/i })).toBeInTheDocument();
    expect(screen.getByText(/network outage in icu 101/i)).toBeInTheDocument();
    expect(screen.getByText(/intermittent coverage gap/i)).toBeInTheDocument();
    expect(screen.getByText(/recalculate readiness/i)).toBeInTheDocument();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledWith("/api/locations/bootstrap", {}, "token");
      expect(mockedApiRequest).toHaveBeenCalledWith("/api/readiness/bootstrap", {}, "token");
    });
  });
});
