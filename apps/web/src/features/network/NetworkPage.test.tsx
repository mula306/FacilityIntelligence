import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetworkPage } from "./NetworkPage";
import { apiRequest } from "../../app/api";

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

describe("NetworkPage", () => {
  it("renders the network administration workspace", async () => {
    mockedApiRequest.mockResolvedValue({
      data: {
        summary: {
          facilities: 1,
          networkCircuits: 1,
          networkProfiles: 1,
          accessPoints: 1,
          connectivityMeasurements: 1
        },
        lists: {
          facilities: [{ id: "facility-a", name: "North Campus", code: "NC" }],
          circuits: [],
          profiles: [],
          accessPoints: [],
          measurements: []
        },
        locations: {
          buildings: [],
          floors: [],
          zones: [],
          rooms: []
        }
      }
    });

    render(<NetworkPage token="token" hasWriteAccess={false} />);

    expect(await screen.findByRole("heading", { name: /network and connectivity/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^network circuits$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^network profiles$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^access points$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^connectivity measurements$/i })).toBeInTheDocument();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
  });
});
