import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContactsPage } from "./ContactsPage";

vi.mock("../../app/api", () => ({
  apiRequest: vi.fn()
}));

const apiModule = await import("../../app/api");
const apiRequestMock = vi.mocked(apiModule.apiRequest);

describe("ContactsPage", () => {
  it("renders contacts data and respects the contacts write permission assumption", async () => {
    apiRequestMock.mockResolvedValueOnce({
      data: {
        summary: {
          contacts: 1,
          roles: 1,
          assignments: 1,
          facilities: 1,
          buildings: 1,
          floors: 1,
          zones: 1,
          rooms: 1
        },
        lists: {
          contacts: [
            {
              id: "contact-1",
              name: "Jane Carter",
              code: "JANE",
              firstName: "Jane",
              lastName: "Carter",
              title: "Nursing Supervisor",
              email: "jane@example.org",
              phone: "555-0100",
              mobilePhone: null,
              organization: "North Wing",
              notes: null,
              status: "active",
              assignmentCount: 1
            }
          ],
          roles: [
            {
              id: "role-1",
              name: "Escalation Lead",
              code: "ESC",
              description: "Primary escalation contact",
              notes: null,
              status: "active",
              assignmentCount: 1
            }
          ],
          assignments: [
            {
              id: "assignment-1",
              facilityId: "facility-1",
              buildingId: "building-1",
              floorId: "floor-1",
              zoneId: "zone-1",
              roomId: "room-1",
              contactId: "contact-1",
              contactRoleId: "role-1",
              contactName: "Jane Carter",
              contactRoleName: "Escalation Lead",
              facilityName: "Central Hospital",
              buildingName: "Main",
              floorName: "Level 1",
              zoneName: "North Zone",
              roomName: "ICU 101",
              escalationPriority: 1,
              isPrimary: true,
              status: "active"
            }
          ],
          facilities: [{ id: "facility-1", name: "Central Hospital", code: "CH" }],
          buildings: [{ id: "building-1", facilityId: "facility-1", name: "Main", code: "MAIN" }],
          floors: [{ id: "floor-1", facilityId: "facility-1", buildingId: "building-1", name: "Level 1", code: "L1", floorNumber: 1 }],
          zones: [{ id: "zone-1", facilityId: "facility-1", buildingId: "building-1", floorId: "floor-1", name: "North Zone", code: "NZ" }],
          rooms: [{ id: "room-1", facilityId: "facility-1", buildingId: "building-1", floorId: "floor-1", zoneId: "zone-1", name: "ICU 101", code: "ICU101", roomNumber: "101" }]
        }
      }
    });

    render(<ContactsPage token="token" permissions={["contacts:read"]} />);

    expect(await screen.findByText("jane@example.org")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /contacts and escalations/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create contact/i })).toBeDisabled();
  });
});
