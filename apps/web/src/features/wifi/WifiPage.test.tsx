import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WifiPage } from "./WifiPage";
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

describe("WifiPage", () => {
  it("renders the Wi-Fi capture workspace and loads bootstrap data", async () => {
    mockedApiRequest.mockResolvedValue({
      data: {
        summary: {
          facilities: 1,
          sessions: 0,
          samples: 0,
          accessPoints: 0
        },
        selection: {
          facilityId: null,
          buildingId: null,
          floorId: null
        },
        lists: {
          facilities: [{ id: "facility-1", name: "Central Hospital", code: "CH" }],
          buildings: [],
          floors: [],
          zones: [],
          rooms: [],
          accessPoints: [],
          sessions: [],
          samples: []
        },
        floorContext: null
      }
    });

    render(<WifiPage token="token" hasWriteAccess={false} />);

    expect(await screen.findByRole("heading", { name: /wi-fi scan capture/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /facility context/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /floor scan preview/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^scan sessions$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^scan samples$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /csv import/i })).toBeInTheDocument();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedApiRequest).toHaveBeenCalledWith("/api/wifi/bootstrap", {}, "token");
    });
  });
});
