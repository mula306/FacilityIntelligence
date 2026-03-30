import { render, screen } from "@testing-library/react";
import { describe, expect, beforeEach, it, vi } from "vitest";
import { HoursPage } from "./HoursPage";
import { apiRequest } from "../../app/api";

vi.mock("../../app/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  apiRequest: vi.fn()
}));

const requestMock = vi.mocked(apiRequest);

describe("HoursPage", () => {
  beforeEach(() => {
    requestMock.mockImplementation(async (path: string) => {
      if (path === "/api/locations/bootstrap") {
        return {
          data: {
            summary: {
              facilities: 1,
              buildings: 1,
              floors: 1,
              zones: 0,
              rooms: 0
            },
            lists: {
              facilities: [
                {
                  id: "facility-1",
                  name: "North Campus",
                  status: "active",
                  code: "NC"
                }
              ],
              buildings: [
                {
                  id: "building-1",
                  name: "Main Pavilion",
                  status: "active",
                  facilityId: "facility-1",
                  code: "MP"
                }
              ],
              floors: [
                {
                  id: "floor-1",
                  name: "Level 1",
                  status: "active",
                  facilityId: "facility-1",
                  buildingId: "building-1",
                  code: "L1",
                  floorNumber: 1
                }
              ]
            }
          }
        };
      }

      if (path === "/api/hours/bootstrap") {
        return {
          data: {
            summary: {
              serviceAreas: 1,
              hours: 1,
              overnightHours: 0
            },
            lists: {
              serviceAreas: [
                {
                  id: "service-area-1",
                  facilityId: "facility-1",
                  buildingId: "building-1",
                  floorId: "floor-1",
                  name: "Registration",
                  code: "REG",
                  notes: "Front desk coverage",
                  status: "active",
                  createdAt: "2026-03-29T00:00:00.000Z",
                  updatedAt: "2026-03-29T00:00:00.000Z",
                  archivedAt: null
                }
              ],
              hours: [
                {
                  id: "hours-1",
                  facilityId: "facility-1",
                  serviceAreaId: "service-area-1",
                  dayOfWeek: 1,
                  opensAt: "08:00",
                  closesAt: "17:00",
                  overnight: false,
                  effectiveFrom: null,
                  effectiveTo: null,
                  status: "active",
                  createdAt: "2026-03-29T00:00:00.000Z",
                  updatedAt: "2026-03-29T00:00:00.000Z",
                  archivedAt: null
                }
              ]
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${path}`);
    });
  });

  it("renders the hours workspace and create actions", async () => {
    render(<HoursPage token="token-1" hasWriteAccess={true} />);

    expect(await screen.findByRole("heading", { name: /hours and service areas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create service area/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create hours window/i })).toBeInTheDocument();
  });
});
